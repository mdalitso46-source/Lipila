"use client";

import { useState } from "react";
import { api } from "@/components/api";
import { fullPhone, PhoneField } from "@/components/phone-field";
import { Shell } from "@/components/shell";
import type { AssetCode } from "@/lib/money";

type Receipt = {
  mode: "payment" | "claimable";
  txHash: string;
  expertUrl: string;
  amount: string;
  asset: AssetCode;
  recipientPhone: string;
  claimUrl?: string;
  smsPreview?: string;
  expiresAt?: string;
};

export default function SendPage() {
  const [national, setNational] = useState("");
  const [amount, setAmount] = useState("5");
  const [asset, setAsset] = useState<AssetCode>("USDC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<Receipt>("/api/send", {
        body: { phone: fullPhone(national), amount, asset },
      });
      setReceipt(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main data-screen="send">
        <p className="eyebrow">Send</p>
        <h1 className="h1" style={{ fontSize: 40, marginTop: 6 }}>
          To a number.
        </h1>
        {receipt ? (
          <section className="slip stack" data-screen="receipt" style={{ marginTop: 18 }}>
            <span className="label">{receipt.mode === "payment" ? "Paid on Stellar" : "Waiting to be claimed"}</span>
            <strong className="h1" style={{ fontSize: 42 }}>
              {receipt.amount} {receipt.asset}
            </strong>
            <p className="note">
              {receipt.mode === "payment"
                ? "They already had a Lipila wallet, so this was a normal payment."
                : "No wallet yet. We created a claimable balance they can take after verifying their number. You can reclaim it after 7 days."}
            </p>
            <a href={receipt.expertUrl}>View on stellar.expert</a>
            {receipt.smsPreview ? <div className="sms">{receipt.smsPreview}</div> : null}
            {receipt.claimUrl ? (
              <button
                className="btn secondary"
                type="button"
                onClick={() => navigator.clipboard.writeText(receipt.claimUrl || "")}
              >
                Copy claim link
              </button>
            ) : null}
            <button className="btn" type="button" onClick={() => setReceipt(null)}>
              Send another
            </button>
          </section>
        ) : (
          <form className="stack" onSubmit={submit} style={{ marginTop: 18 }}>
            <label className="field">
              <span>Amount</span>
              <input className="amount-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <div className="toggle" role="group" aria-label="Asset">
              {(["USDC", "XLM"] as AssetCode[]).map((code) => (
                <button key={code} type="button" aria-pressed={asset === code} onClick={() => setAsset(code)}>
                  {code === "USDC" ? "USDC · $1" : "XLM · moves"}
                </button>
              ))}
            </div>
            <PhoneField value={national} onChange={setNational} label="Their number" />
            <p className="note">
              If they already use Lipila, the money lands in their wallet. If not, Stellar holds a claimable balance until they open the link.
            </p>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Submitting…" : `Send ${asset}`}
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
