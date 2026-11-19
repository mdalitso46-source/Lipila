"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { api } from "@/components/api";
import { Landing } from "@/components/landing";
import { Shell } from "@/components/shell";
import { relativeTime } from "@/components/time";
import { expertTx } from "@/lib/config";
import { displayAmount, type AssetCode } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

type Activity = {
  id: string;
  title: string;
  kind?: string;
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

function ActivityIcon({ kind, direction }: { kind?: string; direction: "in" | "out" }) {
  if (kind === "swap") return <ArrowLeftRight size={16} />;
  if (kind === "cashout") return <Banknote size={16} />;
  if (kind === "trustline") return <ShieldCheck size={16} />;
  if (kind === "fund" || kind === "faucet" || kind === "sponsor") return <Sparkles size={16} />;
  if (direction === "in") return <ArrowDownLeft size={16} />;
  return <ArrowUpRight size={16} />;
}

function money(amount: string, asset: AssetCode) {
  const value = Number(displayAmount(amount, asset));
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pill(kind: string | undefined, direction: "in" | "out") {
  if (kind === "claimable") return { label: "Pending", className: "pill wait" };
  if (kind === "cashout") return { label: "Cash out", className: "pill out" };
  if (kind === "swap") return { label: "Swap", className: "pill neutral" };
  if (direction === "in") return { label: "In", className: "pill in" };
  return { label: "Out", className: "pill out" };
}

export default function HomePage() {
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "signedout">("loading");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await api<Home>("/api/me");
          if (cancelled) return;
          setHome(data);
          setPhase("ready");
          if (Number(data.balances.usdc) >= 1) return;
          setNote("Getting test USDC from the Circle faucet, or the testnet DEX if the faucet is quiet.");
          await api("/api/wallet/prepare", { method: "POST" });
          if (cancelled) return;
          setNote(null);
          setHome(await api<Home>("/api/me"));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load your wallet";
          if (message === "Sign in again.") {
            if (!cancelled) setPhase("signedout");
            return;
          }
          if (!cancelled) {
            setError(message);
            setPhase("ready");
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (phase === "signedout") return <Landing />;

  if (phase === "loading") {
    return (
      <div className="boot" data-screen="home">
        <div className="skel" style={{ width: 120, height: 28 }} />
        <div className="skel" style={{ height: 150, marginTop: 22, borderRadius: 22 }} />
        <div className="skel" style={{ height: 64, marginTop: 12 }} />
        <div className="skel" style={{ height: 64, marginTop: 8 }} />
      </div>
    );
  }

  const xlmUsd =
    home && Number(home.balances.xlmPrice) > 0
      ? (Number(home.balances.xlm) * Number(home.balances.xlmPrice)).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  return (
    <Shell>
      <main data-screen="home" className="rise">
        <p className="kicker">Muli bwanji</p>
        <h1 className="title" style={{ fontSize: 28 }}>
          {home ? home.phoneDisplay : "Your wallet"}
        </h1>
        {error ? <p className="error" style={{ marginTop: 16 }}>{error}</p> : null}
        {note ? <p className="note" style={{ marginTop: 12 }}>{note}</p> : null}
        <section className="balance">
          <div className="label">Estimated value</div>
          <div className="money">${home ? Number(home.balances.totalUsd).toFixed(2) : "—"}</div>
          <p className="note">
            USDC stays $1. XLM follows the testnet DEX
            {home?.balances.xlmPrice ? ` (1 XLM ≈ $${home.balances.xlmPrice})` : ""}.
          </p>
        </section>
        <div className="assets">
          <div className="asset">
            <span className="asset-ico">
              <CircleDollarSign size={18} />
            </span>
            <div>
              <b>USDC</b>
              <span>Circle testnet dollar</span>
            </div>
            <div className="end">
              <b>{home ? money(home.balances.usdc, "USDC") : "…"}</b>
              <span>USD {home ? money(home.balances.usdc, "USDC") : ""}</span>
            </div>
          </div>
          <div className="asset">
            <span className="asset-ico xlm">
              <Sparkles size={18} />
            </span>
            <div>
              <b>XLM</b>
              <span>Lumens</span>
            </div>
            <div className="end">
              <b>{home ? money(home.balances.xlm, "XLM") : "…"}</b>
              <span>{xlmUsd ? `≈ $${xlmUsd}` : "Testnet price"}</span>
            </div>
          </div>
        </div>
        {home ? (
          <a className="link-row" href={home.accountUrl}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <Wallet size={16} /> Wallet on stellar.expert
            </span>
            <ArrowUpRight size={16} />
          </a>
        ) : null}
        <div className="section-h">Activity</div>
        {home && home.activities.length === 0 ? (
          <div className="empty">
            <Wallet size={22} />
            <b>No activity yet</b>
            Payments you send will show up here.
          </div>
        ) : null}
        {home?.activities.map((item) => {
          const href = item.txHash ? expertTx(item.txHash) : undefined;
          const status = pill(item.kind, item.direction);
          const body = (
            <>
              <span className="tx-ico">
                <ActivityIcon kind={item.kind} direction={item.direction} />
              </span>
              <span className="tx-copy">
                <strong>{item.title}</strong>
                <span className="tx-meta">
                  <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString("en-GB")}>
                    {relativeTime(item.createdAt)}
                  </time>
                  <span className={status.className}>{status.label}</span>
                </span>
              </span>
              <strong className={item.direction === "in" ? "tx-amt in" : "tx-amt"}>
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
        {home?.claims.some((claim) => claim.status === "open") ? (
          <section className="card stack" style={{ marginTop: 16 }}>
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
