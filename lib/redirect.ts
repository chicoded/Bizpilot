/** Allow only same-origin relative paths after auth (blocks open redirects). */
export function getSafeRedirectUrl(
  value: string | undefined | null,
  fallback: string
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
