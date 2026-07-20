# F6 Trials Manager v0.9

## New

- A club-wide minimum squad target of 17 players.
- Automatic uplift for older saved plans totalling fewer than 17.
- Team-specific Team Planner permissions for coach accounts.
- Administrator team assignment controls in Settings.
- Read-only Team Planner presentation for unassigned teams.
- Assigned-team details shown beside the signed-in account.
- Server-enforced Firebase rules for team-plan changes.

## Preserved

- Shared PIN administrator login.
- Individual coach login.
- Full player visibility and editing for every authenticated coach.
- Firebase live syncing, CSV import, filters, assessments, decisions, Team Planner and Email Centre.
- Flaming Six logo and branded responsive design.

## Replace and test

1. Keep your existing `.env.local` somewhere safe.
2. Copy every file and folder from this release into the existing local `f6-trials-manager` repository, choosing **Replace** or **Merge**.
3. Confirm `.env.local` is still beside `package.json`.
4. Run `npm install`, then `npm run build` and `npm run dev`.
5. Sign in with the shared PIN and confirm every Team Planner target totals at least 17.
6. Open **Settings → Team permissions**.
7. Create each coach under **Firebase Authentication → Users** and ask each coach to sign in once.
8. Return to Team permissions with the shared PIN and select that coach's team or teams.
9. In Firebase Realtime Database, open **Rules**, paste the complete contents of `firebase-database-rules.json`, and publish.
10. Sign in as a coach. Confirm all players remain editable, their assigned team is editable in Team Planner, and another team is visibly read-only.

## Important Firebase note

The database rules recognise `trials@flamingsix.co.uk` as the bootstrap shared administrator. If the value of `VITE_FIREBASE_LOGIN_EMAIL` is different, replace that email everywhere it appears in `firebase-database-rules.json` before publishing the rules.

Do not copy `.env.local` into GitHub and do not include the PIN in GitHub secrets. The existing shared-login email secret stays unchanged.

## Verification completed

- `npm install`
- `npm run build`
- `npm run lint`
- Local browser check of the 17-player planner targets and administrator access screen
