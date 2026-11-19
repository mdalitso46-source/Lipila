export const USDC_CODE = "USDC";

export const USDC_ISSUER =
  process.env.USDC_ISSUER?.trim() ||
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const HORIZON_URL =
  process.env.HORIZON_URL?.trim() || "https://horizon-testnet.stellar.org";

export const FRIENDBOT_URL =
  process.env.FRIENDBOT_URL?.trim() || "https://friendbot.stellar.org";

export const ANCHOR_HOME_DOMAIN =
  process.env.ANCHOR_HOME_DOMAIN?.trim() || "testanchor.stellar.org";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const CLAIM_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export const EXPERT_TX = "https://stellar.expert/explorer/testnet/tx";
export const EXPERT_ACCOUNT = "https://stellar.expert/explorer/testnet/account";

export function expertTx(hash: string): string {
  return `${EXPERT_TX}/${hash}`;
}

export function expertAccount(publicKey: string): string {
  return `${EXPERT_ACCOUNT}/${publicKey}`;
}

export function demoMode(): boolean {
  return process.env.DEMO_MODE !== "false";
}

export function starterXlm(): string {
  return process.env.STARTER_XLM?.trim() || "20";
}
