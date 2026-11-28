"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { api } from "@/components/api";
import { grouped } from "@/components/format";
import { SandboxNotice } from "@/components/sandbox";
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
        <div className="page-title">Move money</div>
        <div className="tabs">
          <Link href="/cashout">Cash out</Link>
          <Link href="/swap" aria-current="page">Swap</Link>
        </div>
        <p className="note">Sandbox path payment on the Stellar testnet order book. USDC stays $1. XLM price moves. Not real money.</p>
        {result ? (
          <section className="receipt">
            <SandboxNotice />
            <div className="ring"><Check size={26} /></div>
            <div className="kicker">Sandbox swap</div>
            <h2 className="tnum status-figure">
              {grouped(result.sourceAmount, 2)} {result.from} → {grouped(result.destinationAmount, 2)} {result.to}
            </h2>
            <p className="note">Quoted rate was 1 {result.from} ≈ {result.rate} {result.to}. The explorer shows the amount that landed.</p>
            <div className="stack">
              <a className="btn" href={result.expertUrl}>View on stellar.expert</a>
              <button className="btn secondary" type="button" onClick={() => setResult(null)}>
                Done
              </button>
            </div>
          </section>
        ) : (
          <form className="flow" onSubmit={submit}>
            <div className="send-card">
              <div className="k">You swap</div>
              <input className="amount-input left tnum" inputMode="decimal" aria-label="Amount" value={amount} onChange={(event) => { setAmount(event.target.value); setQuote(null); }} />
              <div className="note">{from}</div>
            </div>
            <div className="get-card">
              <div className="k">You receive about</div>
              <div className="money tnum">{quote ? grouped(quote.destinationDisplay, 2) : "—"} {to}</div>
              <div className="note">{quote ? quote.summary : "Show the testnet rate before you swap."}</div>
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
