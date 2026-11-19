import { Keypair, Operation } from "@stellar/stellar-sdk";
import { HttpError } from "../errors";
import { applySlippage, displayAmount, toStellarAmount, type AssetCode } from "../money";
import { quoteStrictSend } from "./prices";
import { getServer, stellarAsset, submitSigned, txBuilder } from "./server";

export type SwapQuote = {
  from: AssetCode;
  to: AssetCode;
  sourceAmount: string;
  destinationAmount: string;
  destinationMin: string;
  rate: string;
};

export async function quoteSwap(from: AssetCode, to: AssetCode, amount: string): Promise<SwapQuote> {
  if (from === to) throw new HttpError("Choose two different assets.");
  const quoted = await quoteStrictSend(stellarAsset(from), stellarAsset(to), toStellarAmount(amount));
  if (!quoted) throw new HttpError("The testnet DEX has no path for that swap right now.");
  const source = Number(quoted.sourceAmount);
  const destination = Number(quoted.destinationAmount);
  const rate = source > 0 ? (destination / source).toFixed(4) : "0";
  return {
    from,
    to,
    sourceAmount: quoted.sourceAmount,
    destinationAmount: quoted.destinationAmount,
    destinationMin: applySlippage(quoted.destinationAmount),
    rate,
  };
}

export async function executeSwap(input: {
  keypair: Keypair;
  from: AssetCode;
  to: AssetCode;
  amount: string;
}): Promise<{ hash: string; quote: SwapQuote }> {
  const pathQuote = await quoteStrictSend(
    stellarAsset(input.from),
    stellarAsset(input.to),
    toStellarAmount(input.amount),
  );
  if (!pathQuote) throw new HttpError("The testnet DEX has no path for that swap right now.");
  const quote = await quoteSwap(input.from, input.to, input.amount);
  quote.destinationMin = applySlippage(pathQuote.destinationAmount);
  const horizon = getServer();
  const submitted = await submitSigned(async () => {
    const account = await horizon.loadAccount(input.keypair.publicKey());
    return txBuilder(account)
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: stellarAsset(input.from),
          sendAmount: toStellarAmount(input.amount),
          destination: input.keypair.publicKey(),
          destAsset: stellarAsset(input.to),
          destMin: quote.destinationMin,
          path: pathQuote.path,
        }),
      )
      .setTimeout(180)
      .build();
  }, [input.keypair]);
  return { hash: submitted.hash, quote: { ...quote, destinationAmount: displayAmount(quote.destinationAmount, input.to) } };
}
