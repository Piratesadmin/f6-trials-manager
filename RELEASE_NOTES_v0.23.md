# F6 Club Manager v0.23.0

## New

- Full-screen calendar event workspaces for trials, training and games.
- Shared event notes and protected photo galleries with up to six compressed images per event.
- Present, absent and excused registers for confirmed squads at training sessions and games.
- Team attendance summaries, recent-session breakdowns and per-player attendance rates in Team Planner.
- Team-aware editing: coaches and Team administrators record attendance for their assigned teams; administrators can edit all teams.

## Compatibility

- Existing Firebase events are normalised with an empty attendance register.
- PIN login, coach accounts, live Firebase syncing, CSV/Excel imports, navigation, teams, finance and email workflows are unchanged.
- Event photos use a new protected `sessionPhotos` Firebase path. The supplied database rules must be published before photos can be uploaded.

## Verification

- `npm install` completed.
- `npm run lint` completed.
- `npm run build` completed with TypeScript and Vite production output.
