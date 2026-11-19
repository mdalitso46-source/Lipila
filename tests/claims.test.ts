import { Claimant, Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { buildClaimants, canReclaim, deliveryMode, reclaimAvailableAt, smsPreview } from "../lib/claims";

const recipient = Keypair.random().publicKey();
const sender = Keypair.random().publicKey();

describe("claimable delivery", () => {
  it("pays an active wallet and creates a claim for everyone else", () => {
    expect(deliveryMode("active")).toBe("payment");
    expect(deliveryMode("pending")).toBe("claimable");
    expect(deliveryMode(null)).toBe("claimable");
  });

  it("lets the recipient claim immediately and the sender only after 7 days", () => {
    const claimants = buildClaimants(recipient, sender);
    expect(claimants).toHaveLength(2);
    expect(claimants[0].destination).toBe(recipient);
    expect(claimants[1].destination).toBe(sender);
    const unconditional = Claimant.predicateUnconditional().toXDR("raw");
    expect(Buffer.compare(claimants[0].predicate.toXDR("raw"), unconditional)).toBe(0);
    expect(Buffer.compare(claimants[1].predicate.toXDR("raw"), unconditional)).not.toBe(0);
  });

  it("opens reclaim seven days after creation", () => {
    const created = "2026-01-01T00:00:00.000Z";
    expect(canReclaim(created, Date.parse("2026-01-07T00:00:00.000Z"))).toBe(false);
    expect(canReclaim(created, Date.parse("2026-01-08T00:00:00.000Z"))).toBe(true);
    expect(reclaimAvailableAt(created)).toBe("2026-01-08T00:00:00.000Z");
  });

  it("writes the simulated SMS", () => {
    const text = smsPreview({
      senderPhone: "+260 97 000 0001",
      amount: "5",
      asset: "USDC",
      claimUrl: "https://lipila.test/claim/abc",
    });
    expect(text).toContain("https://lipila.test/claim/abc");
    expect(text).toContain("5 USDC");
  });
});
