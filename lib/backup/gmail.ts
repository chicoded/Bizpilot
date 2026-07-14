import {
  getBackupConfig,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";
import { shareBackupFile } from "@/lib/backup/export";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const USERINFO_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
const GOOGLE_SCOPES = `${GMAIL_SCOPE} ${DRIVE_SCOPE} ${USERINFO_SCOPE}`;

function getGoogleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null;
}

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMimeEmail({
  to,
  subject,
  body,
  attachmentName,
  attachmentContent,
}: {
  to: string;
  subject: string;
  body: string;
  attachmentName: string;
  attachmentContent: string;
}) {
  const boundary = `bizpilot_${Date.now()}`;
  const attachmentBase64 = btoa(
    unescape(encodeURIComponent(attachmentContent))
  );

  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
    "",
    `--${boundary}`,
    `Content-Type: application/json; name="${attachmentName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    "",
    attachmentBase64,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

export function isGmailBackupConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

export function saveGmailAddress(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    saveBackupConfig({ gmailEmail: null });
    return { ok: false as const, error: "Enter a Gmail address" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false as const, error: "Enter a valid email address" };
  }
  saveBackupConfig({ gmailEmail: trimmed });
  return { ok: true as const, email: trimmed };
}

export function startGmailOAuth(): { ok: true } | { ok: false; error: string } {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return {
      ok: false,
      error:
        "Automatic Gmail/Drive save needs Google sign-in setup. Use Send to Gmail or Save to Drive below — they open your phone share menu.",
    };
  }

  const redirectUri = `${window.location.origin}/settings/backup`;
  const state = crypto.randomUUID();
  sessionStorage.setItem("bizpilot_gmail_oauth_state", state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: "true",
    state,
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  if (isMobileDevice()) {
    window.location.href = authUrl;
    return { ok: true };
  }

  const popup = window.open(authUrl, "bizpilot-gmail", "width=520,height=720");
  if (!popup) {
    window.location.href = authUrl;
  }

  return { ok: true };
}

export async function connectGmailAccount(): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  const started = startGmailOAuth();
  if (!started.ok) {
    return started;
  }

  if (isMobileDevice()) {
    return { ok: false, error: "Continue in Google sign-in, then return here." };
  }

  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      const config = getBackupConfig();
      if (config.gmailAccessToken && config.gmailEmail) {
        window.clearInterval(timer);
        resolve({ ok: true, email: config.gmailEmail });
      }
    }, 500);

    window.setTimeout(() => {
      window.clearInterval(timer);
      const config = getBackupConfig();
      if (config.gmailAccessToken && config.gmailEmail) {
        resolve({ ok: true, email: config.gmailEmail });
        return;
      }
      resolve({ ok: false, error: "Gmail connection was cancelled." });
    }, 120_000);
  });
}

export function handleGmailOAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.location.hash.includes("access_token")) return false;

  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get("access_token");
  const expiresIn = Number(hash.get("expires_in") ?? "3600");
  const state = hash.get("state");
  const expected = sessionStorage.getItem("bizpilot_gmail_oauth_state");

  if (!accessToken || !state || state !== expected) {
    return false;
  }

  sessionStorage.removeItem("bizpilot_gmail_oauth_state");

  void fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then((res) => res.json())
    .then((profile: { email?: string }) => {
      saveBackupConfig({
        gmailAccessToken: accessToken,
        gmailTokenExpiry: Date.now() + expiresIn * 1000,
        gmailEmail: profile.email ?? getBackupConfig().gmailEmail,
      });
      window.history.replaceState({}, "", "/settings/backup?gmail=connected");
      if (window.opener) {
        window.opener.postMessage({ type: "bizpilot:gmail-connected" }, "*");
        window.close();
      }
    });

  return true;
}

export async function sendBackupToGmail(
  json: string,
  businessName: string
): Promise<{ ok: true; method: "api" } | { ok: false; error: string }> {
  const config = getBackupConfig();

  if (!config.gmailAccessToken || !config.gmailEmail) {
    return {
      ok: false,
      error: "Connect Gmail for automatic email, or use Send to Gmail.",
    };
  }

  if (config.gmailTokenExpiry && Date.now() > config.gmailTokenExpiry - 60_000) {
    return {
      ok: false,
      error: "Gmail session expired. Reconnect your Gmail account.",
    };
  }

  const date = new Date().toISOString().slice(0, 10);
  const attachmentName = `zaplex-backup-${date}.json`;
  const mime = buildMimeEmail({
    to: config.gmailEmail,
    subject: `Zaplex backup — ${businessName} (${date})`,
    body:
      "Attached is your Zaplex shop backup. Keep this file safe — you can restore your inventory, sales, and expenses from it.",
    attachmentName,
    attachmentContent: json,
  });

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.gmailAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: base64UrlEncode(mime),
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return {
      ok: false,
      error: `Gmail send failed (${response.status}). ${detail.slice(0, 120)}`,
    };
  }

  return { ok: true, method: "api" };
}

export async function shareBackupToGmail(
  json: string,
  businessName: string,
  gmailEmail?: string | null
): Promise<{ ok: true; method: "share" | "download" } | { ok: false; error: string }> {
  try {
    const result = await shareBackupFile(
      json,
      businessName,
      gmailEmail
        ? `Send this Zaplex backup to ${gmailEmail}`
        : "Zaplex shop backup — send to your Gmail"
    );
    return { ok: true, method: result.method };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Share cancelled." };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not share backup",
    };
  }
}

/** Sends via Gmail API when connected; otherwise opens share sheet for Gmail app. */
export async function deliverBackupToGmail(
  json: string,
  businessName: string
): Promise<{ ok: boolean; message: string }> {
  const config = getBackupConfig();

  if (config.gmailAccessToken && config.gmailEmail) {
    const emailed = await sendBackupToGmail(json, businessName);
    if (emailed.ok) {
      return {
        ok: true,
        message: `Backup emailed to ${config.gmailEmail}`,
      };
    }
  }

  const shared = await shareBackupToGmail(json, businessName, config.gmailEmail);
  if (shared.ok) {
    return {
      ok: true,
      message:
        shared.method === "share"
          ? config.gmailEmail
            ? `Choose Gmail and send to ${config.gmailEmail}`
            : "Choose Gmail from the share menu"
          : "Backup downloaded — attach it in Gmail manually",
    };
  }

  return { ok: false, message: shared.error };
}

export function disconnectGmailAccount() {
  saveBackupConfig({
    gmailAccessToken: null,
    gmailTokenExpiry: null,
  });
}
