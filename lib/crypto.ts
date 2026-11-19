import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

function material(name: "WALLET_ENCRYPTION_KEY" | "SESSION_SECRET", demoLabel: string): string {
  const raw = process.env[name]?.trim();
  if (raw && !raw.startsWith("replace-with")) return raw;
  const localDemo =
    process.env.DEMO_MODE !== "false" &&
    process.env.NETLIFY !== "true" &&
    process.env.NODE_ENV !== "production";
  if (localDemo) return demoLabel;
  throw new Error(`Set ${name} before starting Lipila. See .env.example.`);
}

function encryptionKey(): Buffer {
  const raw = material("WALLET_ENCRYPTION_KEY", "lipila-local-demo-key");
  if (raw === "lipila-local-demo-key") {
    return scryptSync(raw, "lipila-salt", 32);
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  throw new Error("WALLET_ENCRYPTION_KEY must be 32 bytes, as hex or base64.");
}

export function sessionPepper(): string {
  return material("SESSION_SECRET", "lipila-local-demo-session");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, bodyPart] = payload.split(".");
  if (!ivPart || !tagPart || !bodyPart) throw new Error("Stored wallet key is unreadable.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(bodyPart, "base64url")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCode(phone: string, code: string): string {
  return sha256(`${sessionPepper()}:${phone}:${code}`);
}

export function codesMatch(phone: string, code: string, codeHash: string): boolean {
  const next = Buffer.from(hashCode(phone, code));
  const prev = Buffer.from(codeHash);
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function createId(bytes = 9): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomCode(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, "0");
}
