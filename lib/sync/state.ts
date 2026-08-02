/**
 * Cheap change detection in front of the expensive pulls.
 *
 * Every poll used to re-download the whole catalogue and the last fifty sales
 * regardless of whether anything had moved. This asks a sixty-byte question
 * first and only pays for the full pull when the answer differs from last time.
 *
 * Fail-safe by construction: any error, any unreadable response, anything at
 * all unexpected reports "changed", so a broken check costs bandwidth rather
 * than correctness. Stale stock on a till is much worse than a wasted request.
 */

export type SyncState = {
  products: string | null;
  productCount: number;
  sales: string | null;
  saleCount: number;
};

/** Last state seen per business, for this tab. */
const lastSeen = new Map<string, SyncState>();

function sameState(a: SyncState, b: SyncState): boolean {
  return (
    a.products === b.products &&
    a.productCount === b.productCount &&
    a.sales === b.sales &&
    a.saleCount === b.saleCount
  );
}

export type ChangeCheck = {
  /** False only when we are confident nothing moved. */
  changed: boolean;
  /** Call once the pull succeeded, so the next poll can compare against it. */
  commit: () => void;
};

export async function checkForChanges(businessId: string): Promise<ChangeCheck> {
  const assumeChanged: ChangeCheck = { changed: true, commit: () => {} };

  try {
    const response = await fetch("/api/sync/state", { cache: "no-store" });
    if (!response.ok) return assumeChanged;

    const data = (await response.json()) as Partial<SyncState> | null;
    if (
      !data ||
      typeof data.productCount !== "number" ||
      typeof data.saleCount !== "number"
    ) {
      return assumeChanged;
    }

    const next: SyncState = {
      products: data.products ?? null,
      productCount: data.productCount,
      sales: data.sales ?? null,
      saleCount: data.saleCount,
    };

    const previous = lastSeen.get(businessId);
    // First poll of the session always pulls: this tab has no idea what its
    // local copy is missing.
    if (!previous) {
      return { changed: true, commit: () => lastSeen.set(businessId, next) };
    }

    if (sameState(previous, next)) {
      return { changed: false, commit: () => {} };
    }

    return { changed: true, commit: () => lastSeen.set(businessId, next) };
  } catch {
    return assumeChanged;
  }
}

/** Forces the next check to report changed — used after a local write. */
export function invalidateSyncState(businessId: string) {
  lastSeen.delete(businessId);
}
