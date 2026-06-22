import { describe, expect, it } from "vitest";
import { formatCurrency, formatPct, monthBounds, trailingMonths } from "./format";

describe("format helpers", () => {
  it("formats currency", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats percentages without decimals", () => {
    expect(formatPct(19.6)).toBe("20%");
  });

  it("computes month bounds", () => {
    expect(monthBounds(2026, 5)).toEqual({ from: "2026-06-01", to: "2026-06-30" });
  });

  it("computes a trailing window", () => {
    expect(trailingMonths(2026, 5, 6)).toEqual({ from: "2026-01-01", to: "2026-06-30" });
  });
});
