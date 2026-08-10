# F6 Club Manager v0.24.0

## New

- Administrator payment schedules for fully paid, two-instalment and direct-debit arrangements.
- Automatic overdue calculations based on each player’s amount owed, amount paid and selected arrangement.
- Overdue Finance summary, filtering, table flags, confirmed-squad flags and expanded CSV export.
- Persistent administrator Trials Mode switch.
- Streamlined Club Mode dashboard, navigation, player profiles, calendar creation and Teams view.

## Payment rules

- A player becomes overdue on the day after a missed deadline.
- Two instalments expect 50% after the first deadline and 100% after the second.
- Direct debit divides the total equally across every configured collection date.
- Excused or manually agreed circumstances can be recorded in the existing private finance notes.

## Compatibility

- Existing Firebase records receive empty payment dates and Trials Mode defaults to on.
- PIN login, individual accounts, coach permissions, schedules, attendance, event photos, finance records and email history are preserved.
- No new GitHub secret or Firebase migration is required.

## Verification

- `npm install` completed.
- `npm run lint` completed.
- `npm run build` completed with TypeScript and Vite production output.
