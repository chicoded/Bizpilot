import { afterEach, describe, expect, it, vi } from "vitest";
import { checkForChanges, invalidateSyncState } from "@/lib/sync/state";

/**
 * The change check sits in front of the expensive pulls, so its failure mode
 * matters more than its happy path. Every one of these asserts the same thing
 * from a different angle: when in doubt, pull.
 */

const STATE = {
  products: "2026-08-01T10:00:00.000Z",
  productCount: 12,
  sales: "2026-08-01T11:00:00.000Z",
  saleCount: 40,
};

function mockState(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      json: async () => body,
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateSyncState("shop_1");
});

describe("first poll of a session", () => {
  it("always pulls, because this tab does not know what it is missing", async () => {
    mockState(STATE);
    const check = await checkForChanges("shop_1");
    expect(check.changed).toBe(true);
  });
});

describe("once a state has been committed", () => {
  async function seed() {
    mockState(STATE);
    const first = await checkForChanges("shop_1");
    first.commit();
  }

  it("skips the pull when nothing moved", async () => {
    await seed();
    mockState(STATE);
    expect((await checkForChanges("shop_1")).changed).toBe(false);
  });

  it("pulls when a product was edited", async () => {
    await seed();
    mockState({ ...STATE, products: "2026-08-01T12:00:00.000Z" });
    expect((await checkForChanges("shop_1")).changed).toBe(true);
  });

  it("pulls when a sale was rung up", async () => {
    await seed();
    mockState({ ...STATE, sales: "2026-08-01T12:00:00.000Z", saleCount: 41 });
    expect((await checkForChanges("shop_1")).changed).toBe(true);
  });

  it("pulls when a product was deleted", async () => {
    // A deletion moves the count without moving any updatedAt, which is why
    // counts are checked alongside the timestamps.
    await seed();
    mockState({ ...STATE, productCount: 11 });
    expect((await checkForChanges("shop_1")).changed).toBe(true);
  });

  it("does not remember a state that was never committed", async () => {
    await seed();
    mockState({ ...STATE, productCount: 11 });
    const uncommitted = await checkForChanges("shop_1");
    expect(uncommitted.changed).toBe(true);

    // Pull failed, so nothing was committed — the next poll must still pull.
    mockState({ ...STATE, productCount: 11 });
    expect((await checkForChanges("shop_1")).changed).toBe(true);
  });
});

describe("failing safe", () => {
  async function seedThen(body: unknown, ok = true) {
    mockState(STATE);
    (await checkForChanges("shop_1")).commit();
    mockState(body, ok);
    return checkForChanges("shop_1");
  }

  it("pulls when the endpoint errors", async () => {
    expect((await seedThen({ error: "nope" }, false)).changed).toBe(true);
  });

  it("pulls when the response is malformed", async () => {
    expect((await seedThen({ products: "x" })).changed).toBe(true);
  });

  it("pulls when the response is empty", async () => {
    expect((await seedThen(null)).changed).toBe(true);
  });

  it("pulls when the request throws", async () => {
    mockState(STATE);
    (await checkForChanges("shop_1")).commit();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await checkForChanges("shop_1")).changed).toBe(true);
  });

  it("pulls again after an explicit invalidation", async () => {
    mockState(STATE);
    (await checkForChanges("shop_1")).commit();
    mockState(STATE);
    expect((await checkForChanges("shop_1")).changed).toBe(false);

    invalidateSyncState("shop_1");
    mockState(STATE);
    expect((await checkForChanges("shop_1")).changed).toBe(true);
  });
});

describe("separate shops", () => {
  it("does not let one shop's state answer for another", async () => {
    mockState(STATE);
    (await checkForChanges("shop_1")).commit();

    mockState(STATE);
    expect((await checkForChanges("shop_2")).changed).toBe(true);
    invalidateSyncState("shop_2");
  });
});
