import {
  getBackupConfig,
  isBackupDue,
  saveBackupConfig,
} from "@/lib/local-db/backup-config";
import { exportBackupJson, saveBackupSnapshot } from "@/lib/backup/export";
import { deliverBackupToGmail } from "@/lib/backup/gmail";
import { getLocalBusinessMeta } from "@/lib/local-data/business";

export async function runScheduledBackup(
  businessId: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; message: string }> {
  const config = getBackupConfig();
  if (!options?.force && !isBackupDue(config)) {
    return { ok: true, message: "Backup not due yet." };
  }

  if (!config.gmailEmail && !options?.force) {
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

    const result = await deliverBackupToGmail(json, businessName);

    saveBackupConfig({
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: result.ok ? "success" : "error",
      lastBackupMessage: result.message,
    });

    return result;
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
