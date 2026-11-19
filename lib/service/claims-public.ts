import { HttpError } from "../errors";
import { maskPhone, normalizePhone } from "../phone";
import { getStore } from "../store";
import { requestOtp } from "./auth";

export async function publicClaim(id: string) {
  const store = await getStore();
  const claim = await store.getClaim(id);
  if (!claim) throw new HttpError("This claim link is not valid.", 404);
  return {
    id: claim.id,
    asset: claim.asset,
    amount: claim.amount,
    status: claim.status,
    expiresAt: claim.expiresAt,
    senderMasked: maskPhone(claim.senderPhone),
    recipientMasked: maskPhone(claim.recipientPhone),
    recipientPhone: claim.recipientPhone,
  };
}

export async function requestClaimOtp(id: string, phone: string) {
  const claim = await publicClaim(id);
  if (claim.status !== "open") throw new HttpError("This money has already been claimed.");
  const normalized = normalizePhone(phone);
  if (normalized !== claim.recipientPhone) {
    throw new HttpError("Use the phone number this payment was sent to.");
  }
  return requestOtp(normalized);
}
