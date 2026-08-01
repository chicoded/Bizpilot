import { describe, expect, it } from "vitest";
import { TOOL_SCHEMAS, isKnownTool, runTool } from "@/lib/ai/tools";

/**
 * Pins the contract the model sees, and the guards around what it may ask for.
 * The handlers themselves need a database; what matters here is that a model
 * cannot name a tenant, cannot invent a tool, and cannot ask for a page size
 * that takes the shop's database down.
 */

describe("tool schemas", () => {
  it("exposes the lookups an owner actually asks about", () => {
    const names = TOOL_SCHEMAS.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "get_today_summary",
        "query_sales",
        "get_top_products",
        "get_stock_levels",
        "get_debtors",
        "get_expenses",
        "get_business_health",
      ])
    );
  });

  it("never lets the model choose the shop", () => {
    // businessId is bound on the server. If it were ever a parameter, a prompt
    // injection could read another shop's books.
    for (const tool of TOOL_SCHEMAS) {
      const params = Object.keys(tool.parameters.properties);
      expect(params, `${tool.name} must not take a tenant id`).not.toContain(
        "businessId"
      );
      expect(params).not.toContain("business_id");
      expect(params).not.toContain("tenantId");
    }
  });

  it("describes every tool well enough to be chosen correctly", () => {
    for (const tool of TOOL_SCHEMAS) {
      expect(tool.description.length, `${tool.name} needs a real description`)
        .toBeGreaterThan(40);
      expect(tool.parameters.type).toBe("object");
    }
  });

  it("gives every tool a unique name", () => {
    const names = TOOL_SCHEMAS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("known tools", () => {
  it("recognises the declared tools", () => {
    for (const tool of TOOL_SCHEMAS) {
      expect(isKnownTool(tool.name)).toBe(true);
    }
  });

  it("rejects anything the model makes up", () => {
    expect(isKnownTool("drop_all_tables")).toBe(false);
    expect(isKnownTool("get_other_business")).toBe(false);
    expect(isKnownTool("")).toBe(false);
  });

  it("is not fooled by inherited object properties", () => {
    // A plain `name in HANDLERS` check would answer true for these.
    expect(isKnownTool("toString")).toBe(false);
    expect(isKnownTool("constructor")).toBe(false);
    expect(isKnownTool("__proto__")).toBe(false);
  });
});

describe("running an unknown tool", () => {
  it("returns an error rather than throwing", async () => {
    const result = await runTool("not_a_tool", {}, "shop_1");
    expect(result).toHaveProperty("error");
  });
});
