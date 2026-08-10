# F6 Club Manager v0.26.0

## New

- Administrator-only Archived players replacement pool under Seasons.
- Search by name, email, experience and notes.
- Filters for applied team and primary or second position.
- Full archived-player review showing assessment score, recommendation, experience, strengths, development areas and coach notes.
- One-click restoration to live player records.
- Archived player totals in the current-season and completed-season summaries.

## Changed

- Trialist cleanup archives player profiles instead of permanently deleting them.
- Player details, assessments, communications and compressed photos are retained.
- Finance records and personal coach stars are still removed from the live workspace.
- Season rollover includes archived-player profiles in the completed-season snapshot and clears the replacement pool for the new season.

## Security and compatibility

- Archived players are readable and writable only by the shared PIN administrator or individual accounts with the Administrator role.
- Existing players and season archives remain compatible.
- Publish `firebase-database-rules.json` before using cleanup or restore.
- No new GitHub secrets or manual data migration are required.

## Verification

- `npm install` completed.
- `npm run lint` completed without warnings.
- `npm run build` completed with TypeScript and Vite production output.
