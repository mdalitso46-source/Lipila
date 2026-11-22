"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Copy } from "lucide-react";
import { api } from "@/components/api";
import { grouped } from "@/components/format";
import { fullPhone, PhoneField } from "@/components/phone-field";
import { SandboxNotice } from "@/components/sandbox";
import { Shell } from "@/components/shell";
import { formatPhone } from "@/lib/phone";
import { displayAmount, type AssetCode } from "@/lib/money";

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

type Activity = { kind?: string; counterparty?: string | null; asset?: AssetCode };

export default function SendPage() {
  const [national, setNational] = useState("");
  const [amount, setAmount] = useState("5");
  const [asset, setAsset] = useState<AssetCode>("USDC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [contacts, setContacts] = useState<string[]>([]);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [available, setAvailable] = useState<string | null>(null);

  useEffect(() => {
    api<{ activities: Activity[]; balances: { usdc: string; xlm: string } }>("/api/me")
      .then((data) => {
        const seen = new Set<string>();
        const list: string[] = [];
        const paid = new Set<string>();
        for (const item of data.activities) {
          if (!item.counterparty) continue;
          if (!seen.has(item.counterparty)) {
            seen.add(item.counterparty);
            list.push(item.counterparty);
          }
          if (item.kind === "send" || item.kind === "receive") paid.add(item.counterparty);
        }
        setContacts(list.slice(0, 6));
        setKnown(paid);
        setAvailable(asset === "USDC" ? data.balances.usdc : data.balances.xlm);
      })
      .catch(() => undefined);
  }, [asset]);

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

  const digits = national.replace(/\D/g, "");
  const ready = digits.length >= 9;
  const phone = ready ? fullPhone(national) : "";
  const registered = phone ? known.has(phone) : false;

  return (
    <Shell>
      <main data-screen="send">
        <div className="subnav">
          <Link className="icon-btn" href="/" aria-label="Back">
            <ChevronLeft size={18} />
          </Link>
          <div className="page-title">Send</div>
          <span className="nav-ghost" style={{ width: 36 }} />
        </div>
        {receipt ? (
          <section className="receipt" data-screen="receipt">
            <div className="ring">
              <Check size={26} />
            </div>
            <SandboxNotice />
            <div className="kicker">{receipt.mode === "payment" ? "Sandbox payment on Stellar" : "Sandbox claim on Stellar"}</div>
            <h2 className="tnum">{grouped(receipt.amount, 2)} {receipt.asset}</h2>
            <p className="note">{receipt.mode === "payment" ? "Instant testnet payment. Not real money." : "Testnet claimable escrow. Not real money."}</p>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="kv"><span>Recipient</span><b className="tnum">{formatPhone(receipt.recipientPhone)}</b></div>
              <div className="kv"><span>Delivery</span><b>{receipt.mode === "payment" ? "Instant" : "Claimable · 7-day escrow"}</b></div>
              {receipt.expiresAt ? (
                <div className="kv"><span>Claim window</span><b>Expires {new Date(receipt.expiresAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</b></div>
              ) : null}
              <div className="kv">
                <span>Stellar tx</span>
                <button
                  className="hash"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(receipt.txHash)}
                >
                  {receipt.txHash.slice(0, 6)}…{receipt.txHash.slice(-4)}
                </button>
              </div>
              <div className="kv"><span>Network fee</span><b>Paid in XLM</b></div>
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              {receipt.mode === "payment"
                ? "They already had a Lipila wallet, so this was a normal payment."
                : "No wallet yet. We created a claimable balance they can take after verifying their number. You can reclaim it after 7 days."}
            </p>
            {receipt.smsPreview ? <div className="demo-code" style={{ textAlign: "left", marginTop: 8 }}>{receipt.smsPreview}</div> : null}
            <div className="stack" style={{ marginTop: 16 }}>
              {receipt.claimUrl ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(receipt.claimUrl || "");
                    setCopied(true);
                  }}
                >
                  <Copy size={16} /> {copied ? "Link copied" : "Share claim link"}
                </button>
              ) : (
                <a className="btn" href={receipt.expertUrl}>View on stellar.expert</a>
              )}
              {receipt.claimUrl ? <a className="fee-row" href={receipt.expertUrl}><span>View on stellar.expert</span></a> : null}
              <button className="btn secondary" type="button" onClick={() => { setReceipt(null); setCopied(false); }}>
                Done
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={submit}>
            {contacts.length ? (
              <>
                <div className="kicker">Recent</div>
                <div className="contacts">
                  {contacts.map((item) => (
                    <button
                      key={item}
                      className="contact"
                      type="button"
                      onClick={() => setNational(item.replace(/^\+260/, ""))}
                    >
                      <i className="tnum">{item.replace(/\D/g, "").slice(-2)}</i>
                      {formatPhone(item).replace("+260 ", "")}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <PhoneField value={national} onChange={setNational} label="" />
            <div style={{ marginTop: 18 }}>
              <input className="amount-input tnum" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Amount" />
              <p className="amount-hint tnum">
                {available ? `of ${grouped(displayAmount(available, asset), 2)} ${asset} available` : "\u00a0"}
              </p>
            </div>
            <div className="seg" role="group" aria-label="Asset">
              {(["USDC", "XLM"] as AssetCode[]).map((code) => (
                <button key={code} type="button" aria-pressed={asset === code} onClick={() => setAsset(code)}>
                  {code}
                </button>
              ))}
            </div>
            {ready ? (
              <div className={registered ? "hint ok" : "hint"}>
                <div>
                  <b>{registered ? "Registered · instant" : "New number · 7-day claim link"}</b>
                  <span className="note">
                    {registered
                      ? "You've paid this number before. If they still have a wallet, it lands immediately."
                      : "They claim it, or it returns to you."}
                  </span>
                </div>
              </div>
            ) : (
              <p className="note">
                If they already use Lipila, the money lands in their wallet. If not, Stellar holds a claimable balance until they open the link.
              </p>
            )}
            <div className="fee-row"><span>Network fee</span><b>Paid in XLM</b></div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" disabled={busy} type="submit" style={{ marginTop: 12 }}>
              {busy ? "Submitting…" : `Send ${asset}`}
            </button>
          </form>
        )}
      </main>
    </Shell>
  );
}
