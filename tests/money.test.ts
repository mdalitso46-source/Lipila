import { describe, expect, it } from "vitest";
import {
  applySlippage,
  assertCashoutAmount,
  assertSendAmount,
  displayAmount,
  estimateUsd,
  parseUnits,
} from "../lib/money";

describe("amounts", () => {
  it("parses Stellar 7-decimal amounts", () => {
    expect(parseUnits("1.5")).toBe(15_000_000n);
    expect(parseUnits("10.0000000")).toBe(100_000_000n);
  });

  it("rejects extra precision and tiny sends", () => {
    expect(() => parseUnits("1.12345678")).toThrow(/7 decimal/);
    expect(() => assertSendAmount("0.01")).toThrow(/Minimum/);
    expect(assertSendAmount("5")).toBe("5.0000000");
  });

  it("keeps cash-out inside the test anchor window", () => {
    expect(assertCashoutAmount("2")).toBe("2.0000000");
    expect(() => assertCashoutAmount("11")).toThrow(/1 to 10/);
  });

  it("displays dollars and estimates a portfolio", () => {
    expect(displayAmount("20.1290000", "USDC")).toBe("20.12");
    expect(estimateUsd("10", "10", "0.5")).toBe("15");
  });

  it("applies slippage in integer math", () => {
    expect(applySlippage("100", 150n)).toBe("98.5000000");
  });
});
