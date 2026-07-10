import {
  getBackupConfig,
  isBackupDue,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";
import { exportBackupJson, saveBackupSnapshot, shareBackupFile } from "@/lib/backup/export";
import { sendBackupToGmail } from "@/lib/backup/gmail";
import { getLocalBusinessMeta } from "@/lib/local-data/business";

export async function runScheduledBackup(
  businessId: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; message: string }> {
  const config = getBackupConfig();
  if (!options?.force && !isBackupDue(config)) {
    return { ok: true, message: "Backup not due yet." };
  }

  try {
    const json = await exportBackupJson(businessId);
    await saveBackupSnapshot(businessId);
    const business = await getLocalBusinessMeta();
    const businessName = business?.name ?? "My shop";

    if (config.gmailAccessToken && config.gmailEmail) {
      const emailed = await sendBackupToGmail(json, businessName);
      if (emailed.ok) {
        saveBackupConfig({
          lastBackupAt: new Date().toISOString(),
          lastBackupStatus: "success",
          lastBackupMessage: `Emailed to ${config.gmailEmail}`,
        });
        return { ok: true, message: `Backup emailed to ${config.gmailEmail}` };
      }

      const shared = await shareBackupFile(json, businessName);
      saveBackupConfig({
        lastBackupAt: new Date().toISOString(),
        lastBackupStatus: "error",
        lastBackupMessage: emailed.error,
      });
      return {
        ok: false,
        message: `${emailed.error} Used ${shared.method} fallback instead.`,
      };
    }

    const shared = await shareBackupFile(json, businessName);
    saveBackupConfig({
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: "success",
      lastBackupMessage:
        shared.method === "share"
          ? "Opened share sheet for Gmail or Drive"
          : "Downloaded backup file",
    });

    return {
      ok: true,
      message:
        shared.method === "share"
          ? "Backup ready — choose Gmail from the share menu"
          : "Backup downloaded to your device",
    };
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
