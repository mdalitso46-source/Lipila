/**
 * Runs the Stellar testnet flows behind the three deliverables and writes
 * public evidence to evidence/testnet-run.json. Secret keys stay in memory.
 *
 * The sender-reclaim transaction uses a 5-second predicate so it can be
 * submitted in this run. The app itself keeps the 7-day predicate
 * (CLAIM_WINDOW_SECONDS). That 7-day balance is created and claimed by the
 * new recipient; Horizon's predicate is recorded beside it.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Claimant, Keypair, Operation } from "@stellar/stellar-sdk";
import { ANCHOR_HOME_DOMAIN, CLAIM_WINDOW_SECONDS, USDC_ISSUER, expertTx } from "../lib/config";
import {
  fetchSep24Transaction,
  payAnchor,
  startSep24Withdraw,
} from "../lib/stellar/anchor";
import { materializeAndClaim } from "../lib/stellar/wallet";
import { claimBalance, createClaimable, sendPayment } from "../lib/stellar/payments";
import { executeSwap } from "../lib/stellar/swap";
import {
  accountExists,
  balanceIdFromResult,
  ensureTrustline,
  fundWithFriendbot,
  getServer,
  sleep,
  stellarAsset,
  submitSigned,
  txBuilder,
} from "../lib/stellar/server";

type Step = {
  step: string;
  hash?: string | null;
  url?: string | null;
  ok: boolean;
  detail?: string;
  extra?: Record<string, string | number | boolean | null>;
};

const steps: Step[] = [];
const outPath = path.join(process.cwd(), "evidence", "testnet-run.json");

function note(step: Step) {
  steps.push(step);
  const hash = step.hash ? ` ${step.hash}` : "";
  console.log(`${step.ok ? "ok" : "FAIL"} ${step.step}${hash}${step.detail ? ` — ${step.detail}` : ""}`);
}

async function flush(partial: Record<string, unknown>) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify(
      {
        network: "Stellar testnet",
        usdcIssuer: USDC_ISSUER,
        anchor: ANCHOR_HOME_DOMAIN,
        claimWindowSeconds: CLAIM_WINDOW_SECONDS,
        generatedAt: new Date().toISOString(),
        ...partial,
        transactions: steps,
      },
      null,
      2,
    ),
  );
}

async function fund(label: string, keypair: Keypair): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const hash = await fundWithFriendbot(keypair.publicKey());
      for (let check = 0; check < 8 && !(await accountExists(keypair.publicKey())); check += 1) {
        await sleep(800);
      }
      note({ step: `Friendbot funded ${label}`, hash, url: hash ? expertTx(hash) : null, ok: true });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Friendbot failed";
      if (await accountExists(keypair.publicKey())) {
        note({ step: `Friendbot funded ${label}`, ok: true, detail: "Account already existed" });
        return;
      }
      if (attempt === 4) {
        note({ step: `Friendbot funded ${label}`, ok: false, detail: message.slice(0, 180) });
        throw error;
      }
      await sleep(2000 * (attempt + 1));
    }
  }
}

async function predicateOf(balanceId: string): Promise<string> {
  const record = await getServer().claimableBalances().claimableBalance(balanceId).call();
  return JSON.stringify(record.claimants);
}

async function completeAnchorForm(url: string): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const inputs = page.locator("input:not([type='hidden']):not([type='submit'])");
    for (let wait = 0; wait < 20 && (await inputs.count()) === 0; wait += 1) await page.waitForTimeout(500);
    const count = await inputs.count();
    console.log("anchor form", { url: page.url().split("?")[0], inputs: count });
    const values = ["2", "Amina", "Banda", "amina@example.com", "Airtel Money", "+260971112233"];
    for (let index = 0; index < Math.min(count, values.length); index += 1) {
      const field = inputs.nth(index);
      await field.click();
      await field.pressSequentially(values[index], { delay: 12 });
    }
    const submit = page.getByRole("button", { name: /submit/i });
    if (await submit.count()) await submit.first().click();
    else await page.getByText(/^submit$/i).click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "/tmp/anchor-after.png", fullPage: true });
    return (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
  } finally {
    await browser.close();
  }
}

async function runSep24(alice: Keypair): Promise<void> {
  try {
    const started = await startSep24Withdraw({
      keypair: alice,
      asset: "USDC",
      amount: "2",
      provider: "airtel",
      phone: "+260971112233",
    });
    note({
      step: "Started SEP-24 withdrawal at the test anchor",
      ok: true,
      detail: started.type,
      extra: { anchorTxId: started.id, anchor: ANCHOR_HOME_DOMAIN },
    });
    let formNote = "";
    try {
      formNote = await completeAnchorForm(started.url);
    } catch (error) {
      formNote = error instanceof Error ? error.message.slice(0, 220) : "form failed";
    }
    let stellarTxHash: string | null = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await sleep(3000);
      const transaction = await fetchSep24Transaction(alice, started.id);
      if (transaction.status === "pending_user_transfer_start" && !stellarTxHash) {
        stellarTxHash = await payAnchor({ keypair: alice, asset: "USDC", transaction });
        note({
          step: "Paid the SEP-24 anchor the withdrawal amount",
          hash: stellarTxHash,
          url: expertTx(stellarTxHash),
          ok: true,
          extra: { anchorTxId: started.id },
        });
      }
      if (["completed", "pending_anchor", "pending_external", "pending_stellar"].includes(transaction.status) && stellarTxHash) {
        break;
      }
      if (["error", "expired", "refunded"].includes(transaction.status)) break;
    }
    const finalTx = await fetchSep24Transaction(alice, started.id);
    note({
      step: "SEP-24 anchor status after the sandbox withdrawal",
      hash: stellarTxHash,
      url: stellarTxHash ? expertTx(stellarTxHash) : null,
      ok: Boolean(stellarTxHash) || finalTx.status === "completed",
      detail: finalTx.status,
      extra: { anchorTxId: started.id, form: formNote.slice(0, 240) },
    });
  } catch (error) {
    note({
      step: "SEP-24 withdrawal",
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 240) : "SEP-24 failed",
    });
  }
}

async function main() {
  if (process.env.SEP24_ONLY === "1") {
    const alice = Keypair.random();
    console.log("sep24 wallet", alice.publicKey());
    await fund("SEP-24 sender", alice);
    await ensureTrustline(alice);
    const swapped = await executeSwap({ keypair: alice, from: "XLM", to: "USDC", amount: "8" });
    note({
      step: "Swapped 8 XLM for USDC to fund the sandbox cash-out",
      hash: swapped.hash,
      url: expertTx(swapped.hash),
      ok: true,
      detail: `about ${swapped.quote.destinationAmount} USDC`,
    });
    await runSep24(alice);
    const previous = JSON.parse(await readFile(outPath, "utf8")) as { transactions: Step[] };
    previous.transactions = previous.transactions.filter((step) => !step.step.startsWith("SEP-24") && step.step !== "Started SEP-24 withdrawal at the test anchor" && step.step !== "Paid the SEP-24 anchor the withdrawal amount");
    previous.transactions.push(...steps);
    await writeFile(outPath, JSON.stringify({ ...previous, sep24Wallet: alice.publicKey(), generatedAt: new Date().toISOString() }, null, 2));
    const failed = steps.filter((step) => !step.ok);
    if (failed.length) process.exitCode = 1;
    return;
  }

  const alice = Keypair.random();
  const brian = Keypair.random();
  const chipo = Keypair.random();
  const sponsor = Keypair.random();
  const wallets = {
    alice: alice.publicKey(),
    brian: brian.publicKey(),
    chipo: chipo.publicKey(),
    sponsor: sponsor.publicKey(),
  };
  console.log("wallets", wallets);
  await flush({ wallets });

  await fund("Alice", alice);
  await sleep(1200);
  await fund("Brian", brian);
  await sleep(1200);
  await fund("sponsor", sponsor);
  await flush({ wallets });

  const aliceTrust = await ensureTrustline(alice);
  note({ step: "Alice opened a USDC trustline", hash: aliceTrust, url: aliceTrust ? expertTx(aliceTrust) : null, ok: true, detail: aliceTrust ? undefined : "Already open" });
  const brianTrust = await ensureTrustline(brian);
  note({ step: "Brian opened a USDC trustline", hash: brianTrust, url: brianTrust ? expertTx(brianTrust) : null, ok: true, detail: brianTrust ? undefined : "Already open" });

  try {
    const swapped = await executeSwap({ keypair: alice, from: "XLM", to: "USDC", amount: "10" });
    note({
      step: "Swapped 10 XLM for USDC on the testnet DEX",
      hash: swapped.hash,
      url: expertTx(swapped.hash),
      ok: true,
      detail: `about ${swapped.quote.destinationAmount} USDC at ${swapped.quote.rate}`,
    });
  } catch (error) {
    note({
      step: "Swapped 10 XLM for USDC on the testnet DEX",
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 220) : "Swap failed",
    });
  }

  try {
    const hash = await sendPayment({ from: alice, to: brian.publicKey(), asset: "USDC", amount: "1" });
    note({ step: "Paid 1 USDC to an existing account", hash, url: expertTx(hash), ok: true });
  } catch (error) {
    note({
      step: "Paid 1 USDC to an existing account",
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 220) : "Payment failed",
    });
  }

  const xlmHash = await sendPayment({ from: alice, to: brian.publicKey(), asset: "XLM", amount: "2" });
  note({ step: "Paid 2 XLM to an existing account", hash: xlmHash, url: expertTx(xlmHash), ok: true });

  const claim = await createClaimable({
    sender: alice,
    recipientPublicKey: chipo.publicKey(),
    asset: "XLM",
    amount: "3",
  });
  let predicate = "";
  try {
    predicate = await predicateOf(claim.balanceId);
  } catch (error) {
    predicate = error instanceof Error ? error.message.slice(0, 180) : "predicate unread";
  }
  note({
    step: "Created a 7-day claimable balance of 3 XLM for a new account",
    hash: claim.hash,
    url: expertTx(claim.hash),
    ok: true,
    detail: claim.balanceId,
    extra: { balanceId: claim.balanceId, horizonClaimants: predicate },
  });

  const sponsored = await materializeAndClaim({
    sponsor,
    claimant: chipo,
    balanceIds: [claim.balanceId],
  });
  note({
    step: "Sponsored account creation and claim into the new wallet",
    hash: sponsored,
    url: expertTx(sponsored),
    ok: true,
  });

  const short = await submitSigned(async () => {
    const account = await getServer().loadAccount(alice.publicKey());
    return txBuilder(account)
      .addOperation(
        Operation.createClaimableBalance({
          asset: stellarAsset("XLM"),
          amount: "1.0000000",
          claimants: [
            new Claimant(chipo.publicKey(), Claimant.predicateUnconditional()),
            new Claimant(
              alice.publicKey(),
              Claimant.predicateNot(Claimant.predicateBeforeRelativeTime("5")),
            ),
          ],
        }),
      )
      .setTimeout(180)
      .build();
  }, [alice]);
  const shortId = await balanceIdFromResult(short.resultXdr, short.hash);
  note({
    step: "Created a 5-second claimable balance to prove sender reclaim",
    hash: short.hash,
    url: expertTx(short.hash),
    ok: Boolean(shortId),
    detail: "App default remains 604800 seconds. This predicate is only for the evidence run.",
    extra: { balanceId: shortId },
  });
  if (!shortId) throw new Error("Short claimable balance id was missing.");
  await sleep(8000);
  const reclaimed = await claimBalance({ signer: alice, balanceId: shortId });
  note({
    step: "Sender reclaimed the short-window balance",
    hash: reclaimed,
    url: expertTx(reclaimed),
    ok: true,
    detail: "Same claimClaimableBalance operation the 7-day reclaim uses.",
  });

  await runSep24(alice);

  await flush({ wallets, anchor: ANCHOR_HOME_DOMAIN });
  const failed = steps.filter((step) => !step.ok);
  if (failed.length) {
    console.error(`${failed.length} step(s) failed`);
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  note({
    step: "Script stopped",
    ok: false,
    detail: error instanceof Error ? error.message.slice(0, 300) : "failed",
  });
  await flush({});
  process.exitCode = 1;
});
