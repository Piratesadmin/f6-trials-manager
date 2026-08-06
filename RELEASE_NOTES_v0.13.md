# F6 Trials Manager v0.13

## New

- **Offer accepted** player decision.
- Confirmed squad section for every team.
- Administrator-only Finance page and dashboard summary.
- Per-player amount owed, amount paid, payment arrangement and treasurer note.
- Payment arrangements: Fully paid, 2 instalments and Direct debit.
- Automatic Paid, Part paid, Outstanding and Fee not set statuses.
- Finance CSV export.

## Privacy and permissions

Season payment records are stored under a separate Firebase `playerFinance` path. The supplied Realtime Database rules allow only the shared PIN administrator or an account with the `admin` role to read or change that path. Coaches can see confirmed squad membership but cannot see payment amounts, arrangements or notes.

Publish the complete updated `firebase-database-rules.json` before using Finance.

## Install and test

1. Keep a safe copy of `.env.local`.
2. Replace the contents of the local `f6-trials-manager` folder with this release, retaining `.env.local`.
3. Run `npm install`, then `npm run build` and `npm run dev`.
4. Sign in as an administrator and set a test player to **Offer accepted**.
5. Confirm the player appears under **Teams → Confirmed squad** and **Finance**.
6. Set the fee, payment arrangement and amount paid; refresh and confirm they remain.
7. Sign in as a coach and confirm the squad member is visible but Finance is absent.
8. Publish `firebase-database-rules.json`, then commit and push the release.
