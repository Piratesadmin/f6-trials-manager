# F6 Club Manager v0.19 — Dashboard notifications

## New

- A notification bell and dropdown now appears beside **View players** on the dashboard.
- Coaches and Team administrators see player recommendations and referrals for only their assigned teams.
- Full administrators and the shared club PIN account receive a club-wide view.
- Player alerts link directly to the player's Decision tab.
- Trial sessions are shown to all relevant accounts; training and games are filtered to assigned teams.
- The next seven days of relevant schedule events appear with today/tomorrow timing, date, time, team and venue.
- Schedule alerts link directly to the selected calendar event.
- The notification count is a live count of active recommendations and upcoming events.

## Automatic behaviour

- A player alert clears when that player is added to the relevant team plan or reaches a final sent/accepted outcome.
- Finished sessions disappear automatically; new sessions enter the dropdown when they are within seven days.
- All notifications are calculated from existing shared player, permission and schedule data, so no migration, Firebase rule change or new GitHub secret is required.

## Verification

- `npm install` completed successfully.
- `npm run build` completed successfully.
- `npm run lint` completed with no errors.
