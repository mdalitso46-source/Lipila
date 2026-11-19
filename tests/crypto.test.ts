import { describe, expect, it } from "vitest";
import { codesMatch, decryptSecret, encryptSecret, hashCode } from "../lib/crypto";

describe("custodial key encryption", () => {
  it("round-trips a Stellar secret", () => {
    const secret = "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const stored = encryptSecret(secret);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored)).toBe(secret);
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("checks one-time codes without keeping the code", () => {
    const hash = hashCode("+260971234567", "042013");
    expect(codesMatch("+260971234567", "042013", hash)).toBe(true);
    expect(codesMatch("+260971234567", "000000", hash)).toBe(false);
  });
});
