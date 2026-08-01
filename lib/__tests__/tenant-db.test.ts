import { describe, expect, it } from "vitest";
import { isTenantModel, scopeArgs } from "@/lib/tenant-db";

const SHOP = "shop_abc";

describe("isTenantModel", () => {
  it("covers models that carry businessId", () => {
    expect(isTenantModel("Product")).toBe(true);
    expect(isTenantModel("Sale")).toBe(true);
    expect(isTenantModel("Customer")).toBe(true);
  });

  it("leaves global models alone", () => {
    expect(isTenantModel("User")).toBe(false);
    expect(isTenantModel("Business")).toBe(false);
    expect(isTenantModel("InternalAdmin")).toBe(false);
  });

  it("excludes the models that bootstrap tenancy", () => {
    // Membership resolves which shops a user belongs to, and TeamInvite is
    // read by token before any business context exists. Scoping either would
    // make sign-in and invite redemption impossible.
    expect(isTenantModel("Membership")).toBe(false);
    expect(isTenantModel("TeamInvite")).toBe(false);
  });

  it("treats an unknown or missing model as non-tenant", () => {
    expect(isTenantModel(undefined)).toBe(false);
    expect(isTenantModel("NotARealModel")).toBe(false);
  });
});

describe("scopeArgs — reads", () => {
  it("adds a filter when the caller passed none", () => {
    expect(scopeArgs("Product", "findMany", {}, SHOP)).toEqual({
      where: { businessId: SHOP },
    });
  });

  it("adds a filter when the caller passed no args at all", () => {
    expect(scopeArgs("Product", "count", undefined, SHOP)).toEqual({
      where: { businessId: SHOP },
    });
  });

  it("merges with an existing filter instead of replacing it", () => {
    const args = { where: { isActive: true }, orderBy: { name: "asc" } };
    expect(scopeArgs("Product", "findMany", args, SHOP)).toEqual({
      where: { isActive: true, businessId: SHOP },
      orderBy: { name: "asc" },
    });
  });

  it("scopes findUnique, which is the usual way an id leaks across shops", () => {
    expect(scopeArgs("Product", "findUnique", { where: { id: "p1" } }, SHOP)).toEqual({
      where: { id: "p1", businessId: SHOP },
    });
  });

  it("does not mutate the caller's object", () => {
    const args = { where: { isActive: true } };
    scopeArgs("Product", "findMany", args, SHOP);
    expect(args).toEqual({ where: { isActive: true } });
  });

  it("passes global models through untouched", () => {
    const args = { where: { id: "u1" } };
    expect(scopeArgs("User", "findUnique", args, SHOP)).toBe(args);
  });
});

describe("scopeArgs — writes", () => {
  it("stamps businessId onto create", () => {
    expect(scopeArgs("Product", "create", { data: { name: "Panadol" } }, SHOP)).toEqual({
      data: { name: "Panadol", businessId: SHOP },
    });
  });

  it("stamps every row of a createMany", () => {
    const args = { data: [{ name: "A" }, { name: "B" }] };
    expect(scopeArgs("Product", "createMany", args, SHOP)).toEqual({
      data: [
        { name: "A", businessId: SHOP },
        { name: "B", businessId: SHOP },
      ],
    });
  });

  it("scopes update so another shop's row matches nothing", () => {
    const args = { where: { id: "p1" }, data: { quantity: 5 } };
    expect(scopeArgs("Product", "update", args, SHOP)).toEqual({
      where: { id: "p1", businessId: SHOP },
      data: { quantity: 5 },
    });
  });

  it("scopes deleteMany", () => {
    expect(scopeArgs("Expense", "deleteMany", { where: { id: "e1" } }, SHOP)).toEqual({
      where: { id: "e1", businessId: SHOP },
    });
  });

  it("scopes both halves of an upsert", () => {
    const args = {
      where: { id: "p1" },
      create: { name: "Panadol" },
      update: { quantity: 9 },
    };
    expect(scopeArgs("Product", "upsert", args, SHOP)).toEqual({
      where: { id: "p1", businessId: SHOP },
      create: { name: "Panadol", businessId: SHOP },
      update: { quantity: 9 },
    });
  });

  it("cannot be overridden by a caller-supplied businessId", () => {
    const args = { where: { businessId: "someone_elses_shop" } };
    expect(scopeArgs("Sale", "findMany", args, SHOP)).toEqual({
      where: { businessId: SHOP },
    });
  });
});
