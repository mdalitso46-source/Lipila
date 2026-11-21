"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";
import { Wordmark } from "@/components/logo";
import { OtpEntry } from "@/components/otp-entry";
import { fullPhone, PhoneField } from "@/components/phone-field";
import { SandboxNotice } from "@/components/sandbox";

export default function LoginPage() {
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ phone: string; demoCode?: string; delivery?: string }>("/api/auth/request", {
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
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <main className="gate" data-screen="login">
      <Wordmark />
      <SandboxNotice />
      <p className="kicker" style={{ color: "#c86d3b", marginTop: 28 }}>
        Zambia · Stellar testnet
      </p>
      <h1 className="display">Pay with a phone number.</h1>
      <p className="note">
        Lipila sends USDC or lumens to any Zambian mobile number. New numbers get a claim link. No app install on the other side.
      </p>
      <form className="stack" onSubmit={sent ? verify : requestCode} style={{ marginTop: 22 }}>
        <PhoneField value={national} onChange={setNational} />
        <OtpEntry sent={sent} demoCode={demoCode} code={code} onChange={setCode} />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Working on Stellar…" : sent ? "Open my wallet" : "Text me a code"}
        </button>
        {sent ? (
          <button
            className="btn secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setDemoCode(null);
              setCode("");
            }}
          >
            Send a new code
          </button>
        ) : null}
      </form>
    </main>
  );
}
