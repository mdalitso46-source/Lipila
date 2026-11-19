import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizePhone } from "../lib/phone";

describe("Zambian phone numbers", () => {
  it("accepts mobile numbers with or without the country code", () => {
    expect(normalizePhone("097 123 4567")).toBe("+260971234567");
    expect(normalizePhone("+260 96 111 2233")).toBe("+260961112233");
    expect(normalizePhone("260771112233")).toBe("+260771112233");
  });

  it("rejects landlines and short numbers", () => {
    expect(() => normalizePhone("0211234567")).toThrow(/Zambian mobile/);
    expect(() => normalizePhone("12345")).toThrow(/Zambian mobile/);
  });

  it("formats and masks", () => {
    expect(formatPhone("+260971234567")).toBe("+260 97 123 4567");
    expect(maskPhone("+260971234567")).toBe("+260 97 ••• 4567");
  });
});
