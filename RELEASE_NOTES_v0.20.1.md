# F6 Club Manager v0.20.1 — Trialist cleanup

## New

- Added an administrator-only cleanup panel to **Seasons & archive**.
- Choose **Final rejections only** for the safest cleanup.
- Choose **Everyone outside confirmed squads** after all offers and waiting lists are resolved.
- Confirmed players with **Offer accepted** are always protected.
- Preview totals show final rejections, open offers, waiting-list players and confirmed squad members.
- The broad cleanup option warns when unresolved offers or waiting-list records will be included.
- Requires typing `REMOVE` before deletion.

## Records removed

- Live player profile
- Player photo
- Player finance record
- Personal star references belonging to every coach

Existing season archives and administrator activity entries are intentionally retained. Use a separate data-erasure process if a person requests removal from historic archives or audit records as well.

## Required setup

Publish the complete supplied `firebase-database-rules.json`. The updated rules permit full administrators to read the personal-star index solely so deleted trialist references can be removed across all accounts.

No database migration or new GitHub secret is required.

## Verification

- Firebase rules file is valid JSON.
- `npm install` completed successfully.
- `npm run build` completed successfully.
- `npm run lint` completed with no errors.
