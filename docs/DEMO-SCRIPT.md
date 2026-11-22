# Lipila demo script (2–3 minutes)

Record on Stellar testnet. Say out loud that every payment is sandbox money, not kwacha. Keep the eagle logo and the “Testnet sandbox · not real money” label in frame.

Before you start:

- [ ] `SMS_PROVIDER=demo` and `DEMO_MODE=true`. The code appears on screen. Live SMS is phase 2, so no Africa's Talking or Twilio account is needed.
- [ ] `WALLET_ENCRYPTION_KEY` and `SESSION_SECRET` are set in the host, not in the repo.
- [ ] Two Zambian numbers ready: one that already signed in, one that has not.
- [ ] The signed-in wallet holds a little test USDC and test XLM (Friendbot plus the starter swap).

| Time | Do this | Say this |
| --- | --- | --- |
| 0:00 | Landing page. Point at the eagle and “Testnet sandbox”. | Lipila sends USDC or lumens to a Zambian phone number. This is Stellar testnet. |
| 0:20 | Sign in with `+260`. Point at the Demo SMS card and read the code from it. | This is a demo preview, not a text message. Live SMS delivery arrives in phase 2. The wallet key stays on the server, encrypted. |
| 0:40 | Home. Show USDC, XLM, and Activity. | Balances are test assets. Each row links to stellar.expert. |
| 1:00 | Send a small amount to the number that already has a wallet. Open the receipt and the expert link. | An existing user gets a normal Stellar payment. |
| 1:25 | Send to the new number. Show the claim link and the 7-day note. | A new number gets a claimable balance. The sender can take it back after 7 days. |
| 1:45 | Open the claim link, enter that number and the code. Land on the new wallet. | The sponsor creates the account. They do not need lumens to exist. |
| 2:10 | Swap a little XLM for USDC. Show the testnet rate and the expert link. | The swap is a path payment on the testnet order book. |
| 2:30 | Cash out toward Airtel Money or MTN MoMo. Show the sandbox label and the test-anchor form. | This is SEP-24. The test anchor stands in for a Zambian mobile-money partner. It does not pay real kwacha. |
| 2:50 | Open Pilot feedback and save one note. | Pilot notes stay in the database for the five testers. |

Checklist after the recording:

- [ ] Sign-in, payment, claim, swap, and cash-out are each on screen.
- [ ] Every money screen shows the sandbox label.
- [ ] At least one stellar.expert testnet transaction is visible.
- [ ] The video is between 2 and 3 minutes.
