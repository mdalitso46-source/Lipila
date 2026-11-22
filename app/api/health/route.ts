import { NextResponse } from "next/server";
import { ANCHOR_HOME_DOMAIN, HORIZON_URL } from "@/lib/config";
import { resolveSmsProvider } from "@/lib/sms";

export const dynamic = "force-dynamic";

export function GET() {
  let sms = "demo";
  try {
    const provider = resolveSmsProvider();
    sms = provider === "unconfigured" ? "unconfigured" : provider;
  } catch {
    sms = "invalid";
  }
  const store = process.env.DATABASE_URL?.trim()
    ? "postgres"
    : process.env.NETLIFY_DB_URL?.trim()
      ? "netlify-postgres"
      : process.env.NETLIFY === "true"
        ? "missing"
        : "file";
  return NextResponse.json({
    ok: store !== "missing",
    network: "testnet",
    sandbox: true,
    horizon: HORIZON_URL,
    anchor: ANCHOR_HOME_DOMAIN,
    sms,
    store,
  });
}
