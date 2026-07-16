import {
  getBackupConfig,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";
import { shareBackupFile } from "@/lib/backup/export";

function getGoogleAccessToken(): string | null {
  const config = getBackupConfig();
  if (!config.gmailAccessToken) return null;
  if (config.gmailTokenExpiry && Date.now() > config.gmailTokenExpiry - 60_000) {
    return null;
  }
  return config.gmailAccessToken;
}

function backupFilename(businessName: string) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = businessName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  return `zaplex-backup-${safeName || "shop"}-${date}.json`;
}

async function findOrCreateBackupFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    "(name = 'Zaplex Backups' or name = 'BizPilot Backups') and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (listRes.ok) {
    const data = (await listRes.json()) as { files?: { id: string }[] };
    if (data.files?.[0]?.id) return data.files[0].id;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Zaplex Backups",
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Could not create Drive folder (${createRes.status})`);
  }

  const folder = (await createRes.json()) as { id: string };
  return folder.id;
}

export async function uploadBackupToDrive(
  json: string,
  businessName: string
): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
  const accessToken = getGoogleAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      error: "Google not connected",
    };
  }

  try {
    const folderId = await findOrCreateBackupFolder(accessToken);
    const filename = backupFilename(businessName);
    const metadata = {
      name: filename,
      mimeType: "application/json",
      parents: [folderId],
    };

    const boundary = `bizpilot_drive_${Date.now()}`;
    const body =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      `${json}\r\n` +
      `--${boundary}--`;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error:
            "Google Drive permission missing. Tap Connect Google again and allow Drive.",
        };
      }
      return {
        ok: false,
        error: `Drive upload failed (${response.status}). ${detail.slice(0, 120)}`,
      };
    }

    const file = (await response.json()) as { id: string };
    saveBackupConfig({
      lastBackupAt: new Date().toISOString(),
    });
    return { ok: true, fileId: file.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Drive upload failed",
    };
  }
}

/** Opens the system share sheet so the user can pick Google Drive. */
export async function shareBackupToDrive(
  json: string,
  businessName: string
): Promise<{ ok: true; method: "share" | "download" } | { ok: false; error: string }> {
  try {
    const result = await shareBackupFile(
      json,
      businessName,
      "Save this Zaplex backup to Google Drive"
    );
    return { ok: true, method: result.method };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Share cancelled." };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not share to Drive",
    };
  }
}

export async function deliverBackupToDrive(
  json: string,
  businessName: string
): Promise<{ ok: boolean; message: string }> {
  const accessToken = getGoogleAccessToken();

  if (accessToken) {
    const uploaded = await uploadBackupToDrive(json, businessName);
    if (uploaded.ok) {
      return {
        ok: true,
        message: "Backup saved to Google Drive → Zaplex Backups folder",
      };
    }
    // Token present but API rejected — still try share/download.
    const shared = await shareBackupToDrive(json, businessName);
    if (shared.ok) {
      return {
        ok: true,
        message:
          shared.method === "share"
            ? "Choose Google Drive in the share menu to save the backup"
            : `${uploaded.error} Backup file downloaded instead — upload it to Drive.`,
      };
    }
    return {
      ok: false,
      message: uploaded.error || shared.error,
    };
  }

  // No Google Connect — share on mobile, download on desktop.
  const shared = await shareBackupToDrive(json, businessName);
  if (shared.ok) {
    return {
      ok: true,
      message:
        shared.method === "share"
          ? "Choose Google Drive in the share menu to save the backup"
          : "Backup downloaded. For automatic Drive upload, tap Connect Google first.",
    };
  }

  return {
    ok: false,
    message:
      shared.error ||
      "Could not save to Drive. Tap Connect Google, or use Download backup.",
  };
}
