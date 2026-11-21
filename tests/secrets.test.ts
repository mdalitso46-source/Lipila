import { describe, expect, it } from "vitest";
import { httpError, redactSecrets } from "../lib/errors";
import { publicUser } from "../lib/service/session";
import { CLAIM_WINDOW_SECONDS } from "../lib/config";

describe("secrets stay off the client", () => {
  it("redacts a Stellar secret from an error", () => {
    const secret = `S${"A".repeat(55)}`;
    const parsed = httpError(new Error(`wallet ${secret} failed`));
    expect(parsed.message).toBe("wallet [redacted-secret] failed");
    expect(redactSecrets(secret)).not.toContain(secret);
  });

  it("returns a public profile without the encrypted key", () => {
    const view = publicUser({
      phone: "+260971111111",
      publicKey: "G".padEnd(56, "A"),
      encryptedSecret: "iv.tag.ciphertext",
      status: "active",
      createdAt: "2026-11-21T00:00:00.000Z",
    });
    expect(view).toEqual({
      phone: "+260971111111",
      publicKey: "G".padEnd(56, "A"),
      status: "active",
    });
    expect(JSON.stringify(view)).not.toContain("ciphertext");
  });

  it("keeps the sender reclaim window at 7 days", () => {
    expect(CLAIM_WINDOW_SECONDS).toBe(7 * 24 * 60 * 60);
  });
});