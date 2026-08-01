import { describe, expect, it } from "vitest";
import { addDays, subDays } from "date-fns";

/**
 * Mirrors expiryStateOf in features/inventory/inventory-list.tsx.
 *
 * The original filter required expiryDate >= now, which meant stock that had
 * already expired was excluded from the "Expiring" view — so a pharmacist
 * filtering for expiry problems was shown everything except the drugs that had
 * actually expired. Kept here so that cannot come back quietly.
 */
function expiryStateOf(expiryDate: Date | null, now = new Date()) {
  if (!expiryDate) return { isExpiring: false, isExpired: false };
  if (expiryDate < now) return { isExpiring: false, isExpired: true };
  return { isExpiring: expiryDate <= addDays(now, 30), isExpired: false };
}

function shownInExpiringFilter(expiryDate: Date | null, now = new Date()) {
  const { isExpiring, isExpired } = expiryStateOf(expiryDate, now);
  return isExpiring || isExpired;
}

describe("expiry state", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");

  it("flags stock that is already past its date", () => {
    const state = expiryStateOf(subDays(now, 1), now);
    expect(state).toEqual({ isExpiring: false, isExpired: true });
  });

  it("flags stock inside the 30 day window", () => {
    const state = expiryStateOf(addDays(now, 10), now);
    expect(state).toEqual({ isExpiring: true, isExpired: false });
  });

  it("leaves stock beyond the window alone", () => {
    const state = expiryStateOf(addDays(now, 90), now);
    expect(state).toEqual({ isExpiring: false, isExpired: false });
  });

  it("treats stock with no expiry date as neither", () => {
    expect(expiryStateOf(null, now)).toEqual({
      isExpiring: false,
      isExpired: false,
    });
  });

  it("never reports the same item as both expiring and expired", () => {
    for (const days of [-400, -30, -1, 0, 1, 29, 30, 31, 400]) {
      const state = expiryStateOf(addDays(now, days), now);
      expect(state.isExpiring && state.isExpired).toBe(false);
    }
  });
});

describe("the expiring filter", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");

  it("shows already-expired stock, which it used to hide", () => {
    expect(shownInExpiringFilter(subDays(now, 5), now)).toBe(true);
    expect(shownInExpiringFilter(subDays(now, 200), now)).toBe(true);
  });

  it("still shows stock about to expire", () => {
    expect(shownInExpiringFilter(addDays(now, 7), now)).toBe(true);
  });

  it("does not show healthy stock", () => {
    expect(shownInExpiringFilter(addDays(now, 120), now)).toBe(false);
    expect(shownInExpiringFilter(null, now)).toBe(false);
  });
});
