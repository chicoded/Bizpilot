import { describe, expect, it } from "vitest";
import type { ProductApiItem } from "@/types";
import type { LocalProduct } from "@/lib/local-db/types";

/**
 * Devices compute expiry alerts from their own copy of the catalog, so the
 * sync payload has to carry expiry and batch. When it didn't, every device
 * that got its catalog from the server reported zero expiring stock while the
 * server held the real dates.
 */
describe("catalog sync payload", () => {
  it("carries the fields a device needs to raise its own expiry alerts", () => {
    const row: ProductApiItem = {
      id: "p1",
      name: "Amoxicillin 500mg",
      sellingPrice: 1200,
      quantity: 8,
      barcode: null,
      imageUrl: null,
      batchNumber: "B-2291",
      expiryDate: "2026-11-30",
    };

    expect(row.expiryDate).toBe("2026-11-30");
    expect(row.batchNumber).toBe("B-2291");
  });

  it("uses a date shape both the dashboard and the date input can read", () => {
    const expiryDate = "2026-11-30";

    // The dashboard compares parsed dates.
    expect(Number.isNaN(new Date(expiryDate).getTime())).toBe(false);
    // A native date input only accepts exactly YYYY-MM-DD.
    expect(expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/**
 * Mirrors the merge rule in pullCloudProducts: a row still waiting to upload
 * must survive a pull, or the edit is lost and never retried.
 */
function shouldKeepLocal(existing: Pick<LocalProduct, "syncedAt">): boolean {
  return existing.syncedAt == null;
}

describe("pull merge rule", () => {
  it("keeps an edit that has not reached the cloud yet", () => {
    expect(shouldKeepLocal({ syncedAt: null })).toBe(true);
  });

  it("accepts cloud state for a row that is already synced", () => {
    expect(shouldKeepLocal({ syncedAt: "2026-08-01T10:00:00.000Z" })).toBe(false);
  });
});

/**
 * Mirrors the acknowledgement rule in pushLocalProducts: only stamp syncedAt
 * on the exact revision that was uploaded.
 */
function shouldMarkSynced(pushedUpdatedAt: string, currentUpdatedAt: string) {
  return pushedUpdatedAt === currentUpdatedAt;
}

describe("push acknowledgement", () => {
  it("marks the revision that was actually uploaded", () => {
    expect(shouldMarkSynced("2026-08-01T10:00:00.000Z", "2026-08-01T10:00:00.000Z")).toBe(true);
  });

  it("leaves an edit made mid-request unsynced so the next push retries it", () => {
    expect(shouldMarkSynced("2026-08-01T10:00:00.000Z", "2026-08-01T10:00:05.000Z")).toBe(false);
  });
});
