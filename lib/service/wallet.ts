import { expertAccount } from "../config";
import { HttpError } from "../errors";
import { estimateUsd, parseUnits, trimBalance } from "../money";
import { starterXlm } from "../config";
import { formatPhone } from "../phone";
import { getStore } from "../store";
import { requestCircleUsdc } from "../stellar/faucet";
import { getXlmUsdPrice } from "../stellar/prices";
import { ensureTrustline, loadBalances, sleep } from "../stellar/server";
import { executeSwap } from "../stellar/swap";
import { keypairFromUser } from "../stellar/wallet";
import { recordActivity } from "./activity";
import { requireUser } from "./session";

export async function homeForCurrentUser() {
  const user = await requireUser();
  if (user.status !== "active") {
    throw new HttpError("Your wallet is still being created. Sign in again in a moment.");
  }
  const store = await getStore();
  const balances = await loadBalances(user.publicKey);
  let xlmPrice = "0";
  try {
    xlmPrice = await getXlmUsdPrice();
  } catch {
    xlmPrice = "0";
  }
  const activities = await store.listActivity(user.phone, 25);
  const claims = await store.listClaimsBySender(user.phone);
  return {
    user: { phone: user.phone, publicKey: user.publicKey, status: user.status },
    phoneDisplay: formatPhone(user.phone),
    balances: {
      usdc: balances.usdc,
      xlm: balances.xlm,
      xlmPrice,
      totalUsd: xlmPrice === "0" ? trimBalance(balances.usdc) : estimateUsd(balances.usdc, balances.xlm, xlmPrice),
    },
    accountUrl: expertAccount(user.publicKey),
    activities,
    claims: claims.map((claim) => ({
      id: claim.id,
      status: claim.status,
      asset: claim.asset,
      amount: claim.amount,
      recipientPhone: claim.recipientPhone,
      expiresAt: claim.expiresAt,
      txHash: claim.txHash,
      claimTxHash: claim.claimTxHash,
    })),
  };
}

export async function prepareUsdc(): Promise<{ usdc: string; xlm: string; source: string; txHash?: string }> {
  const user = await requireUser();
  const store = await getStore();
  const keypair = keypairFromUser(user);
  await ensureTrustline(keypair);
  let balances = await loadBalances(user.publicKey);
  if (parseUnits(trimBalance(balances.usdc)) >= parseUnits("1")) {
    return { ...balances, source: "balance" };
  }

  const faucet = await requestCircleUsdc(user.publicKey);
  if (faucet.ok) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await sleep(2000);
      balances = await loadBalances(user.publicKey);
      if (parseUnits(trimBalance(balances.usdc)) >= parseUnits("1")) {
        await recordActivity(store, {
          ownerPhone: user.phone,
          kind: "faucet",
          title: "Circle faucet sent test USDC",
          asset: "USDC",
          amount: balances.usdc,
          direction: "in",
        });
        return { ...balances, source: "faucet" };
      }
    }
  }

  const amount = starterXlm();
  const swapped = await executeSwap({ keypair, from: "XLM", to: "USDC", amount });
  await recordActivity(store, {
    ownerPhone: user.phone,
    kind: "swap",
    title: `Swapped ${amount} XLM for about ${swapped.quote.destinationAmount} USDC`,
    asset: "USDC",
    amount: swapped.quote.destinationAmount,
    direction: "in",
    txHash: swapped.hash,
  });
  balances = await loadBalances(user.publicKey);
  return { ...balances, source: "swap", txHash: swapped.hash };
}
