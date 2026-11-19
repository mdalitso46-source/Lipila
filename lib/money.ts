import { HttpError } from "./errors";

const SCALE = 10n ** 7n;

export type AssetCode = "USDC" | "XLM";

export function parseUnits(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new HttpError("Enter a valid amount.");
  }
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > 7) {
    throw new HttpError("Use at most 7 decimal places.");
  }
  const fracPadded = `${frac}0000000`.slice(0, 7);
  return BigInt(whole) * SCALE + BigInt(fracPadded);
}

export function formatUnits(units: bigint, displayDecimals = 7): string {
  const negative = units < 0n;
  const value = negative ? -units : units;
  const whole = value / SCALE;
  let frac = (value % SCALE).toString().padStart(7, "0").slice(0, displayDecimals);
  frac = frac.replace(/0+$/, "");
  const text = frac ? `${whole.toString()}.${frac}` : whole.toString();
  return negative ? `-${text}` : text;
}

export function formatStellar(units: bigint): string {
  const negative = units < 0n;
  const value = negative ? -units : units;
  const whole = value / SCALE;
  const frac = (value % SCALE).toString().padStart(7, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

export function toStellarAmount(input: string): string {
  return formatStellar(parseUnits(input));
}

export function displayAmount(input: string, asset: AssetCode): string {
  return formatUnits(parseUnits(trimBalance(input)), asset === "USDC" ? 2 : 4);
}

export function trimBalance(input: string): string {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return "0";
  const [, frac = ""] = trimmed.split(".");
  if (frac.length <= 7) return trimmed;
  return trimmed.slice(0, trimmed.length - (frac.length - 7));
}

export function assertSendAmount(input: string): string {
  const units = parseUnits(input);
  if (units < parseUnits("0.1")) throw new HttpError("Minimum send is 0.1.");
  if (units > parseUnits("100000")) throw new HttpError("That amount is too large for this demo.");
  return formatStellar(units);
}

export function assertCashoutAmount(input: string): string {
  const units = parseUnits(input);
  if (units < parseUnits("1") || units > parseUnits("10")) {
    throw new HttpError("The Stellar test anchor accepts cash-out amounts from 1 to 10.");
  }
  return formatStellar(units);
}

export function applySlippage(amount: string, bps = 150n): string {
  const units = parseUnits(trimBalance(amount));
  const kept = (units * (10000n - bps)) / 10000n;
  if (kept <= 0n) throw new HttpError("Quoted amount is too small.");
  return formatStellar(kept);
}

export function estimateUsd(usdc: string, xlm: string, xlmPrice: string): string {
  const usdUnits =
    parseUnits(trimBalance(usdc)) +
    (parseUnits(trimBalance(xlm)) * parseUnits(trimBalance(xlmPrice))) / SCALE;
  return formatUnits(usdUnits, 2);
}

export function isAssetCode(value: unknown): value is AssetCode {
  return value === "USDC" || value === "XLM";
}
