import {
  getBackupConfig,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getGoogleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null;
}

function base64UrlEncode(value: string): string {
  return btoa(value)
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
    btoa(unescape(encodeURIComponent(attachmentContent))),
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

export function isGmailBackupConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

export async function connectGmailAccount(): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return {
      ok: false,
      error:
        "Google sign-in is not configured yet. Use Download backup or Share to Gmail for now.",
    };
  }

  return new Promise((resolve) => {
    const redirectUri = `${window.location.origin}/settings/backup`;
    const state = crypto.randomUUID();
    sessionStorage.setItem("bizpilot_gmail_oauth_state", state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: `${GMAIL_SCOPE} https://www.googleapis.com/auth/userinfo.email`,
      include_granted_scopes: "true",
      state,
      prompt: "consent",
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "bizpilot-gmail",
      "width=520,height=720"
    );

    if (!popup) {
      resolve({ ok: false, error: "Popup blocked. Allow popups and try again." });
      return;
    }

    const timer = window.setInterval(async () => {
      if (popup.closed) {
        window.clearInterval(timer);
        const config = getBackupConfig();
        if (config.gmailAccessToken && config.gmailEmail) {
          resolve({ ok: true, email: config.gmailEmail });
        } else {
          resolve({ ok: false, error: "Gmail connection was cancelled." });
        }
      }
    }, 500);
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
        gmailEmail: profile.email ?? null,
      });
      window.history.replaceState({}, "", "/settings/backup");
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
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getBackupConfig();

  if (!config.gmailAccessToken || !config.gmailEmail) {
    return {
      ok: false,
      error: "Connect your Gmail account in Backup settings first.",
    };
  }

  if (config.gmailTokenExpiry && Date.now() > config.gmailTokenExpiry - 60_000) {
    return {
      ok: false,
      error: "Gmail session expired. Reconnect your Gmail account.",
    };
  }

  const date = new Date().toISOString().slice(0, 10);
  const attachmentName = `bizpilot-backup-${date}.json`;
  const mime = buildMimeEmail({
    to: config.gmailEmail,
    subject: `BizPilot backup — ${businessName} (${date})`,
    body:
      "Attached is your BizPilot shop backup. Keep this file safe — you can restore your inventory, sales, and expenses from it.",
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
      error: `Gmail backup failed (${response.status}). ${detail.slice(0, 120)}`,
    };
  }

  return { ok: true };
}

export function disconnectGmailAccount() {
  saveBackupConfig({
    gmailEmail: null,
    gmailAccessToken: null,
    gmailTokenExpiry: null,
  });
}
