import { Keypair } from "@stellar/stellar-sdk";
import { reclaimAvailableAt } from "../claims";
import { createId, encryptSecret, hashCode, randomCode, codesMatch, sha256 } from "../crypto";
import { HttpError } from "../errors";
import { formatPhone, normalizePhone } from "../phone";
import { getStore } from "../store";
import type { User } from "../store/types";
import { deliverOtp } from "../sms";
import { claimBalance } from "../stellar/payments";
import { accountExists, ensureTrustline, fundWithFriendbot, sleep } from "../stellar/server";
import { getSponsorKeypair, keypairFromUser, materializeAndClaim } from "../stellar/wallet";
import { recordActivity } from "./activity";
import { publicUser } from "./session";

const OTP_MS = 10 * 60 * 1000;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export async function requestOtp(phoneInput: string): Promise<{
  phone: string;
  delivery: "demo" | "sms";
  provider: string;
  demoCode?: string;
}> {
  const phone = normalizePhone(phoneInput);
  const code = randomCode();
  const store = await getStore();
  await store.saveOtp({
    phone,
    codeHash: hashCode(phone, code),
    expiresAt: new Date(Date.now() + OTP_MS).toISOString(),
    attempts: 0,
  });
  try {
    const sent = await deliverOtp(phone, code);
    if (sent.exposeCode) return { phone, delivery: "demo", provider: sent.provider, demoCode: code };
    return { phone, delivery: "sms", provider: sent.provider };
  } catch (error) {
    await store.deleteOtp(phone);
    throw error;
  }
}

export async function verifyOtp(phoneInput: string, code: string): Promise<{
  token: string;
  user: ReturnType<typeof publicUser>;
}> {
  const phone = normalizePhone(phoneInput);
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) throw new HttpError("Enter the 6-digit code.");
  const store = await getStore();
  const otp = await store.getOtp(phone);
  if (!otp) throw new HttpError("Request a code first.");
  if (new Date(otp.expiresAt).getTime() < Date.now()) throw new HttpError("That code expired. Request a new one.");
  if (otp.attempts >= 5) throw new HttpError("Too many attempts. Request a new code.");
  if (!codesMatch(phone, trimmed, otp.codeHash)) {
    await store.incrementOtpAttempts(phone);
    throw new HttpError("That code doesn't match.");
  }

  const user = await ensureWallet(phone);
  await store.deleteOtp(phone);
  const token = createId(32);
  await store.saveSession({
    tokenHash: sha256(token),
    phone,
    expiresAt: new Date(Date.now() + SESSION_MS).toISOString(),
  });
  return { token, user: publicUser(user) };
}

async function ensureWallet(phone: string): Promise<User> {
  const store = await getStore();
  const existing = await store.getUser(phone);
  if (!existing) return createActiveWallet(phone);
  if (existing.status === "funding") return resumeFunding(existing);
  if (existing.status === "pending") return settlePending(existing);
  await claimOutstanding(existing);
  return existing;
}

async function createActiveWallet(phone: string): Promise<User> {
  const store = await getStore();
  const keypair = Keypair.random();
  const user: User = {
    phone,
    publicKey: keypair.publicKey(),
    encryptedSecret: encryptSecret(keypair.secret()),
    status: "funding",
    createdAt: new Date().toISOString(),
  };
  await store.insertUser(user);
  return resumeFunding(user);
}

async function resumeFunding(user: User): Promise<User> {
  const store = await getStore();
  const keypair = keypairFromUser(user);
  if (!(await accountExists(keypair.publicKey()))) {
    let hash: string | null = null;
    try {
      hash = await fundWithFriendbot(keypair.publicKey());
    } catch (error) {
      if (!(await accountExists(keypair.publicKey()))) throw error;
    }
    for (let attempt = 0; attempt < 6 && !(await accountExists(keypair.publicKey())); attempt += 1) {
      await sleep(800);
    }
    await recordActivity(store, {
      ownerPhone: user.phone,
      kind: "fund",
      title: "Friendbot funded your wallet with test XLM",
      asset: "XLM",
      amount: "10000",
      direction: "in",
      txHash: hash,
    });
  }
  const trustHash = await ensureTrustline(keypair);
  if (trustHash) {
    await recordActivity(store, {
      ownerPhone: user.phone,
      kind: "trustline",
      title: "Opened a trustline for Circle testnet USDC",
      asset: "USDC",
      amount: "0",
      direction: "in",
      txHash: trustHash,
    });
  }
  await store.updateUser(user.phone, { status: "active" });
  user.status = "active";
  await claimOutstanding(user);
  return user;
}

async function claimOutstanding(user: User): Promise<void> {
  const store = await getStore();
  const claims = (await store.listClaimsByRecipient(user.phone, "open")).filter((claim) => claim.balanceId);
  if (!claims.length || !(await accountExists(user.publicKey))) return;
  const keypair = keypairFromUser(user);
  for (const claim of claims) {
    const hash = await claimBalance({ signer: keypair, balanceId: claim.balanceId! });
    await store.updateClaim(claim.id, { status: "claimed", claimTxHash: hash });
    await recordActivity(store, {
      ownerPhone: user.phone,
      kind: "claim",
      title: `Claimed ${claim.amount} ${claim.asset} from ${formatPhone(claim.senderPhone)}`,
      asset: claim.asset,
      amount: claim.amount,
      direction: "in",
      counterparty: claim.senderPhone,
      txHash: hash,
      claimId: claim.id,
    });
  }
}

async function settlePending(user: User): Promise<User> {
  const store = await getStore();
  const claims = await store.listClaimsByRecipient(user.phone, "open");
  const balanceIds = claims.map((claim) => claim.balanceId).filter((id): id is string => Boolean(id));
  const sponsor = await getSponsorKeypair(store);
  const hash = await materializeAndClaim({
    sponsor,
    claimant: keypairFromUser(user),
    balanceIds,
  });
  for (const claim of claims) {
    if (!claim.balanceId) continue;
    await store.updateClaim(claim.id, { status: "claimed", claimTxHash: hash });
    await recordActivity(store, {
      ownerPhone: user.phone,
      kind: "claim",
      title: `Claimed ${claim.amount} ${claim.asset} from ${formatPhone(claim.senderPhone)}`,
      asset: claim.asset,
      amount: claim.amount,
      direction: "in",
      counterparty: claim.senderPhone,
      txHash: hash,
      claimId: claim.id,
    });
    await recordActivity(store, {
      ownerPhone: claim.senderPhone,
      kind: "claimed",
      title: `${formatPhone(user.phone)} claimed ${claim.amount} ${claim.asset}`,
      asset: claim.asset,
      amount: claim.amount,
      direction: "out",
      counterparty: user.phone,
      txHash: hash,
      claimId: claim.id,
    });
  }
  await recordActivity(store, {
    ownerPhone: user.phone,
    kind: "sponsor",
    title: "Wallet created with sponsored reserves",
    asset: "XLM",
    amount: "3",
    direction: "in",
    txHash: hash,
  });
  await store.updateUser(user.phone, { status: "active" });
  user.status = "active";
  return user;
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  const store = await getStore();
  await store.deleteSession(sha256(token));
}

export { reclaimAvailableAt };
