"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUp, Banknote, Clock } from "lucide-react";
import { api } from "@/components/api";
import { grouped, usd } from "@/components/format";
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
  counterparty?: string | null;
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
  user: { publicKey: string; phone?: string };
  balances: { usdc: string; xlm: string; xlmPrice: string; totalUsd: string };
  accountUrl: string;
  activities: Activity[];
  claims: Claim[];
};

function tagFor(kind: string | undefined, direction: "in" | "out") {
  if (kind === "claimable") return { label: "Claimable", className: "tag wait", av: "av wait" };
  if (kind === "cashout") return { label: "Cash out", className: "tag out", av: "av out" };
  if (kind === "swap") return { label: "Swap", className: "tag", av: "av" };
  if (direction === "in") return { label: "In", className: "tag", av: "av" };
  return { label: "Sent", className: "tag", av: "av" };
}

function initials(phone?: string | null) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.slice(-2) || "•";
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
      <div className="boot" data-screen="home" style={{ width: "min(430px, 100%)", minHeight: "100dvh", padding: 22, background: "#f7f8f6" }}>
        <div className="skel" style={{ width: 140, height: 28 }} />
        <div className="skel" style={{ height: 168, marginTop: 18, borderRadius: 26 }} />
        <div className="skel" style={{ height: 64, marginTop: 16 }} />
      </div>
    );
  }

  const open = home?.claims.filter((claim) => claim.status === "open") ?? [];
  const xlmUsd = home && Number(home.balances.xlmPrice) > 0 ? Number(home.balances.xlm) * Number(home.balances.xlmPrice) : null;

  return (
    <Shell>
      <main data-screen="home">
        <header className="home-head">
          <div>
            <div className="hello">Muli bwanji</div>
            <b>Your wallet</b>
          </div>
          <span className="avatar tnum">{initials(home?.user.phone || home?.phoneDisplay)}</span>
        </header>
        {error ? <p className="error">{error}</p> : null}
        {note ? <p className="note">{note}</p> : null}
        <section className="balance">
          <span className="arc" />
          <span className="arc2" />
          <div className="label">Total balance</div>
          <div className="money tnum">{home ? usd(home.balances.totalUsd) : "—"}</div>
          {home ? (
            <span className="phone-pill tnum">
              <span className="live" />
              {home.phoneDisplay}
            </span>
          ) : null}
          <div className="splits">
            <div className="split">
              <div className="k">USDC</div>
              <div className="v tnum">{home ? usd(displayAmount(home.balances.usdc, "USDC")) : "…"}</div>
            </div>
            <div className="split">
              <div className="k">XLM{xlmUsd != null ? ` · ${usd(xlmUsd)}` : ""}</div>
              <div className="v tnum">{home ? grouped(displayAmount(home.balances.xlm, "XLM"), 2) : "…"}</div>
            </div>
          </div>
        </section>
        <div className="actions">
          <Link className="act" href="/send">
            <i><ArrowUp size={20} /></i>
            Send
          </Link>
          <a className="act claim" href="#pending">
            <i><ArrowDownLeft size={20} /></i>
            Claim
            {open.length ? <span className="badge">{open.length}</span> : null}
          </a>
          <Link className="act" href="/swap">
            <i><ArrowLeftRight size={20} /></i>
            Swap
          </Link>
          <Link className="act" href="/cashout">
            <i><Banknote size={20} /></i>
            Cash out
          </Link>
        </div>
        {open.length ? (
          <a className="banner" id="pending" href={open[0].txHash ? expertTx(open[0].txHash) : "#pending"}>
            <Clock size={18} color="#C86D3B" />
            <div>
              <b>
                {open.length} payment{open.length === 1 ? "" : "s"} waiting to be claimed
              </b>
              <span>
                {formatPhone(open[0].recipientPhone)} · until {new Date(open[0].expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </div>
            <strong className="tnum">{grouped(open[0].amount, 2)} {open[0].asset}</strong>
          </a>
        ) : (
          <div id="pending" />
        )}
        <div className="section-h">Activity</div>
        {home && home.activities.length === 0 ? <div className="empty">Payments you send will show up here.</div> : null}
        {home?.activities.map((item) => {
          const href = item.txHash ? expertTx(item.txHash) : undefined;
          const tag = tagFor(item.kind, item.direction);
          const body = (
            <>
              <span className={tag.av}>{initials(item.counterparty)}</span>
              <span className="tx-copy">
                <strong>{item.title}</strong>
                <em>
                  <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                  <span className={tag.className}>{tag.label}</span>
                </em>
              </span>
              <span className={item.direction === "in" ? "tx-amt in tnum" : "tx-amt tnum"}>
                {item.direction === "in" ? "+" : "−"}
                {grouped(item.amount, 2)}
                <small>{item.asset}</small>
              </span>
            </>
          );
          return href ? (
            <a className="tx" key={item.id} href={href}>{body}</a>
          ) : (
            <div className="tx" key={item.id}>{body}</div>
          );
        })}
        {home ? (
          <a className="fee-row" href={home.accountUrl}>
            <span>Wallet on stellar.expert</span>
            <span>View</span>
          </a>
        ) : null}
      </main>
    </Shell>
  );
}
