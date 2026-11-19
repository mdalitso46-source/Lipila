"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";
import { Shell } from "@/components/shell";
import { expertTx } from "@/lib/config";
import { displayAmount, type AssetCode } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

type Activity = {
  id: string;
  title: string;
  asset: AssetCode;
  amount: string;
  direction: "in" | "out";
  txHash: string | null;
  createdAt: string;
};

type Claim = {
  id: string;
  status: string;
  asset: AssetCode;
  amount: string;
  recipientPhone: string;
  expiresAt: string;
  txHash: string | null;
};

type Home = {
  phoneDisplay: string;
  user: { publicKey: string };
  balances: { usdc: string; xlm: string; xlmPrice: string; totalUsd: string };
  accountUrl: string;
  activities: Activity[];
  claims: Claim[];
};

export default function HomePage() {
  const router = useRouter();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await api<Home>("/api/me");
          if (cancelled) return;
          setHome(data);
          if (Number(data.balances.usdc) >= 1) return;
          setNote("Getting test USDC from the Circle faucet, or the testnet DEX if the faucet is quiet.");
          await api("/api/wallet/prepare", { method: "POST" });
          if (cancelled) return;
          setNote(null);
          setHome(await api<Home>("/api/me"));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load your wallet";
          if (message === "Sign in again.") {
            router.push("/login");
            return;
          }
          if (!cancelled) setError(message);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <Shell>
      <main data-screen="home">
        <p className="eyebrow">Muli bwanji</p>
        <h1 className="h1" style={{ fontSize: 34, margin: "6px 0 0" }}>
          {home ? home.phoneDisplay : "Your wallet"}
        </h1>
        {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}
        {note ? <p className="note" style={{ marginTop: 12 }}>{note}</p> : null}
        <section className="balance-card">
          <div className="label">Estimated value</div>
          <div className="amount">${home ? Number(home.balances.totalUsd).toFixed(2) : "—"}</div>
          <p className="fine">USDC stays $1. XLM follows the testnet DEX{home?.balances.xlmPrice ? ` (1 XLM ≈ $${home.balances.xlmPrice})` : ""}.</p>
        </section>
        <div style={{ marginTop: 8 }}>
          <div className="asset-row">
            <div>
              <strong>USDC</strong>
              <span>Circle testnet dollar</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong>{home ? displayAmount(home.balances.usdc, "USDC") : "…"}</strong>
              <span>USD {home ? displayAmount(home.balances.usdc, "USDC") : ""}</span>
            </div>
          </div>
          <div className="asset-row">
            <div>
              <strong>XLM</strong>
              <span>Lumens</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong>{home ? displayAmount(home.balances.xlm, "XLM") : "…"}</strong>
              <span>{home ? `moves with the market` : ""}</span>
            </div>
          </div>
        </div>
        {home ? (
          <p className="note">
            <a href={home.accountUrl}>Wallet on stellar.expert</a>
          </p>
        ) : null}
        <section style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 16, marginBottom: 0 }}>Activity</h2>
          {home && home.activities.length === 0 ? <p className="note">Payments you send will show up here.</p> : null}
          {home?.activities.map((item) => {
            const href = item.txHash ? expertTx(item.txHash) : undefined;
            const body = (
              <>
                <span>
                  <strong style={{ display: "block", fontWeight: 560 }}>{item.title}</strong>
                  <span className="muted">{new Date(item.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                <strong className={item.direction === "in" ? "in" : "out"}>
                  {item.direction === "in" ? "+" : "−"}
                  {item.amount} {item.asset}
                </strong>
              </>
            );
            return href ? (
              <a className="tx" key={item.id} href={href}>
                {body}
              </a>
            ) : (
              <div className="tx" key={item.id}>
                {body}
              </div>
            );
          })}
        </section>
        {home?.claims.some((claim) => claim.status === "open") ? (
          <section className="panel stack" style={{ marginTop: 16 }}>
            <strong>Waiting to be claimed</strong>
            {home.claims
              .filter((claim) => claim.status === "open")
              .map((claim) => (
                <div key={claim.id}>
                  <div>
                    {claim.amount} {claim.asset} for {formatPhone(claim.recipientPhone)}
                  </div>
                  <p className="note">You can reclaim after {new Date(claim.expiresAt).toLocaleString("en-GB")}.</p>
                  {claim.txHash ? <a href={expertTx(claim.txHash)}>Creation transaction</a> : null}
                </div>
              ))}
          </section>
        ) : null}
      </main>
    </Shell>
  );
}
