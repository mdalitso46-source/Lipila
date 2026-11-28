"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { api } from "@/components/api";
import { grouped } from "@/components/format";
import { Wordmark } from "@/components/logo";
import { OtpEntry } from "@/components/otp-entry";
import { fullPhone, PhoneField } from "@/components/phone-field";
import { SandboxNotice } from "@/components/sandbox";
import type { AssetCode } from "@/lib/money";

type Claim = {
  amount: string;
  asset: AssetCode;
  status: string;
  senderMasked: string;
  recipientMasked: string;
  recipientPhone: string;
  expiresAt: string;
};

export default function ClaimPage() {
  const params = useParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<Claim>(`/api/claims/${params.id}`)
      .then((data) => {
        setClaim(data);
        if (data.recipientPhone.startsWith("+260")) setNational(data.recipientPhone.slice(4));
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ demoCode?: string }>(`/api/claims/${params.id}/otp`, {
        body: { phone: fullPhone(national) },
      });
      setDemoCode(result.demoCode ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/verify", { body: { phone: fullPhone(national), code } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate" data-screen="claim">
      <Wordmark />
      <SandboxNotice />
      <p className="kicker gate-kicker">Claim · testnet sandbox</p>
      {!claim && !error ? (
        <div aria-busy="true" style={{ marginTop: 18 }}>
          <div className="skel" style={{ height: 48, width: "55%" }} />
          <div className="skel" style={{ height: 14, marginTop: 12 }} />
          <p className="note" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Opening claim…</p>
        </div>
      ) : null}
      {claim ? (
        <>
          <h1 className="display tnum">{grouped(claim.amount, 2)} {claim.asset}</h1>
          <p className="note">
            {claim.senderMasked} sent this to {claim.recipientMasked}. Verify the number and Lipila creates a Stellar wallet with sponsored reserves, then claims the balance.
          </p>
        </>
      ) : null}
      {claim && claim.status !== "open" ? <p className="note">This claim is {claim.status}.</p> : null}
      {done ? (
        <div className="stack" style={{ marginTop: 18 }}>
          <div className="card" style={{ textAlign: "center", padding: 18 }}>
            <div className="ring"><Check size={26} /></div>
            <div className="demo-code" style={{ background: "transparent", boxShadow: "none" }}>
              It&apos;s in your wallet.
              <strong style={{ letterSpacing: "-0.03em", fontSize: 26 }}>Sponsored, then claimed.</strong>
            </div>
          </div>
          <Link className="btn" href="/">Go to Lipila</Link>
        </div>
      ) : claim?.status === "open" ? (
        <form className="stack" onSubmit={sent ? verify : requestCode}>
          <PhoneField value={national} onChange={setNational} label="Your number" />
          <OtpEntry sent={sent} demoCode={demoCode} code={code} onChange={setCode} />
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" disabled={busy} type="submit">
            {busy ? "Creating your wallet…" : sent ? "Claim" : "Show demo code"}
          </button>
        </form>
      ) : error ? (
        <p className="error">{error}</p>
      ) : null}
    </main>
  );
}
