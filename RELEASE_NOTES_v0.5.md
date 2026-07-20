# F6 Trials Manager v0.5

## New team planner

- Shared squad targets for Setter, Outside, Middle, Opposite, Libero and All-rounder.
- Live target, recommended, planned, offered and remaining counts by position.
- Squad progress and shortage/over-capacity warnings.
- Team selector showing every squad's planned total and remaining spaces.
- Planned-squad cards with assessment rating and recommendation.
- Recommended, referred, waiting-list, needs-discussion and other-applicant groups.
- Add and remove players from a team plan without changing their final decision.
- Change a player's intended position and see the balance update immediately.
- Move a planned player between teams.
- Prepare a standard or alternative-team offer directly from the planner.
- Open a player's complete v0.4 assessment directly from the planner.

## Live syncing and compatibility

- Team targets sync through the existing Firebase Realtime Database under `teamPlans`.
- Player planning assignments use the existing `players` records and live update path.
- Existing offers automatically appear in the appropriate planned squad.
- Existing v0.4 players receive safe empty planning defaults; no manual migration is required.
- Local demo mode stores its team plans in the browser, as before.

## Preserved

- Shared PIN login and Firebase Authentication.
- Firebase player syncing.
- CSV import and duplicate detection.
- v0.4 player profiles and shared assessments.
- Offer, alternative-offer and rejection email workflows.
- Dashboard, Players, Emails, Teams and Settings navigation.
- GitHub Pages-compatible asset paths.

## Verification completed

- `npm install`
- `npm run lint`
- `npm run build`
- Add/remove planning workflow
- Position and cross-team move workflow
- Standard and alternative offer preparation
- Shared target controls
- Desktop and 390-pixel mobile layout checks
- Browser console error check

## Replace your current project

1. Keep your current `.env.local` somewhere safe.
2. Unzip this release.
3. Copy everything **inside** the unzipped `f6-trials-manager-v0.5` folder into your existing local `f6-trials-manager` repository.
4. Choose **Replace** or **Merge** when macOS asks. Ensure your existing `.env.local` remains in the project root.
5. In the VS Code terminal, make sure the path ends in `f6-trials-manager`, then run:

   ```bash
   npm install
   npm run build
   npm run dev
   ```

6. Open the address shown by Vite, normally `http://localhost:5173`.

## Test before pushing

1. Sign in with the existing club PIN.
2. Confirm existing players, assessments and emails are present.
3. Open **Teams** and select a team.
4. Adjust one positional target and confirm it remains after refreshing.
5. Add a player to the plan and change their planned position.
6. Move the player to another team and confirm both team totals change.
7. Prepare an offer and confirm the player's Decision and Email tabs contain the correct team and position.
8. Open the site in a second browser and confirm planner updates appear live.
9. Re-test one small CSV import and one existing email workflow.

When testing is complete, commit and push through GitHub Desktop with:

```text
Release v0.5 team planner
```
