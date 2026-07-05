import { describe, expect, it } from "vitest";
import {
  displayReceiptNumber,
  formatReceiptNumber,
  receiptDateKey,
} from "@/lib/receipt-number";

describe("receipt numbers", () => {
  it("formats industry-style receipt numbers", () => {
    expect(formatReceiptNumber("20250703", 1)).toBe("RCP-20250703-0001");
    expect(formatReceiptNumber("20250703", 42)).toBe("RCP-20250703-0042");
    expect(formatReceiptNumber("20250703", 9999)).toBe("RCP-20250703-9999");
  });

  it("builds date key from sale date", () => {
    expect(receiptDateKey(new Date("2025-07-03T14:30:00Z"))).toBe("20250703");
  });

  it("displays stored receipt number when present", () => {
    expect(
      displayReceiptNumber({
        id: "clxyz123",
        receiptNumber: "RCP-20250703-0007",
      })
    ).toBe("RCP-20250703-0007");
  });

  it("falls back for legacy sales without receipt number", () => {
    expect(displayReceiptNumber({ id: "clabcdefghij" })).toBe(
      "RCP-LEGACY-CDEFGHIJ"
    );
  });
});
