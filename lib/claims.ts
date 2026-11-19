import { Claimant } from "@stellar/stellar-sdk";
import { CLAIM_WINDOW_SECONDS } from "./config";

export const CLAIM_WINDOW_MS = CLAIM_WINDOW_SECONDS * 1000;

export function buildClaimants(recipientPublicKey: string, senderPublicKey: string): Claimant[] {
  return [
    new Claimant(recipientPublicKey, Claimant.predicateUnconditional()),
    new Claimant(
      senderPublicKey,
      Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(String(CLAIM_WINDOW_SECONDS))),
    ),
  ];
}

export function reclaimAvailableAt(createdAtIso: string): string {
  return new Date(new Date(createdAtIso).getTime() + CLAIM_WINDOW_MS).toISOString();
}

export function canReclaim(createdAtIso: string, now = Date.now()): boolean {
  return now >= new Date(createdAtIso).getTime() + CLAIM_WINDOW_MS;
}

export function smsPreview(input: {
  senderPhone: string;
  amount: string;
  asset: string;
  claimUrl: string;
}): string {
  return `Lipila: ${input.senderPhone} sent you ${input.amount} ${input.asset}. Claim it: ${input.claimUrl}`;
}

export type DeliveryMode = "payment" | "claimable";

export function deliveryMode(recipientStatus: "active" | "pending" | "funding" | null): DeliveryMode {
  return recipientStatus === "active" ? "payment" : "claimable";
}
