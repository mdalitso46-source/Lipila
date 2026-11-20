"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { api } from "@/components/api";
import { grouped } from "@/components/format";
import { Shell } from "@/components/shell";
import type { AssetCode } from "@/lib/money";

type Quote = {
  summary: string;
  destinationDisplay: string;
  rate: string;
};

type Result = {
  expertUrl: string;
  sourceAmount: string;
  destinationAmount: string;
  from: AssetCode;
  to: AssetCode;
  rate: string;
};

export default function SwapPage() {
  const [from, setFrom] = useState<AssetCode>("XLM");
  const [amount, setAmount] = useState("10");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const to: AssetCode = from === "XLM" ? "USDC" : "XLM";

  async function refreshQuote(nextFrom = from, nextAmount = amount) {
    setError(null);
    const nextTo: AssetCode = nextFrom === "XLM" ? "USDC" : "XLM";
    try {
      const quoted = await api<Quote>("/api/swap/quote", {
        body: { from: nextFrom, to: nextTo, amount: nextAmount },
      });
      setQuote(quoted);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : "No quote");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const swapped = await api<Result>("/api/swap", { body: { from, to, amount } });
      setResult(swapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main data-screen="swap">
        <div className="page-title" style={{ marginBottom: 10 }}>Move money</div>
        <div className="tabs">
          <Link href="/cashout">Cash out</Link>
          <Link href="/swap" aria-current="page">Swap</Link>
        </div>
        <p className="note">Path payments on the Stellar testnet order book. USDC stays $1. XLM price moves.</p>
        {result ? (
          <section className="receipt">
            <div className="ring"><Check size={26} /></div>
            <div className="kicker">Swapped</div>
            <h2 className="tnum" style={{ fontSize: 28 }}>
              {grouped(result.sourceAmount, 2)} {result.from} → {grouped(result.destinationAmount, 2)} {result.to}
            </h2>
            <p className="note">Quoted rate was 1 {result.from} ≈ {result.rate} {result.to}. The explorer shows the amount that landed.</p>
            <a className="btn" href={result.expertUrl} style={{ marginTop: 12 }}>View on stellar.expert</a>
            <button className="btn secondary" type="button" style={{ marginTop: 8 }} onClick={() => setResult(null)}>
              Done
            </button>
          </section>
        ) : (
          <form onSubmit={submit}>
            <div className="send-card" style={{ marginTop: 12 }}>
              <div className="k">You swap</div>
              <input className="amount-input tnum" style={{ textAlign: "left", fontSize: 40 }} inputMode="decimal" aria-label="Amount" value={amount} onChange={(event) => { setAmount(event.target.value); setQuote(null); }} />
              <div className="note">{from}</div>
            </div>
            <div className="get-card" style={{ marginTop: 10 }}>
              <div className="k">You receive about</div>
              <div className="money tnum">{quote ? grouped(quote.destinationDisplay, 2) : "—"} {to}</div>
              <div className="note" style={{ color: "rgba(247,248,246,.7)" }}>{quote ? quote.summary : "Show the testnet rate before you swap."}</div>
            </div>
            <div className="fee-row"><span>Network fee</span><b>Paid in XLM</b></div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn secondary" type="button" onClick={() => { setFrom(to); setQuote(null); }}>
              Flip to {to} → {from}
            </button>
            <button className="btn secondary" type="button" onClick={() => refreshQuote()}>Show rate</button>
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Swapping…" : `Swap ${from} for ${to}`}
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
