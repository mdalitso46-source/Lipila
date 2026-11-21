import { ANCHOR_HOME_DOMAIN, expertTx } from "../config";
import { createId } from "../crypto";
import { HttpError } from "../errors";
import { assertCashoutAmount, displayAmount, isAssetCode } from "../money";
import { formatPhone } from "../phone";
import { getStore } from "../store";
import type { CashoutProvider } from "../store/types";
import { fetchSep24Transaction, payAnchor, startSep24Withdraw } from "../stellar/anchor";
import { keypairFromUser } from "../stellar/wallet";
import { recordActivity } from "./activity";
import { requireUser } from "./session";

const PROVIDERS = new Set<CashoutProvider>(["airtel", "mtn"]);

function providerName(provider: CashoutProvider): string {
  return provider === "airtel" ? "Airtel Money" : "MTN MoMo";
}

export async function startCashout(input: { provider?: string; asset?: string; amount?: string }) {
  const user = await requireUser();
  if (!PROVIDERS.has(input.provider as CashoutProvider)) throw new HttpError("Choose Airtel Money or MTN MoMo.");
  if (!isAssetCode(input.asset)) throw new HttpError("Choose USDC or XLM.");
  const provider = input.provider as CashoutProvider;
  const amount = assertCashoutAmount(input.amount || "");
  const shown = displayAmount(amount, input.asset);
  let started: { id: string; url: string; type: string };
  try {
    started = await startSep24Withdraw({
      keypair: keypairFromUser(user),
      asset: input.asset,
      amount,
      provider,
      phone: user.phone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anchor request failed";
    return {
      mode: "demo" as const,
      provider,
      providerName: providerName(provider),
      asset: input.asset,
      amount: shown,
      phone: formatPhone(user.phone),
      anchorDomain: ANCHOR_HOME_DOMAIN,
      message,
      steps: [
        `SEP-10: Lipila signs a challenge from ${ANCHOR_HOME_DOMAIN} with your custodial key.`,
        "SEP-24: Lipila opens an interactive withdrawal for USDC or XLM.",
        "You confirm the mobile-money details on the anchor.",
        "The anchor returns a Stellar account and memo. Lipila pays it from your wallet.",
        "The anchor marks the withdrawal complete. On testnet this does not pay real kwacha.",
      ],
    };
  }

  const store = await getStore();
  const cashout = await store.insertCashout({
    id: createId(),
    phone: user.phone,
    asset: input.asset,
    amount: shown,
    provider,
    anchorTxId: started.id,
    status: started.type,
    interactiveUrl: started.url,
    stellarTxHash: null,
    detail: "Finish the test anchor form. Lipila will send the on-chain payment when the anchor asks for it.",
    createdAt: new Date().toISOString(),
  });
  return {
    mode: "sep24" as const,
    id: cashout.id,
    provider,
    providerName: providerName(provider),
    asset: input.asset,
    amount: shown,
    status: cashout.status,
    interactiveUrl: started.url,
    anchorTxId: started.id,
    detail: cashout.detail,
    anchorDomain: ANCHOR_HOME_DOMAIN,
    sandbox: true,
  };
}

const DONE = new Set(["completed", "error", "expired", "refunded", "no_market", "too_small", "too_large"]);

export async function refreshCashout(id: string) {
  const user = await requireUser();
  const store = await getStore();
  const cashout = await store.getCashout(id);
  if (!cashout || cashout.phone !== user.phone) throw new HttpError("Cash-out not found.", 404);
  if (!cashout.anchorTxId) throw new HttpError("This cash-out never reached the anchor.");

  const keypair = keypairFromUser(user);
  const transaction = await fetchSep24Transaction(keypair, cashout.anchorTxId);
  let stellarTxHash = cashout.stellarTxHash;
  let detail = transaction.message || cashout.detail;

  if (transaction.status === "pending_user_transfer_start" && !stellarTxHash) {
    stellarTxHash = await payAnchor({ keypair, asset: cashout.asset, transaction });
    detail = "Lipila sent the withdrawal payment to the test anchor.";
    await recordActivity(store, {
      ownerPhone: user.phone,
      kind: "cashout",
      title: `Cashed out ${cashout.amount} ${cashout.asset} toward ${providerName(cashout.provider)}`,
      asset: cashout.asset,
      amount: cashout.amount,
      direction: "out",
      txHash: stellarTxHash,
    });
  }

  await store.updateCashout(id, {
    status: transaction.status,
    stellarTxHash,
    detail,
  });

  return {
    id,
    mode: "sep24" as const,
    status: transaction.status,
    done: DONE.has(transaction.status),
    interactiveUrl: cashout.interactiveUrl,
    stellarTxHash,
    expertUrl: stellarTxHash ? expertTx(stellarTxHash) : null,
    detail,
    moreInfoUrl: transaction.more_info_url || null,
    providerName: providerName(cashout.provider),
    amount: cashout.amount,
    asset: cashout.asset,
    anchorDomain: ANCHOR_HOME_DOMAIN,
    sandbox: true,
  };
}
