import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Voice answers for the customer survey.
 *
 * Speaking instead of typing is not a nice-to-have here. A shop owner who
 * thinks in Hausa, Yoruba, Igbo or Pidgin will say far more in ninety seconds
 * of speech than in a typed English paragraph, and voice notes are already how
 * most of them communicate. The typed answers will be shorter and more polite;
 * the recordings are where the real frustration lives.
 *
 * Accepting an uploaded file matters as much as recording in the browser —
 * plenty of people would rather record on WhatsApp the way they always do and
 * attach it.
 */

const BUCKET = "survey-audio";
const MAX_BYTES = 15 * 1024 * 1024;

/** Formats browsers actually produce, plus what WhatsApp exports. */
const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "video/webm", // MediaRecorder labels some webm audio this way
]);

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function isSurveyAudioEnabled(): boolean {
  if (!isSupabaseConfigured()) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return Boolean(key && !key.includes("[") && key.length > 20);
}

export function validateSurveyAudio(file: File): string | null {
  // Some browsers append codec info, e.g. audio/webm;codecs=opus.
  const type = file.type.split(";")[0].trim().toLowerCase();
  if (type && !ALLOWED_TYPES.has(type)) {
    return "That file type is not supported. A voice note from WhatsApp works.";
  }
  if (file.size > MAX_BYTES) {
    return "Recording must be 15 MB or smaller — about ten minutes.";
  }
  if (file.size === 0) {
    return "That recording came through empty. Please try again.";
  }
  return null;
}

function extensionFor(file: File): string {
  const type = file.type.split(";")[0].trim().toLowerCase();
  if (EXTENSIONS[type]) return EXTENSIONS[type];
  const fromName = file.name.split(".").pop()?.toLowerCase();
  return fromName && fromName.length <= 4 ? fromName : "webm";
}

/**
 * Stores one voice answer and returns a path, not a public URL.
 *
 * These are customers describing their business troubles, sometimes naming
 * staff. The bucket should stay private and be read through a signed URL from
 * the admin side, so a guessed path leaks nothing.
 */
export async function uploadSurveyAudio(params: {
  businessId: string;
  responseId: string;
  questionId: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  if (!isSurveyAudioEnabled()) {
    return { error: "Voice answers are not set up on this deployment yet." };
  }

  const invalid = validateSurveyAudio(params.file);
  if (invalid) return { error: invalid };

  const path = `${params.businessId}/${params.responseId}/${params.questionId}.${extensionFor(params.file)}`;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, params.file, {
        contentType: params.file.type || "audio/webm",
        upsert: true,
      });

    if (error) {
      console.error("[survey audio] upload failed:", error.message);
      return {
        error:
          "Could not save that recording. Your written answers were still sent.",
      };
    }

    return { path };
  } catch (error) {
    console.error("[survey audio] upload threw:", error);
    return {
      error: "Could not save that recording. Your written answers were still sent.",
    };
  }
}

/** Time-limited link for listening to an answer from the admin side. */
export async function getSurveyAudioUrl(
  path: string,
  expiresInSeconds = 60 * 60
): Promise<string | null> {
  if (!isSurveyAudioEnabled()) return null;
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export const SURVEY_AUDIO_BUCKET = BUCKET;
