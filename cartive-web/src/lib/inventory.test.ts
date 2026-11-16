import { describe, expect, it } from "vitest";
import { getMaximumAvailableQuantity } from "./inventory";

describe("inventory adjustments", () => {
  it("keeps stock already allocated to non-cancelled orders unavailable", () => {
    expect(getMaximumAvailableQuantity(20, 7)).toBe(13);
  });

  it("releases cancelled order allocations from the adjustment limit", () => {
    expect(getMaximumAvailableQuantity(20, 0)).toBe(20);
  });

  it("never permits a negative quantity when allocations exceed production", () => {
    expect(getMaximumAvailableQuantity(5, 8)).toBe(0);
  });
});
