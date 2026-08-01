/**
 * Prefix that tags a support ticket as a review rather than a problem.
 *
 * Kept in its own module so both the form that writes it and the inbox that
 * filters on it use the same string — a marker that drifts is a marker that
 * silently stops matching.
 */
export const REVIEW_MARKER = "[REVIEW]";

export function isReviewTicket(summary: string | null | undefined): boolean {
  return Boolean(summary?.startsWith(REVIEW_MARKER));
}

/** The owner's words, without the marker, for reading in the inbox. */
export function reviewSummary(summary: string): string {
  return summary.startsWith(REVIEW_MARKER)
    ? summary.slice(REVIEW_MARKER.length).trim()
    : summary;
}
