"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";
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

  return (
    <Shell>
      <main data-screen="cashout">
        <p className="eyebrow">Cash out</p>
        <h1 className="h1" style={{ fontSize: 40, marginTop: 6 }}>
          To mobile money.
        </h1>
        <p className="note">
          Airtel Money and MTN MoMo are the labels. The rails are SEP-24 against the Stellar test anchor at testanchor.stellar.org. Nothing here pays real kwacha.
        </p>
        {flow ? (
          <section className="panel stack" style={{ marginTop: 16 }} data-screen="cashout-status">
            <strong>{flow.providerName}</strong>
            <span className="h1" style={{ fontSize: 36 }}>
              {flow.amount} {flow.asset}
            </span>
            {flow.mode === "demo" ? (
              <>
                <p className="error">Test anchor did not start. This is a labelled demo of the cash-out step.</p>
                <p className="note">{flow.message}</p>
                <ol className="note">
                  {flow.steps?.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <p className="note">Status: {flow.status}</p>
                <p className="note">{flow.detail}</p>
                {flow.interactiveUrl ? (
                  <a href={flow.interactiveUrl} target="_blank" rel="noreferrer">
                    Open the anchor form
                  </a>
                ) : null}
                {flow.expertUrl ? <a href={flow.expertUrl}>Withdrawal payment on stellar.expert</a> : null}
              </>
            )}
            <button className="btn secondary" type="button" onClick={() => setFlow(null)}>
              Start over
            </button>
          </section>
        ) : (
          <form className="stack" onSubmit={submit} style={{ marginTop: 16 }}>
            <div className="providers">
              <button type="button" aria-pressed={provider === "airtel"} onClick={() => setProvider("airtel")}>
                <strong>Airtel Money</strong>
                <div className="note">Zambia</div>
              </button>
              <button type="button" aria-pressed={provider === "mtn"} onClick={() => setProvider("mtn")}>
                <strong>MTN MoMo</strong>
                <div className="note">Zambia</div>
              </button>
            </div>
            <label className="field">
              <span>Amount (1 to 10, test anchor limit)</span>
              <input className="amount-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <div className="toggle" role="group" aria-label="Asset">
              {(["USDC", "XLM"] as AssetCode[]).map((code) => (
                <button key={code} type="button" aria-pressed={asset === code} onClick={() => setAsset(code)}>
                  {code}
                </button>
              ))}
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Talking to the anchor…" : "Start cash out"}
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
