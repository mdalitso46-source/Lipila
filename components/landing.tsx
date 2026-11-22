import Link from "next/link";
import { SandboxNotice } from "./sandbox";
import { Wordmark } from "./logo";

export function Landing() {
  return (
    <div className="landing" data-screen="landing">
      <Wordmark inverse size={32} />
      <p className="kicker" style={{ marginTop: 28 }}>
        Zambia · Stellar
      </p>
      <h1>
        Send dollars
        <br />
        by phone number,
        <br />
        <em>instantly.</em>
      </h1>
      <p className="lead">
        USDC and XLM to any Zambian mobile number. If they&apos;re new, they claim it from a link — no app required.
      </p>
      <div className="pills">
        <span>0-fee claims</span>
        <span>7-day escrow</span>
        <span>Stellar USDC &amp; XLM</span>
        <span>Testnet sandbox</span>
      </div>
      <SandboxNotice tone="dark" />
      <div className="stage-card" aria-hidden="true">
        <div className="card-back" />
        <div className="balance wallet-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="label">Available balance</div>
            <span className="phone-pill tnum">+260 97 412 8830</span>
          </div>
          <div className="money tnum">$7,121.00</div>
          <p className="s" style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            USDC stays $1 · XLM at market
          </p>
          <div className="splits">
            <div className="split">
              <div className="k">USDC</div>
              <div className="v tnum">$5,840.00</div>
            </div>
            <div className="split">
              <div className="k">XLM</div>
              <div className="v tnum">1,794.62</div>
            </div>
          </div>
        </div>
      </div>
      <Link className="btn light" href="/login">
        Continue with your number
      </Link>
      <p className="signin-line">
        Already have a wallet? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
