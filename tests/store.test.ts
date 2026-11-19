import { describe, expect, it } from "vitest";
import { MemoryStore } from "../lib/store/memory";
import { emptyDatabase } from "../lib/store/types";

describe("memory store", () => {
  it("keeps a user, a code, and a session", async () => {
    const store = new MemoryStore(emptyDatabase());
    await store.insertUser({
      phone: "+260971111111",
      publicKey: "GABC",
      encryptedSecret: "cipher",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await store.saveOtp({
      phone: "+260971111111",
      codeHash: "hash",
      expiresAt: "2026-01-01T00:10:00.000Z",
      attempts: 0,
    });
    await store.incrementOtpAttempts("+260971111111");
    expect((await store.getOtp("+260971111111"))?.attempts).toBe(1);
    await store.saveSession({
      tokenHash: "tok",
      phone: "+260971111111",
      expiresAt: "2026-02-01T00:00:00.000Z",
    });
    expect((await store.getSession("tok"))?.phone).toBe("+260971111111");
    await store.deleteSession("tok");
    expect(await store.getSession("tok")).toBeNull();
  });

  it("tracks an open claim for the sender and the recipient", async () => {
    const store = new MemoryStore(emptyDatabase());
    await store.insertClaim({
      id: "claim1",
      senderPhone: "+260971111111",
      recipientPhone: "+260972222222",
      asset: "USDC",
      amount: "5",
      balanceId: "bal",
      recipientPublicKey: "GRECIP",
      encryptedRecipientSecret: "enc",
      status: "open",
      txHash: "hash",
      claimTxHash: null,
      createdAt: "2026-01-02T00:00:00.000Z",
      expiresAt: "2026-01-09T00:00:00.000Z",
    });
    expect(await store.listClaimsByRecipient("+260972222222", "open")).toHaveLength(1);
    await store.updateClaim("claim1", { status: "claimed", claimTxHash: "claimhash" });
    expect((await store.getClaim("claim1"))?.status).toBe("claimed");
  });
});
