# F6 Trials Manager v0.8

## Flaming Six visual refresh

- Added the official club crest supplied by Flaming Six.
- Replaced the generic F6 tile in the sidebar and login screen.
- Introduced a charcoal, yellow and flame-orange colour system derived from the crest.
- Added consistent club identification to every page header.
- Restyled primary actions, active navigation, player selection and filter states.
- Refined dashboard cards, profile headers, assessment summaries and planner panels.
- Added a branded login background and club-name lockup.
- Updated the browser title, favicon and theme colour.
- Preserved semantic status colours for accessibility and fast scanning.
- Retained responsive desktop, tablet and mobile behaviour.

## Preserved functionality

- Shared PIN and individual coach logins.
- Firebase Authentication and Realtime Database syncing.
- CSV import and duplicate detection.
- v0.7 player filters.
- Player profiles, assessments and recommendations.
- Team planner and squad targets.
- Email Centre and communication history.
- GitHub Pages deployment.

## Replace your current project

1. Keep your existing `.env.local` somewhere safe.
2. Unzip this release.
3. Copy everything **inside** the unzipped `f6-trials-manager-v0.8` folder into your existing local `f6-trials-manager` repository.
4. Choose **Replace** or **Merge** when macOS asks. Confirm `.env.local` remains in the project root.
5. In the VS Code terminal, run:

   ```bash
   npm install
   npm run build
   npm run dev
   ```

6. Open the local address shown, normally `http://localhost:5173`.

## Test before pushing

1. Check that the official crest appears in the sidebar.
2. Sign out and confirm the crest and branded background appear on the login screen.
3. Test both Club PIN and Coach login tabs.
4. Open Dashboard, Players, Emails, Teams and Settings and check text contrast.
5. Open a player assessment and confirm ratings remain clear.
6. Open the player filter panel and confirm active states are easy to identify.
7. Re-test one CSV import, team-planner action and Email Centre draft.
8. Open the deployed site on a phone or tablet after pushing.

When testing is complete, commit and push through GitHub Desktop with:

```text
Release v0.8 Flaming Six visual refresh
```

## Verification completed for this package

- `npm install`
- `npm run lint`
- `npm run build`
- Dashboard, player workspace and login visual checks
- Club-logo loading and intrinsic-dimension check
- Player navigation smoke test
- Browser console error checks
