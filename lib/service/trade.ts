import { expertTx } from "../config";
import { HttpError } from "../errors";
import { assertSendAmount, displayAmount, isAssetCode } from "../money";
import { formatPhone } from "../phone";
import { getStore } from "../store";
import { executeSwap, quoteSwap } from "../stellar/swap";
import { keypairFromUser } from "../stellar/wallet";
import { recordActivity } from "./activity";
import { requireUser } from "./session";

export async function quote(input: { from?: string; to?: string; amount?: string }) {
  await requireUser();
  if (!isAssetCode(input.from) || !isAssetCode(input.to)) throw new HttpError("Choose USDC or XLM.");
  const amount = assertSendAmount(input.amount || "");
  const quoted = await quoteSwap(input.from, input.to, amount);
  return {
    ...quoted,
    sourceDisplay: displayAmount(quoted.sourceAmount, input.from),
    destinationDisplay: displayAmount(quoted.destinationAmount, input.to),
    summary: `1 ${input.from} ≈ ${quoted.rate} ${input.to} on the testnet DEX`,
  };
}

export async function swap(input: { from?: string; to?: string; amount?: string }) {
  const user = await requireUser();
  if (!isAssetCode(input.from) || !isAssetCode(input.to)) throw new HttpError("Choose USDC or XLM.");
  const amount = assertSendAmount(input.amount || "");
  const result = await executeSwap({
    keypair: keypairFromUser(user),
    from: input.from,
    to: input.to,
    amount,
  });
  const store = await getStore();
  await recordActivity(store, {
    ownerPhone: user.phone,
    kind: "swap",
    title: `Swapped ${displayAmount(amount, input.from)} ${input.from} for about ${result.quote.destinationAmount} ${input.to}`,
    asset: input.to,
    amount: result.quote.destinationAmount,
    direction: "in",
    txHash: result.hash,
  });
  return {
    txHash: result.hash,
    expertUrl: expertTx(result.hash),
    from: input.from,
    to: input.to,
    sourceAmount: displayAmount(amount, input.from),
    destinationAmount: result.quote.destinationAmount,
    rate: result.quote.rate,
    phone: formatPhone(user.phone),
    sandbox: true,
  };
}
