/** Peak / rush-hour helpers for restaurant POS. */

const PEAK_STORAGE_KEY = "zaplex-peak-mode";

/** Default Nigerian street-food peaks: morning + evening. */
export function isAutoPeakHour(now = new Date()): boolean {
  const hour = now.getHours();
  return (hour >= 7 && hour < 10) || (hour >= 17 && hour < 21);
}

export function readPeakModePreference(): "auto" | "on" | "off" {
  if (typeof window === "undefined") return "auto";
  const raw = window.localStorage.getItem(PEAK_STORAGE_KEY);
  if (raw === "on" || raw === "off" || raw === "auto") return raw;
  return "auto";
}

export function writePeakModePreference(value: "auto" | "on" | "off") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PEAK_STORAGE_KEY, value);
}

export function resolvePeakMode(
  preference: "auto" | "on" | "off",
  now = new Date()
): boolean {
  if (preference === "on") return true;
  if (preference === "off") return false;
  return isAutoPeakHour(now);
}
