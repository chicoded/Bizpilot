import {
  getBackupConfig,
  isBackupDue,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";
import {
  downloadBackupFile,
  exportBackupJson,
  saveBackupSnapshot,
} from "@/lib/backup/export";
import { deliverBackupToGmail } from "@/lib/backup/gmail";
import { deliverBackupToDrive } from "@/lib/backup/drive";
import { getLocalBusinessMeta } from "@/lib/local-data/business";

function hasLiveGoogleSession() {
  const config = getBackupConfig();
  if (!config.gmailAccessToken || !config.gmailEmail) return false;
  if (config.gmailTokenExpiry && Date.now() > config.gmailTokenExpiry - 60_000) {
    return false;
  }
  return true;
}

export async function runScheduledBackup(
  businessId: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; message: string }> {
  const config = getBackupConfig();
  if (!options?.force && !isBackupDue(config)) {
    return { ok: true, message: "Backup not due yet." };
  }

  const toGmail = config.backupToGmail !== false;
  const toDrive = config.backupToDrive === true;

  if (!toGmail && !toDrive && !options?.force) {
    return {
      ok: false,
      message: "Turn on Gmail and/or Drive backup in Settings → Backup & storage.",
    };
  }

  try {
    const json = await exportBackupJson(businessId);
    await saveBackupSnapshot(businessId);
    const business = await getLocalBusinessMeta();
    const businessName = business?.name ?? "My shop";
    const googleReady = hasLiveGoogleSession();

    // No Google Connect → always keep a device copy + one download.
    // Automatic Gmail/Drive needs Connect Google (OAuth).
    if (!googleReady) {
      downloadBackupFile(json, businessName);
      const targets = [
        toGmail ? "Gmail" : null,
        toDrive ? "Drive" : null,
      ].filter(Boolean);
      const targetText =
        targets.length > 0 ? targets.join(" + ") : "Gmail/Drive";

      const message = `Backup saved on this device and downloaded. Tap Connect Google to send to ${targetText} automatically. Team catalog/sales still use Sync on the Sales page (cloud database).`;

      saveBackupConfig({
        lastBackupAt: new Date().toISOString(),
        lastBackupStatus: "success",
        lastBackupMessage: message,
      });

      return { ok: true, message };
    }

    const messages: string[] = [];
    let anyOk = false;

    if (toGmail || (!toGmail && !toDrive && options?.force)) {
      const gmailResult = await deliverBackupToGmail(json, businessName);
      messages.push(gmailResult.message);
      anyOk = anyOk || gmailResult.ok;
    }

    if (toDrive) {
      const driveResult = await deliverBackupToDrive(json, businessName);
      messages.push(driveResult.message);
      anyOk = anyOk || driveResult.ok;
    }

    const message =
      messages.join(" · ") || "Backup saved on this device.";

    saveBackupConfig({
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: anyOk ? "success" : "error",
      lastBackupMessage: message,
    });

    return { ok: anyOk, message };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backup failed unexpectedly";
    saveBackupConfig({
      lastBackupStatus: "error",
      lastBackupMessage: message,
    });
    return { ok: false, message };
  }
}
