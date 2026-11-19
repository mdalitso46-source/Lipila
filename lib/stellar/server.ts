import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  getClaimableBalanceIdFromResult,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { FRIENDBOT_URL, HORIZON_URL, NETWORK_PASSPHRASE, USDC_CODE, USDC_ISSUER } from "../config";
import type { AssetCode } from "../money";

export type BalanceLine = {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
};

let server: Horizon.Server | null = null;

export function getServer(): Horizon.Server {
  if (!server) server = new Horizon.Server(HORIZON_URL);
  return server;
}

export function usdcAsset(): Asset {
  return new Asset(USDC_CODE, USDC_ISSUER);
}

export function stellarAsset(code: AssetCode): Asset {
  return code === "XLM" ? Asset.native() : usdcAsset();
}

export function horizonError(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      response?: {
        data?: {
          detail?: string;
          title?: string;
          extras?: { result_codes?: { transaction?: string; operations?: string[] } };
        };
      };
    };
    const codes = candidate.response?.data?.extras?.result_codes;
    if (codes) {
      const ops = codes.operations?.filter(Boolean).join(", ");
      return [codes.transaction, ops].filter(Boolean).join(" — ") || "Transaction failed";
    }
    if (candidate.response?.data?.detail) return candidate.response.data.detail;
    if (candidate.message) return candidate.message;
  }
  return "Stellar request failed";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitSigned(
  build: () => Promise<Transaction>,
  signers: Keypair[],
): Promise<{ hash: string; resultXdr: string | null }> {
  const horizon = getServer();
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tx = await build();
    tx.sign(...signers);
    try {
      const result = await horizon.submitTransaction(tx);
      return { hash: result.hash, resultXdr: result.result_xdr ?? null };
    } catch (error) {
      last = error;
      const message = horizonError(error);
      const retryable = message.includes("tx_bad_seq") || message.includes("timeout") || message.includes("503");
      if (!retryable || attempt === 2) throw new Error(message);
      await sleep(700 * (attempt + 1));
    }
  }
  throw new Error(horizonError(last));
}

export async function balanceIdFromResult(resultXdr: string | null, hash: string): Promise<string | null> {
  if (resultXdr) {
    try {
      const result = xdr.TransactionResult.fromXDR(resultXdr, "base64");
      return getClaimableBalanceIdFromResult(result, 0);
    } catch {
      // Horizon sometimes needs the effects feed to name the new balance.
    }
  }
  const effects = await getServer().effects().forTransaction(hash).limit(20).call();
  const created = effects.records.find((effect) => effect.type === "claimable_balance_created");
  if (created && "balance_id" in created && typeof created.balance_id === "string") return created.balance_id;
  return null;
}

export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await getServer().loadAccount(publicKey);
    return true;
  } catch {
    return false;
  }
}

export function readBalances(balances: BalanceLine[]): { usdc: string; xlm: string } {
  let usdc = "0";
  let xlm = "0";
  for (const line of balances) {
    if (line.asset_type === "native") xlm = line.balance;
    if (line.asset_code === USDC_CODE && line.asset_issuer === USDC_ISSUER) usdc = line.balance;
  }
  return { usdc, xlm };
}

export async function loadBalances(publicKey: string): Promise<{ usdc: string; xlm: string }> {
  const account = await getServer().loadAccount(publicKey);
  return readBalances(account.balances as BalanceLine[]);
}

export async function fundWithFriendbot(publicKey: string): Promise<string | null> {
  let last = "Friendbot failed";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
    const text = await response.text();
    if (response.ok) {
      try {
        const data = JSON.parse(text) as { hash?: string; transaction_hash?: string };
        return data.hash ?? data.transaction_hash ?? null;
      } catch {
        return null;
      }
    }
    last = text.slice(0, 180);
    if (!text.toLowerCase().includes("rate") && response.status !== 400) break;
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`Friendbot could not fund this wallet. ${last}`);
}

export async function ensureTrustline(keypair: Keypair): Promise<string | null> {
  const horizon = getServer();
  const account = await horizon.loadAccount(keypair.publicKey());
  const has = (account.balances as BalanceLine[]).some(
    (line) => line.asset_code === USDC_CODE && line.asset_issuer === USDC_ISSUER,
  );
  if (has) return null;
  const submitted = await submitSigned(async () => {
    const fresh = await horizon.loadAccount(keypair.publicKey());
    return new TransactionBuilder(fresh, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.changeTrust({ asset: usdcAsset() }))
      .setTimeout(180)
      .build();
  }, [keypair]);
  return submitted.hash;
}

export function txBuilder(account: Horizon.AccountResponse): TransactionBuilder {
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
}
