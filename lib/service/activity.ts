import { createId } from "../crypto";
import { displayAmount, type AssetCode } from "../money";
import type { Direction } from "../store/types";
import type { Store } from "../store/types";

export async function recordActivity(
  store: Store,
  input: {
    ownerPhone: string;
    kind: string;
    title: string;
    asset: AssetCode;
    amount: string;
    direction: Direction;
    counterparty?: string | null;
    txHash?: string | null;
    claimId?: string | null;
  },
): Promise<void> {
  await store.addActivity({
    id: createId(),
    ownerPhone: input.ownerPhone,
    kind: input.kind,
    title: input.title,
    asset: input.asset,
    amount: displayAmount(input.amount, input.asset),
    direction: input.direction,
    counterparty: input.counterparty ?? null,
    txHash: input.txHash ?? null,
    claimId: input.claimId ?? null,
    createdAt: new Date().toISOString(),
  });
}
