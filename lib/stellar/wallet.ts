import { Asset, Keypair, Operation } from "@stellar/stellar-sdk";
import { decryptSecret, encryptSecret } from "../crypto";
import type { User } from "../store/types";
import type { Store } from "../store/types";
import { accountExists, fundWithFriendbot, getServer, submitSigned, txBuilder, usdcAsset } from "./server";

let sponsorChain: Promise<unknown> = Promise.resolve();

function withSponsorLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = sponsorChain.then(fn, fn);
  sponsorChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function keypairFromUser(user: Pick<User, "encryptedSecret">): Keypair {
  return Keypair.fromSecret(decryptSecret(user.encryptedSecret));
}

export async function getSponsorKeypair(store: Store): Promise<Keypair> {
  return withSponsorLock(async () => {
    const existing = await store.getSponsor();
    if (existing) return Keypair.fromSecret(decryptSecret(existing.encryptedSecret));
    const keypair = Keypair.random();
    await fundWithFriendbot(keypair.publicKey());
    await store.saveSponsor({
      publicKey: keypair.publicKey(),
      encryptedSecret: encryptSecret(keypair.secret()),
    });
    return keypair;
  });
}

export async function materializeAndClaim(input: {
  sponsor: Keypair;
  claimant: Keypair;
  balanceIds: string[];
  topUpXlm?: boolean;
}): Promise<string> {
  return withSponsorLock(async () => {
    const horizon = getServer();
    const exists = await accountExists(input.claimant.publicKey());
    const submitted = await submitSigned(async () => {
      const sponsorAccount = await horizon.loadAccount(input.sponsor.publicKey());
      const builder = txBuilder(sponsorAccount);
      if (!exists) {
        builder
          .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: input.claimant.publicKey() }))
          .addOperation(
            Operation.createAccount({
              destination: input.claimant.publicKey(),
              startingBalance: "0",
            }),
          )
          .addOperation(
            Operation.changeTrust({
              asset: usdcAsset(),
              source: input.claimant.publicKey(),
            }),
          )
          .addOperation(Operation.endSponsoringFutureReserves({ source: input.claimant.publicKey() }));
      }
      for (const balanceId of input.balanceIds) {
        builder.addOperation(
          Operation.claimClaimableBalance({
            balanceId,
            source: input.claimant.publicKey(),
          }),
        );
      }
      if (input.topUpXlm !== false) {
        builder.addOperation(
          Operation.payment({
            destination: input.claimant.publicKey(),
            asset: Asset.native(),
            amount: "3.0000000",
          }),
        );
      }
      return builder.setTimeout(180).build();
    }, [input.sponsor, input.claimant]);
    return submitted.hash;
  });
}
