"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getBusinessContext } from "@/lib/auth";
import { SURVEY_QUESTIONS } from "@/lib/survey/questions";
import { uploadSurveyAudio, isSurveyAudioEnabled } from "@/lib/survey/audio";
// A "use server" module may only export async functions, so the marker and the
// result type live in lib/survey/result.ts rather than here.
import { SURVEY_MARKER, type SurveyResult } from "@/lib/survey/result";

const MAX_ANSWER_CHARS = 4000;
const MAX_FIELD_CHARS = 200;

/**
 * Stores one survey response.
 *
 * Deliberately open to people with no account. The most useful answers come
 * from shop owners who tried Zaplex and left, or looked at it and never signed
 * up, and neither group can log in. Requiring sign-in would have surveyed only
 * the people already happy enough to stay.
 *
 * Because it is public it takes a honeypot rather than a captcha — a bot fills
 * every field it finds, and a person never sees the hidden one. Cheaper than a
 * challenge, and it does not punish someone on a bad connection.
 *
 * Responses land in the support inbox tagged [SURVEY]. No new table: the value
 * is entirely in a person reading them a handful at a time.
 */
export async function submitSurvey(formData: FormData): Promise<SurveyResult> {
  try {
    // Hidden field. Anything in it came from something automated.
    if (String(formData.get("website") ?? "").trim()) {
      // Answer as though it worked, so a bot learns nothing from the response.
      return { success: true, answered: 0, warnings: [] };
    }

    const field = (name: string) =>
      String(formData.get(name) ?? "")
        .trim()
        .slice(0, MAX_FIELD_CHARS);

    const name = field("name");
    const shop = field("shop");
    const contact = field("contact");

    // Identity is optional, and attached only if they are already signed in.
    const { userId } = await auth().catch(() => ({ userId: null }));
    const clerkUser = userId ? await currentUser().catch(() => null) : null;
    const ctx = userId ? await getBusinessContext().catch(() => null) : null;

    const responseId = `r${Date.now().toString(36)}`;
    const scope = ctx?.businessId ?? "anonymous";

    const lines: string[] = [];
    const uploadWarnings: string[] = [];
    let answered = 0;

    for (const question of SURVEY_QUESTIONS) {
      const text = String(formData.get(`text_${question.id}`) ?? "")
        .trim()
        .slice(0, MAX_ANSWER_CHARS);
      const audio = formData.get(`audio_${question.id}`);
      const hasAudio = audio instanceof File && audio.size > 0;

      if (!text && !hasAudio) continue;
      answered += 1;

      lines.push(`## ${question.prompt}`);
      if (text) lines.push(text);

      if (hasAudio) {
        if (!isSurveyAudioEnabled()) {
          uploadWarnings.push(
            `${question.id}: voice answer could not be saved (storage not configured)`
          );
        } else {
          const result = await uploadSurveyAudio({
            scope,
            responseId,
            questionId: question.id,
            file: audio,
          });
          if ("path" in result) {
            lines.push(`[voice answer] ${result.path}`);
          } else {
            uploadWarnings.push(`${question.id}: ${result.error}`);
          }
        }
      }

      lines.push("");
    }

    if (answered === 0) {
      return { success: false, error: "Answer at least one question before sending." };
    }

    const who = [
      name ? `Name: ${name}` : null,
      shop ? `Shop: ${shop}` : null,
      contact ? `Contact: ${contact}` : null,
      ctx ? `Signed in as: ${ctx.business.name}` : "Not signed in",
    ].filter(Boolean);

    if (uploadWarnings.length > 0) {
      lines.push("---", "Upload problems:", ...uploadWarnings);
    }

    const label = shop || name || (ctx ? ctx.business.name : "Anonymous");

    await prisma.supportTicket.create({
      data: {
        summary: `${SURVEY_MARKER} ${label} — ${answered} of ${SURVEY_QUESTIONS.length} answered`,
        details: [...who, "", ...lines].join("\n"),
        email:
          clerkUser?.emailAddresses[0]?.emailAddress?.trim().toLowerCase() ??
          (contact.includes("@") ? contact.toLowerCase() : null),
        userId: userId ?? null,
        businessId: ctx?.businessId ?? null,
      },
      select: { id: true },
    });

    return {
      success: true,
      answered,
      // Surfaced so someone who recorded an answer is told it did not save,
      // rather than assuming it did.
      warnings: uploadWarnings,
    };
  } catch (error) {
    console.error("[submitSurvey]", error);
    return {
      success: false,
      error: "Could not send your answers just now. Please try again shortly.",
    };
  }
}
