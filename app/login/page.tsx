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
    <main className="auth" data-screen="login">
      <Brand light />
      <p className="eyebrow" style={{ color: "#e7b48a" }}>
        Zambia · Stellar testnet
      </p>
      <h1 style={{ fontSize: 52, margin: "10px 0 8px" }}>Pay with a phone number.</h1>
      <p className="muted" style={{ marginTop: 0, lineHeight: 1.45 }}>
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
              <input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="6 digits" />
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
