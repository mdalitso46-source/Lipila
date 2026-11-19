"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";
import { Brand } from "@/components/brand";
import { fullPhone, PhoneField } from "@/components/phone-field";

export default function LoginPage() {
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ phone: string; demoCode?: string }>("/api/auth/request", {
        body: { phone: fullPhone(national) },
      });
      setDemoCode(result.demoCode ?? null);
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
    <main className="gate rise" data-screen="login">
      <Brand />
      <p className="kicker" style={{ marginTop: 28 }}>
        Zambia · Stellar testnet
      </p>
      <h1 className="display" style={{ fontSize: 44, marginTop: 8 }}>
        Pay with a phone number.
      </h1>
      <p className="lead">
        Lipila sends USDC or lumens to any Zambian mobile number. New numbers get a claim link. No app install on the other side.
      </p>
      <form className="stack" onSubmit={demoCode ? verify : requestCode} style={{ marginTop: 22 }}>
        <PhoneField value={national} onChange={setNational} />
        {demoCode ? (
          <>
            <div className="demo-code">
              Demo mode, no SMS. Your code is
              <strong>{demoCode}</strong>
            </div>
            <label className="field">
              <span>One-time code</span>
              <input className="code-input" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="6 digits" />
            </label>
          </>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button className="btn copper" disabled={busy} type="submit">
          {busy ? "Working on Stellar…" : demoCode ? "Open my wallet" : "Text me a code"}
        </button>
      </form>
    </main>
  );
}
