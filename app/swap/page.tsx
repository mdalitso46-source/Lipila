"use client";

import { useState } from "react";
import { api } from "@/components/api";
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
        <p className="eyebrow">Swap</p>
        <h1 className="h1" style={{ fontSize: 40, marginTop: 6 }}>
          One tap on the DEX.
        </h1>
        <p className="note">Path payments on the Stellar testnet order book. USDC stays $1. XLM price moves.</p>
        {result ? (
          <section className="panel stack" style={{ marginTop: 16 }}>
            <strong className="h1" style={{ fontSize: 36 }}>
              {result.sourceAmount} {result.from} → {result.destinationAmount} {result.to}
            </strong>
            <p className="note">Quoted rate was 1 {result.from} ≈ {result.rate} {result.to}. The explorer shows the amount that landed.</p>
            <a href={result.expertUrl}>View on stellar.expert</a>
            <button className="btn secondary" type="button" onClick={() => setResult(null)}>
              Swap again
            </button>
          </section>
        ) : (
          <form className="stack" onSubmit={submit} style={{ marginTop: 16 }}>
            <div className="panel">
              <span className="label">From {from}</span>
              <input className="amount-input" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setQuote(null); }} />
            </div>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setFrom(to);
                setQuote(null);
                setResult(null);
              }}
            >
              Flip to {to} → {from}
            </button>
            <div className="panel">
              <span className="label">To {to}</span>
              <strong className="h1" style={{ fontSize: 36 }}>{quote ? quote.destinationDisplay : "—"}</strong>
              <p className="note">{quote ? quote.summary : "Get a quote before you swap."}</p>
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn secondary" type="button" onClick={() => refreshQuote()}>
              Show rate
            </button>
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Swapping…" : `Swap ${from} for ${to}`}
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
