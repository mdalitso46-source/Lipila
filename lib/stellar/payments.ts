import { Keypair, Operation } from "@stellar/stellar-sdk";
import { buildClaimants } from "../claims";
import type { AssetCode } from "../money";
import { toStellarAmount } from "../money";
import { balanceIdFromResult, getServer, stellarAsset, submitSigned, txBuilder } from "./server";

export async function sendPayment(input: {
  from: Keypair;
  to: string;
  asset: AssetCode;
  amount: string;
}): Promise<string> {
  const horizon = getServer();
  const submitted = await submitSigned(async () => {
    const account = await horizon.loadAccount(input.from.publicKey());
    return txBuilder(account)
      .addOperation(
        Operation.payment({
          destination: input.to,
          asset: stellarAsset(input.asset),
          amount: toStellarAmount(input.amount),
        }),
      )
      .setTimeout(180)
      .build();
  }, [input.from]);
  return submitted.hash;
}

export async function createClaimable(input: {
  sender: Keypair;
  recipientPublicKey: string;
  asset: AssetCode;
  amount: string;
}): Promise<{ hash: string; balanceId: string }> {
  const horizon = getServer();
  const submitted = await submitSigned(async () => {
    const account = await horizon.loadAccount(input.sender.publicKey());
    return txBuilder(account)
      .addOperation(
        Operation.createClaimableBalance({
          asset: stellarAsset(input.asset),
          amount: toStellarAmount(input.amount),
          claimants: buildClaimants(input.recipientPublicKey, input.sender.publicKey()),
        }),
      )
      .setTimeout(180)
      .build();
  }, [input.sender]);
  const balanceId = await balanceIdFromResult(submitted.resultXdr, submitted.hash);
  if (!balanceId) throw new Error("Stellar did not return a claimable balance id.");
  return { hash: submitted.hash, balanceId };
}

export async function claimBalance(input: { signer: Keypair; balanceId: string }): Promise<string> {
  const horizon = getServer();
  const submitted = await submitSigned(async () => {
    const account = await horizon.loadAccount(input.signer.publicKey());
    return txBuilder(account)
      .addOperation(Operation.claimClaimableBalance({ balanceId: input.balanceId }))
      .setTimeout(180)
      .build();
  }, [input.signer]);
  return submitted.hash;
}
