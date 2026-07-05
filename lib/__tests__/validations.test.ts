import { describe, expect, it } from "vitest";
import { saleSchema } from "@/lib/validations";

describe("sale validation", () => {
  it("accepts a valid cash sale", () => {
    const result = saleSchema.safeParse({
      items: [{ productId: "prod_1", quantity: 2 }],
      paymentMethod: "CASH",
    });
    expect(result.success).toBe(true);
  });

  it("requires a customer for credit sales", () => {
    const result = saleSchema.safeParse({
      items: [{ productId: "prod_1", quantity: 1 }],
      paymentMethod: "CREDIT",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.customerId?.[0]).toMatch(
        /customer/i
      );
    }
  });

  it("rejects empty cart", () => {
    const result = saleSchema.safeParse({
      items: [],
      paymentMethod: "CASH",
    });
    expect(result.success).toBe(false);
  });
});
