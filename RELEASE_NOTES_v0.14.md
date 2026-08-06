# F6 Trials Manager v0.14

## New

- Administrator-only NVL and LVA standard season fee settings.
- Automatic NVL fee for Aces and Ravens.
- Automatic LVA fee for every other team.
- Standard/custom fee selector for each confirmed player.
- Pull-out Financial insights drawer.
- Collection-progress donut chart.
- Outstanding-balance pie chart by team.
- Payment-arrangement chart.
- Team-by-team billed, paid and outstanding progress.

## Backward compatibility

Existing v0.13 player finance records with a manually entered amount retain that amount as a custom fee. New confirmed players inherit the appropriate standard automatically.

## Security

Standard fees are stored in `financeSettings`. Firebase rules restrict both this path and `playerFinance` to the shared PIN administrator and accounts with the administrator role. Coach accounts cannot read either financial path.

Publish the complete updated `firebase-database-rules.json` before using v0.14. No new GitHub secrets are required.

## Install and test

1. Keep a safe copy of `.env.local`.
2. Replace the contents of the local project with this release, retaining `.env.local`.
3. Run `npm install`, `npm run build` and `npm run dev`.
4. Sign in as an administrator and open Settings.
5. Enter test NVL and LVA fees and save them.
6. Open Finance and confirm Aces/Ravens show the NVL standard and other teams show LVA.
7. Switch one player to Custom amount and confirm the override remains after refresh.
8. Open Financial insights and check the totals and charts.
9. Sign in as a coach and confirm the fee settings and Finance page are unavailable.
10. Publish `firebase-database-rules.json`, then commit and push.
