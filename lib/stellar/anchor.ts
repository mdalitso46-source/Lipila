import {
  Keypair,
  Memo,
  Operation,
  StellarToml,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { ANCHOR_HOME_DOMAIN, NETWORK_PASSPHRASE, USDC_ISSUER } from "../config";
import { HttpError } from "../errors";
import type { AssetCode } from "../money";
import { toStellarAmount } from "../money";
import { getServer, stellarAsset, submitSigned, txBuilder } from "./server";

type AnchorEndpoints = {
  webAuth: string;
  sep24: string;
};

type AnchorTransaction = {
  id: string;
  status: string;
  amount_in?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  message?: string;
  more_info_url?: string;
};

let endpoints: AnchorEndpoints | null = null;

async function anchorEndpoints(): Promise<AnchorEndpoints> {
  if (endpoints) return endpoints;
  const toml = await StellarToml.Resolver.resolve(ANCHOR_HOME_DOMAIN);
  const webAuth = toml.WEB_AUTH_ENDPOINT;
  const sep24 = toml.TRANSFER_SERVER_SEP0024;
  if (!webAuth || !sep24) {
    throw new HttpError("The test anchor did not publish SEP-10 and SEP-24 endpoints.");
  }
  endpoints = { webAuth, sep24 };
  return endpoints;
}

function assetCode(asset: AssetCode): string {
  return asset === "XLM" ? "native" : "USDC";
}

export async function sep10Token(keypair: Keypair): Promise<string> {
  const { webAuth } = await anchorEndpoints();
  const challengeUrl = new URL(webAuth);
  challengeUrl.searchParams.set("account", keypair.publicKey());
  const challengeResponse = await fetch(challengeUrl);
  const challengeText = await challengeResponse.text();
  if (!challengeResponse.ok) {
    throw new HttpError(`SEP-10 challenge failed: ${challengeText.slice(0, 180)}`);
  }
  const challenge = JSON.parse(challengeText) as { transaction?: string; network_passphrase?: string };
  if (!challenge.transaction) throw new HttpError("SEP-10 challenge did not include a transaction.");
  const tx = TransactionBuilder.fromXDR(
    challenge.transaction,
    challenge.network_passphrase || NETWORK_PASSPHRASE,
  );
  if (!("sign" in tx)) throw new HttpError("SEP-10 challenge was not a transaction.");
  tx.sign(keypair);
  const tokenResponse = await fetch(webAuth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: tx.toXDR() }),
  });
  const tokenText = await tokenResponse.text();
  if (!tokenResponse.ok) throw new HttpError(`SEP-10 auth failed: ${tokenText.slice(0, 180)}`);
  const tokenBody = JSON.parse(tokenText) as { token?: string; error?: string };
  if (!tokenBody.token) throw new HttpError(tokenBody.error || "SEP-10 did not return a token.");
  return tokenBody.token;
}

export async function startSep24Withdraw(input: {
  keypair: Keypair;
  asset: AssetCode;
  amount: string;
  provider: "airtel" | "mtn";
  phone: string;
}): Promise<{ id: string; url: string; type: string }> {
  const { sep24 } = await anchorEndpoints();
  const token = await sep10Token(input.keypair);
  const amount = toStellarAmount(input.amount).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  const response = await fetch(`${sep24.replace(/\/$/, "")}/transactions/withdraw/interactive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset_code: assetCode(input.asset),
      ...(input.asset === "USDC" ? { asset_issuer: USDC_ISSUER } : {}),
      account: input.keypair.publicKey(),
      amount,
      lang: "en",
      wallet_name: "Lipila",
      wallet_url: process.env.APP_URL || "http://localhost:3000",
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new HttpError(`SEP-24 withdraw was rejected: ${text.slice(0, 220)}`);
  }
  const data = JSON.parse(text) as { id?: string; url?: string; type?: string; error?: string };
  if (!data.id || !data.url) {
    throw new HttpError(data.error || "SEP-24 did not return an interactive withdrawal.");
  }
  return { id: data.id, url: data.url, type: data.type || "interactive_customer_info_needed" };
}

export async function fetchSep24Transaction(keypair: Keypair, id: string): Promise<AnchorTransaction> {
  const { sep24 } = await anchorEndpoints();
  const token = await sep10Token(keypair);
  const url = new URL(`${sep24.replace(/\/$/, "")}/transaction`);
  url.searchParams.set("id", id);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  if (!response.ok) throw new HttpError(`Could not read the anchor transaction: ${text.slice(0, 180)}`);
  const data = JSON.parse(text) as { transaction?: AnchorTransaction; error?: string };
  if (!data.transaction) throw new HttpError(data.error || "Anchor transaction was empty.");
  return data.transaction;
}

function anchorMemo(type: string | undefined, value: string | undefined): Memo | null {
  if (!type || type === "none" || !value) return null;
  if (type === "text") return Memo.text(value);
  if (type === "id") return Memo.id(value);
  if (type === "hash") return Memo.hash(value);
  return null;
}

export async function payAnchor(input: {
  keypair: Keypair;
  asset: AssetCode;
  transaction: AnchorTransaction;
}): Promise<string> {
  if (!input.transaction.withdraw_anchor_account) {
    throw new HttpError("The anchor has not provided a deposit account yet. Finish the form first.");
  }
  const amount = input.transaction.amount_in;
  if (!amount) throw new HttpError("The anchor did not specify an amount to send.");
  const horizon = getServer();
  const memo = anchorMemo(input.transaction.withdraw_memo_type, input.transaction.withdraw_memo);
  const submitted = await submitSigned(async () => {
    const account = await horizon.loadAccount(input.keypair.publicKey());
    const builder = txBuilder(account).addOperation(
      Operation.payment({
        destination: input.transaction.withdraw_anchor_account!,
        asset: stellarAsset(input.asset),
        amount: toStellarAmount(amount),
      }),
    );
    if (memo) builder.addMemo(memo);
    return builder.setTimeout(180).build();
  }, [input.keypair]);
  return submitted.hash;
}
