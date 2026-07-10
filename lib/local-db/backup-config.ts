import type { BackupConfig, BackupFrequencyUnit } from "@/lib/local-db/types";

const STORAGE_KEY = "bizpilot_backup_config";

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  frequencyUnit: "weeks",
  frequencyInterval: 1,
  gmailEmail: null,
  gmailAccessToken: null,
  gmailTokenExpiry: null,
  lastBackupAt: null,
  lastBackupStatus: null,
  lastBackupMessage: null,
};

export function getBackupConfig(): BackupConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveBackupConfig(patch: Partial<BackupConfig>): BackupConfig {
  const next = { ...getBackupConfig(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function isBackupDue(config: BackupConfig, now = new Date()): boolean {
  if (!config.enabled) return false;
  if (!config.lastBackupAt) return true;

  const last = new Date(config.lastBackupAt);
  const dueAt = new Date(last);

  switch (config.frequencyUnit) {
    case "days":
      dueAt.setDate(dueAt.getDate() + config.frequencyInterval);
      break;
    case "weeks":
      dueAt.setDate(dueAt.getDate() + config.frequencyInterval * 7);
      break;
    case "months":
      dueAt.setMonth(dueAt.getMonth() + config.frequencyInterval);
      break;
  }

  return now >= dueAt;
}

export function formatBackupFrequency(
  unit: BackupFrequencyUnit,
  interval: number
): string {
  const label = interval === 1 ? unit.slice(0, -1) : unit;
  return `Every ${interval} ${label}`;
}
