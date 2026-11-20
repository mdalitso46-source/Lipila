"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/api";
import { grouped } from "@/components/format";
import { Shell } from "@/components/shell";
import type { AssetCode } from "@/lib/money";

type Started = {
  mode: "sep24" | "demo";
  id?: string;
  providerName: string;
  asset: AssetCode;
  amount: string;
  status?: string;
  interactiveUrl?: string | null;
  detail?: string | null;
  message?: string;
  steps?: string[];
  expertUrl?: string | null;
  stellarTxHash?: string | null;
  done?: boolean;
};

export default function CashoutPage() {
  const [provider, setProvider] = useState<"airtel" | "mtn">("airtel");
  const [asset, setAsset] = useState<AssetCode>("USDC");
  const [amount, setAmount] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<Started | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    api<{ phoneDisplay: string }>("/api/me").then((data) => setPhone(data.phoneDisplay)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!flow || flow.mode !== "sep24" || !flow.id || flow.done) return;
    const id = flow.id;
    const timer = setInterval(() => {
      api<Started>(`/api/cashout/${id}`, { method: "POST" })
        .then((next) => setFlow({ ...flow, ...next, mode: "sep24" }))
        .catch((err: Error) => setError(err.message));
    }, 6000);
    return () => clearInterval(timer);
  }, [flow]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setFlow(await api<Started>("/api/cashout", { body: { provider, asset, amount } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cash out failed");
    } finally {
      setBusy(false);
    }
  }

  const providerName = provider === "airtel" ? "Airtel Money" : "MTN MoMo";

  return (
    <Shell>
      <main data-screen="cashout">
        <div className="page-title" style={{ marginBottom: 10 }}>Move money</div>
        <div className="tabs">
          <Link href="/cashout" aria-current="page">Cash out</Link>
          <Link href="/swap">Swap</Link>
        </div>
        <p className="note">
          Airtel Money and MTN MoMo are the labels. The rails are SEP-24 against the Stellar test anchor at testanchor.stellar.org. Nothing here pays real kwacha.
        </p>
        {flow ? (
          <section className="card stack" style={{ marginTop: 14, padding: 16 }} data-screen="cashout-status">
            <span className={flow.done ? "tag" : "tag wait"}>{flow.done ? "Completed" : (flow.status || "In progress").replaceAll("_", " ")}</span>
            <strong>{flow.providerName}</strong>
            <span className="tnum" style={{ fontSize: 36, fontWeight: 700 }}>{grouped(flow.amount, 2)} {flow.asset}</span>
            {flow.mode === "demo" ? (
              <>
                <p className="error">Test anchor did not start. This is a labelled demo of the cash-out step.</p>
                <p className="note">{flow.message}</p>
                <ol className="note">
                  {flow.steps?.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </>
            ) : (
              <>
                <p className="note">Status: {flow.status}</p>
                <p className="note">{flow.detail}</p>
                {flow.interactiveUrl ? <a href={flow.interactiveUrl} target="_blank" rel="noreferrer">Open the anchor form</a> : null}
                {flow.expertUrl ? <a href={flow.expertUrl}>Withdrawal payment on stellar.expert</a> : null}
              </>
            )}
            <button className="btn secondary" type="button" onClick={() => setFlow(null)}>Start over</button>
          </section>
        ) : (
          <form onSubmit={submit}>
            <div className="providers" style={{ marginTop: 14 }}>
              <button type="button" aria-pressed={provider === "airtel"} onClick={() => setProvider("airtel")}>
                <div className="mark-a">A</div>
                <strong>Airtel Money</strong>
                <span>{provider === "airtel" ? "Selected" : "Zambia"}</span>
              </button>
              <button type="button" aria-pressed={provider === "mtn"} onClick={() => setProvider("mtn")}>
                <div className="mark-m">M</div>
                <strong>MTN MoMo</strong>
                <span>{provider === "mtn" ? "Selected" : "Zambia"}</span>
              </button>
              <button type="button" disabled aria-disabled="true">
                <div className="mark-z">Z</div>
                <strong>Zamtel</strong>
                <span>Not on this anchor</span>
              </button>
            </div>
            <div className="send-card" style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="k">You send</div>
                <button className="asset-chip" type="button" onClick={() => setAsset(asset === "USDC" ? "XLM" : "USDC")}>{asset}</button>
              </div>
              <input className="amount-input tnum" style={{ textAlign: "left", fontSize: 40 }} inputMode="decimal" aria-label="Amount (1 to 10, test anchor limit)" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="get-card" style={{ marginTop: 10 }}>
              <div className="k">Anchor receives</div>
              <div className="money tnum">{grouped(amount || "0", 2)} {asset}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>To {providerName}{phone ? ` · ${phone}` : ""} · testnet only</div>
            </div>
            <div className="fee-row"><span>Rate</span><b>Set by the test anchor</b></div>
            <div className="fee-row"><span>Network fee</span><b>Paid in XLM</b></div>
            <Link className="banner" href="/swap">
              <div>
                <b>Need to convert first?</b>
                <span>Swap XLM and USDC on the testnet DEX</span>
              </div>
            </Link>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" disabled={busy} type="submit" style={{ marginTop: 12 }}>
              {busy ? "Talking to the anchor…" : `Cash out to ${providerName}`}
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
