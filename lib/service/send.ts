import { Keypair } from "@stellar/stellar-sdk";
import { deliveryMode, reclaimAvailableAt, smsPreview } from "../claims";
import { expertTx } from "../config";
import { createId, encryptSecret } from "../crypto";
import { HttpError } from "../errors";
import { assertSendAmount, displayAmount, isAssetCode } from "../money";
import { formatPhone, normalizePhone } from "../phone";
import { getStore } from "../store";
import type { User } from "../store/types";
import { deliverNotice } from "../sms";
import { createClaimable, sendPayment } from "../stellar/payments";
import { claimBalance } from "../stellar/payments";
import { keypairFromUser } from "../stellar/wallet";
import { recordActivity } from "./activity";
import { requireUser } from "./session";

export async function sendToPhone(input: { phone?: string; amount?: string; asset?: string }, origin: string) {
  const sender = await requireUser();
  if (sender.status !== "active") throw new HttpError("Finish opening your wallet before sending.");
  if (!isAssetCode(input.asset)) throw new HttpError("Choose USDC or XLM.");
  const amount = assertSendAmount(input.amount || "");
  const recipientPhone = normalizePhone(input.phone || "");
  if (recipientPhone === sender.phone) throw new HttpError("You can't send to your own number.");

  const store = await getStore();
  let recipient = await store.getUser(recipientPhone);
  const mode = deliveryMode(recipient?.status ?? null);
  const senderKey = keypairFromUser(sender);
  const shown = displayAmount(amount, input.asset);

  if (mode === "payment" && recipient) {
    const hash = await sendPayment({
      from: senderKey,
      to: recipient.publicKey,
      asset: input.asset,
      amount,
    });
    await recordActivity(store, {
      ownerPhone: sender.phone,
      kind: "send",
      title: `Sent ${shown} ${input.asset} to ${formatPhone(recipientPhone)}`,
      asset: input.asset,
      amount: shown,
      direction: "out",
      counterparty: recipientPhone,
      txHash: hash,
    });
    await recordActivity(store, {
      ownerPhone: recipientPhone,
      kind: "receive",
      title: `Received ${shown} ${input.asset} from ${formatPhone(sender.phone)}`,
      asset: input.asset,
      amount: shown,
      direction: "in",
      counterparty: sender.phone,
      txHash: hash,
    });
    return {
      mode,
      txHash: hash,
      expertUrl: expertTx(hash),
      amount: shown,
      asset: input.asset,
      recipientPhone,
    };
  }

  if (!recipient) {
    const keypair = Keypair.random();
    recipient = await store.insertUser({
      phone: recipientPhone,
      publicKey: keypair.publicKey(),
      encryptedSecret: encryptSecret(keypair.secret()),
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }
  return createClaim(sender, recipient, input.asset, amount, shown, origin);
}

async function createClaim(
  sender: User,
  recipient: User,
  asset: "USDC" | "XLM",
  amount: string,
  shown: string,
  origin: string,
) {
  const store = await getStore();
  const created = await createClaimable({
    sender: keypairFromUser(sender),
    recipientPublicKey: recipient.publicKey,
    asset,
    amount,
  });
  const now = new Date().toISOString();
  const claim = await store.insertClaim({
    id: createId(),
    senderPhone: sender.phone,
    recipientPhone: recipient.phone,
    asset,
    amount: shown,
    balanceId: created.balanceId,
    recipientPublicKey: recipient.publicKey,
    encryptedRecipientSecret: recipient.encryptedSecret,
    status: "open",
    txHash: created.hash,
    claimTxHash: null,
    createdAt: now,
    expiresAt: reclaimAvailableAt(now),
  });
  const claimUrl = `${origin}/claim/${claim.id}`;
  const preview = smsPreview({
    senderPhone: formatPhone(sender.phone),
    amount: shown,
    asset,
    claimUrl,
  });
  const sms = await deliverNotice(recipient.phone, `${preview} Testnet sandbox, not real money.`);
  await recordActivity(store, {
    ownerPhone: sender.phone,
    kind: "claimable",
    title: `Held ${shown} ${asset} for ${formatPhone(recipient.phone)} to claim`,
    asset,
    amount: shown,
    direction: "out",
    counterparty: recipient.phone,
    txHash: created.hash,
    claimId: claim.id,
  });
  return {
    mode: "claimable" as const,
    txHash: created.hash,
    expertUrl: expertTx(created.hash),
    amount: shown,
    asset,
    recipientPhone: recipient.phone,
    claimUrl,
    smsPreview: preview,
    smsSent: sms === "sent",
    claimId: claim.id,
    expiresAt: claim.expiresAt,
  };
}

export async function reclaim(claimId: string) {
  const sender = await requireUser();
  const store = await getStore();
  const claim = await store.getClaim(claimId);
  if (!claim || claim.senderPhone !== sender.phone) throw new HttpError("Claim not found.", 404);
  if (claim.status !== "open" || !claim.balanceId) throw new HttpError("This claim is already closed.");
  if (new Date(claim.expiresAt).getTime() > Date.now()) {
    throw new HttpError(`You can reclaim this after ${new Date(claim.expiresAt).toLocaleString("en-GB")}.`);
  }
  const hash = await claimBalance({ signer: keypairFromUser(sender), balanceId: claim.balanceId });
  await store.updateClaim(claim.id, { status: "reclaimed", claimTxHash: hash });
  await recordActivity(store, {
    ownerPhone: sender.phone,
    kind: "reclaim",
    title: `Reclaimed ${claim.amount} ${claim.asset}`,
    asset: claim.asset,
    amount: claim.amount,
    direction: "in",
    counterparty: claim.recipientPhone,
    txHash: hash,
    claimId: claim.id,
  });
  return { txHash: hash, expertUrl: expertTx(hash) };
}
