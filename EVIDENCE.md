# Evidence for the Instawards statement of work

Network: Stellar testnet. Passphrase `Test SDF Network ; September 2015`. Nothing here is mainnet or real kwacha. Every money screen shows **Testnet sandbox · not real money**.

Fresh hashes from this run are in [`evidence/testnet-run.json`](evidence/testnet-run.json). Each one below was read back from Horizon with `successful: true`. Older hashes from the first demo remain in [`evidence/transactions.json`](evidence/transactions.json).

## Deliverable 1 — phone sign-in, payments, claims, keys, 7-day reclaim

| What | Evidence |
| --- | --- |
| Zambian `+260` only | `tests/phone.test.ts`. The sign-in field is prefixed `+260`. |
| SMS sign-in | Demonstrated in demo mode. The sign-in screen says the code is shown here and that live SMS arrives in phase 2. The code sits in a Demo SMS preview card, marked “Not a real message”. `SMS_PROVIDER=demo` is the hosted default and needs no SMS account. Africa's Talking and Twilio remain behind the env switch for phase 2. Tests mock those HTTP calls and assert the provider secret and the code are not in the error. A production process with `DEMO_MODE=true` and `SMS_PROVIDER=demo` still encrypts wallets when `WALLET_ENCRYPTION_KEY` and `SESSION_SECRET` are set, and still refuses to encrypt when they are missing. |
| Keys encrypted at rest | AES-256-GCM in `lib/crypto.ts`. API profiles go through `publicUser`, which omits `encryptedSecret`. `tests/secrets.test.ts` redacts a Stellar secret from errors. |
| Pay an existing account | [1 USDC](https://stellar.expert/explorer/testnet/tx/a565b506cc540a6c090f38fbbf509f2dafd6326e22d1cd8d6de2e1e3d757743a) and [2 XLM](https://stellar.expert/explorer/testnet/tx/9d6248ea3cc55f7bf1eeb286ebd15b70b0171982f45e7aa5b0de01423b9627a4) |
| Claimable balance for a new number, 7-day sender predicate | [Create 3 XLM](https://stellar.expert/explorer/testnet/tx/67bea2086c06a7f528164c97bcdf2c03b850ab4b76f054aff3ace53a6538856b). Horizon recorded the sender predicate as `not.abs_before = 2026-11-28T20:38:11Z`, seven days after creation. |
| Sponsored create + claim | [Sponsor, trustline, claim, 3 XLM fee top-up](https://stellar.expert/explorer/testnet/tx/06e7829f4fd0b265dab60271392bd69d278e328e006ca9f73dad72acfb77bbf4) |
| Sender reclaim | The app refuses reclaim until `expiresAt` (7 days). `CLAIM_WINDOW_SECONDS` is `604800`, locked by `tests/secrets.test.ts`. A second balance used a 5-second predicate only so the same `claimClaimableBalance` operation could be submitted in this run: [reclaim](https://stellar.expert/explorer/testnet/tx/06d9bb9649c8c7d21967209f476a3371f53a156585e1f7ad3475ccf582039ca2). The 7-day balance was claimed by the new wallet instead, which is the normal path. |
| App UI, not just the script | Signed in as `+260 97 555 0191` (demo code on screen), then sent 1 XLM to `+260 96 555 0192`. [Claimable balance](https://stellar.expert/explorer/testnet/tx/01e8ce62d775ecee3646dbf60edacde2df8b6d4909ef41503d7e4ac3df61a658). The receipt says the escrow expires 28 Nov 2026. Home shows “Reclaim after 28 Nov” and does not offer the button yet. Same session also swapped 20 XLM: [swap](https://stellar.expert/explorer/testnet/tx/88e9054f63daa47068f7cf0e44f0834a2309b99a57caf287467ecda55baa092a). |

Screens: [`evidence/29-demo-sms.png`](evidence/29-demo-sms.png) (Demo SMS card), [`evidence/22-login-sandbox.png`](evidence/22-login-sandbox.png), [`evidence/24-claim-receipt.png`](evidence/24-claim-receipt.png), [`evidence/23-claim-waiting.png`](evidence/23-claim-waiting.png).

## Deliverable 2 — swap and SEP-24 cash-out

| What | Evidence |
| --- | --- |
| XLM → USDC path payment | [10 XLM → about 7.06 USDC](https://stellar.expert/explorer/testnet/tx/a9c53d622ab3721a81f2f28d4756b8b6938474dac49a49cea8304dac5c01fc3e) at 0.7062. The in-app swap of 20 XLM is the hash in Deliverable 1. |
| Anchor is config | `ANCHOR_HOME_DOMAIN` defaults to `testanchor.stellar.org`. A Zambian anchor replaces that value. The cash-out copy names Airtel Money and MTN MoMo as labels and says the anchor does not pay kwacha. |
| SEP-24 withdrawal | Anchor transaction `2dd6ae6a-9a60-4cd2-982b-bbabb1247bba`. Interactive KYC was submitted on the reference UI (amount 2, Airtel Money, `+260971112233`). Lipila then paid the anchor **2 USDC**: [payment](https://stellar.expert/explorer/testnet/tx/0f1dc8ced182aa84125d3806127f3c31cfe5f60d273e396ba374daa50b0cf162). Horizon: successful, memo id `1030112658779888827`, destination `GBN4NNCDGJO4XW4KQU3CBIESUJWFVBUZPOKUZHT7W7WRB7CWOA7BXVQF`. The anchor’s own status when polling stopped was `pending_anchor` (it had the funds; its test fee schedule showed 0.2 USDC, receive 1.8 USD). It did not pay a real mobile-money wallet. |
| History | Swaps, payments, claims, and cash-outs are activity rows. Each on-chain row links to stellar.expert and is tagged **Sandbox**. |
| Tests | Swap quoting and slippage live in `lib/stellar/swap.ts` and `lib/money.ts` (`tests/money.test.ts`). The cash-out service records the anchor id. A live anchor call is not mocked in unit tests; the hash above is the live proof. |

Screens: [`evidence/27-swap-sandbox.png`](evidence/27-swap-sandbox.png), [`evidence/26-cashout-sandbox.png`](evidence/26-cashout-sandbox.png).

## Deliverable 3 — deploy config, Postgres, SMS, pilot feedback

| What | Evidence |
| --- | --- |
| Host config | [`netlify.toml`](netlify.toml) builds Next.js, sets Node 22, and sends security headers including HSTS. Secrets are not in that file. |
| Postgres | `DATABASE_URL` (Supabase session pooler or any Postgres) migrates every file in `netlify/database/migrations` on startup, including `20261121183000_feedback`. `NETLIFY_DB_URL` is applied by Netlify’s own migration runner (`autoMigrate: false`). TLS is turned on when the URL asks for it or the host is Supabase. |
| SMS | This sprint uses demo mode. The hosted default is `SMS_PROVIDER=demo` and `DEMO_MODE=true`, including in a production build, with no SMS credentials. Live delivery is phase 2. The Africa's Talking and Twilio functions stay in `lib/sms/index.ts` and are covered by mocked tests. |
| Pilot feedback | `POST /api/feedback` stores a signed-in note. `tests/store.test.ts` writes one note for each of five phone numbers. The browser walkthrough saved a real note for `+260 97 555 0191` (“Sending to a new number was clear…”) in the local file store. Screenshot: [`evidence/25-feedback.png`](evidence/25-feedback.png). |
| Demo recording | Checklist for a 2–3 minute video: [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md). |
| Health | `GET /api/health` reports `network: testnet`, the SMS provider name, and whether Postgres is configured. It does not return secrets. |

## Tests

`npm test` — 7 files, 26 tests, all passing (phone, money, crypto, claims, store including five feedback notes, SMS providers, secret redaction).

## What is mocked or still needs the owner

| Credential | Where | Until it is set |
| --- | --- | --- |
| Africa's Talking or Twilio credentials | Phase 2. Not required to run or host the demo. | Live SMS. Demo mode shows the code in the preview card. |
| `WALLET_ENCRYPTION_KEY`, `SESSION_SECRET` | Host env | Still required in production when `DEMO_MODE=true` and `SMS_PROVIDER=demo`. Local `next dev` derives a throwaway key only when `NODE_ENV` is not production and `NETLIFY` is not set. |
| `DATABASE_URL` or Netlify Database | Host env | Local demo uses gitignored `.data/lipila.json`. A public pilot needs Postgres so five testers share one database. |
| `APP_URL` | Host env | Claim links and the SEP-24 `wallet_url` use the request host locally. |
| `ANCHOR_HOME_DOMAIN` for a Zambian SEP-24 anchor | Host env | Cash-out stops at `testanchor.stellar.org`. It does not pay Airtel Money or MTN MoMo. |
| A public host | Netlify (already configured) or any Node host | The app is ready to deploy. This environment has no Netlify or Supabase credentials, so it was not published. |

Out of scope, and not built: mainnet, real kwacha, non-custodial wallets, custom contracts, numbers outside Zambia. Live SMS delivery is phase 2.
