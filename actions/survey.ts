"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getBusinessContext, syncClerkUser } from "@/lib/auth";
import { SURVEY_QUESTIONS } from "@/lib/survey/questions";
import { uploadSurveyAudio, isSurveyAudioEnabled } from "@/lib/survey/audio";
// A "use server" module may only export async functions, so the marker and the
// result type live in lib/survey/result.ts rather than here.
import { SURVEY_MARKER, type SurveyResult } from "@/lib/survey/result";

const MAX_ANSWER_CHARS = 4000;

/**
 * Stores one survey response.
 *
 * Written into the support inbox rather than a new table: responses are read by
 * a person, a handful at a time, and the value is entirely in reading them
 * rather than in querying them. If volume ever justifies its own table, the
 * marker makes them easy to migrate out.
 *
 * Audio is uploaded per question and referenced by storage path. A failed
 * upload never fails the submission — losing a recording is bad, losing the
 * whole response because of it is worse.
 */
export async function submitSurvey(formData: FormData): Promise<SurveyResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Please sign in first so we know which shop this is." };
    }

    const clerkUser = await currentUser();
    if (clerkUser) {
      await syncClerkUser({
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      }).catch(() => null);
    }

    const ctx = await getBusinessContext().catch(() => null);
    if (!ctx) {
      return { success: false, error: "Could not find your shop. Try again after signing in." };
    }

    const responseId = `r${Date.now().toString(36)}`;
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
            businessId: ctx.businessId,
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

    if (uploadWarnings.length > 0) {
      lines.push("---", "Upload problems:", ...uploadWarnings);
    }

    await prisma.supportTicket.create({
      data: {
        summary: `${SURVEY_MARKER} ${ctx.business.name} — ${answered} of ${SURVEY_QUESTIONS.length} answered`,
        details: lines.join("\n"),
        email:
          clerkUser?.emailAddresses[0]?.emailAddress?.trim().toLowerCase() ??
          null,
        userId,
        businessId: ctx.businessId,
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
