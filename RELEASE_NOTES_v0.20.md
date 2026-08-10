# F6 Club Manager v0.20 — Seasons and activity

## Season archive

- Added an administrator-only **Seasons** page.
- Displays live-season totals for players, confirmed squad members, events and sent communications.
- Creates a protected, read-only snapshot containing players, assessments, decisions, communication history, schedules, team targets and finance records.
- Lists historic seasons with final squad and financial summaries.
- Archived structured data can be downloaded as JSON.
- Requires typing `ARCHIVE` before the rollover is enabled.
- Starts the new season with empty players, events and player payments.
- Clears old personal stars and player photos rather than carrying personal trial data into the new season.
- Retains coach accounts, team permissions, team targets, club/email settings, standard fees and audit history.

## Activity and audit history

- Added an administrator-only **Activity** page.
- Records meaningful player, schedule, email, team, finance, access, import, settings and season changes.
- Attributes every entry to the authenticated account and current season.
- Includes search and category, team and person filters.
- Links current player and schedule entries back to their records.
- Exports the filtered history as CSV.
- Firebase rules make entries append-only and administrator-readable.
- The page loads the most recent 500 events for responsive day-to-day use; older entries remain stored in Firebase.

## Required setup

Publish the complete supplied `firebase-database-rules.json` in Firebase before using v0.20. It adds protected paths for:

- `seasonSettings`
- `seasonArchives`
- `auditLog`
- administrator-controlled clearing of `playerStars` during rollover

No new GitHub secret is required.

## Verification

- Firebase rules file is valid JSON.
- `npm install` completed successfully.
- `npm run build` completed successfully.
- `npm run lint` completed with no errors.
