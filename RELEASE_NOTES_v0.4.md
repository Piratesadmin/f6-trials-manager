# F6 Trials Manager v0.4

## New

- Four-tab player profiles: Overview, Assessment, Decision and Email.
- Shared 1–5 ratings for serving, passing, setting, attacking, blocking, defence, movement, communication, attitude and overall level.
- Automatic average rating and assessment-completion percentage.
- Coach recommendations: Strong offer, Offer, Waiting list, Refer to another team, Needs discussion and Not suitable.
- Strengths and development-area notes.
- Suitable-team multi-select.
- Trial/bib number on profiles and player cards.
- Richer player cards with average rating and recommendation.
- Dashboard metrics for assessed players, average rating, offers ready and waiting list.

## Preserved

- Shared PIN login through Firebase Authentication.
- Firebase Realtime Database live syncing.
- CSV import, duplicate handling and column matching.
- Dashboard, Players, Emails, Teams and Settings navigation.
- Existing offer, alternative-offer and rejection email workflow.
- GitHub Pages-compatible relative asset paths.

## Compatibility

Existing Firebase players do not need to be migrated. Missing v0.4 fields receive safe defaults in the app and are added to a record the next time that player is saved.

## Verification completed

- `npm install`
- `npm run lint`
- `npm run build`
- Local desktop and 390-pixel mobile smoke tests
- Assessment controls, average calculation, dashboard updates and Email Centre handoff

## Replace your current project

1. Keep your current `.env.local` file somewhere safe.
2. Unzip this release.
3. Copy everything **inside** the unzipped `f6-trials-manager-v0.4` folder into your existing local `f6-trials-manager` repository.
4. Choose **Replace** or **Merge** when macOS asks. Do not delete or overwrite your existing `.env.local`.
5. In the VS Code terminal, make sure the path ends in `f6-trials-manager`, then run:

   ```bash
   npm install
   npm run build
   npm run dev
   ```

6. Open the local address shown by Vite, normally `http://localhost:5173`.

## Test before pushing

1. Sign in with the existing club PIN.
2. Confirm the existing players are still present.
3. Open a player and check all four tabs.
4. Add two or three ratings and confirm the average changes.
5. Select a recommendation and suitable teams.
6. Refresh the page and confirm the changes remain.
7. Open the site in a second browser window and confirm Firebase updates appear there.
8. Import a small test CSV and confirm duplicate detection still works.
9. Set an offer or rejection, open Email, copy the draft and verify **Mark email as sent**.
10. Check the dashboard’s assessed, average, offers-ready and waiting-list figures.

When testing is complete, commit and push through GitHub Desktop with the summary:

```text
Release v0.4 player profiles and assessments
```
