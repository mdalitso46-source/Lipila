import Link from "next/link";
import { Brand } from "./brand";

export function Landing() {
  return (
    <div className="landing rise" data-screen="landing">
      <header className="landing-bar">
        <Brand />
        <Link className="btn secondary" href="/login">
          Sign in
        </Link>
      </header>
      <section className="hero">
        <div>
          <p className="kicker">Zambia · Stellar testnet</p>
          <h1 className="display">Pay anyone with a phone number.</h1>
          <p className="lead">
            Lipila sends USDC or lumens. If they already have a wallet, it arrives as a payment. If they don&apos;t, they claim it from a link.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/login">
              Continue with your number
            </Link>
          </div>
          <p className="note">Testnet only. No real kwacha moves.</p>
          <div className="trust" aria-label="Trust">
            <span>Built on Stellar</span>
            <span>Circle testnet USDC</span>
            <span>Keys encrypted at rest</span>
            <span>Demo codes, no SMS</span>
          </div>
        </div>
        <aside className="preview" aria-hidden="true">
          <div className="balance">
            <div className="label">Estimated value</div>
            <div className="money">$128.40</div>
            <p className="note">USDC stays $1. XLM follows the testnet DEX.</p>
          </div>
          <div className="assets" style={{ marginTop: 12 }}>
            <div className="asset">
              <span className="asset-ico">$</span>
              <div>
                <b>USDC</b>
                <span>Circle testnet dollar</span>
              </div>
              <div className="end">
                <b>84.20</b>
                <span>USD 84.20</span>
              </div>
            </div>
            <div className="asset">
              <span className="asset-ico xlm">✧</span>
              <div>
                <b>XLM</b>
                <span>Lumens</span>
              </div>
              <div className="end">
                <b>62.00</b>
                <span>≈ $44.20</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
      <section className="steps" aria-label="How it works">
        <article className="step">
          <em>01</em>
          <h3>Sign in with your number</h3>
          <p>A one-time code opens a custodial Stellar wallet. Friendbot funds the lumens. A USDC trustline is opened for you.</p>
        </article>
        <article className="step">
          <em>02</em>
          <h3>Send USDC or XLM</h3>
          <p>Enter their Zambian mobile number. Existing Lipila wallets get a normal payment. New numbers get a claimable balance.</p>
        </article>
        <article className="step">
          <em>03</em>
          <h3>They claim, or it lands</h3>
          <p>A new receiver verifies the same number. Their account is created with sponsored reserves, then the balance is claimed.</p>
        </article>
      </section>
    </div>
  );
}
