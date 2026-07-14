import {
  getBackupConfig,
  isBackupDue,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";
import { exportBackupJson, saveBackupSnapshot } from "@/lib/backup/export";
import { deliverBackupToGmail } from "@/lib/backup/gmail";
import { deliverBackupToDrive } from "@/lib/backup/drive";
import { getLocalBusinessMeta } from "@/lib/local-data/business";

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

  if (toGmail && !config.gmailEmail && !options?.force) {
    return {
      ok: false,
      message: "Add your Gmail address in Settings → Backup & storage first.",
    };
  }

  try {
    const json = await exportBackupJson(businessId);
    await saveBackupSnapshot(businessId);
    const business = await getLocalBusinessMeta();
    const businessName = business?.name ?? "My shop";

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

    const message = messages.join(" · ");

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
