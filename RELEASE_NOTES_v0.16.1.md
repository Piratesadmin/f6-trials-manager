# F6 Club Manager v0.16.1 release notes

## New post-trial decision reminders

- **Decision needed:** from the end of an attended player's trial session until 24 hours afterward.
- **Decision pending:** from 24 to 72 hours after the session.
- **Decision overdue:** more than 72 hours after the session.
- Dashboard reminders begin without requiring an email decision to be prepared.
- Selecting a dashboard reminder opens the player's Decision tab.
- Reminder badges also appear in Players and the Schedule roster.
- Recording a decision clears the reminder automatically.

## Logout correction

- The shared club PIN account retains the normal desktop logout button.
- A dedicated logout icon now remains visible in the compact phone navigation, where the account section was previously hidden.

## Compatibility

- No Firebase migration is required.
- No database-rule update is required.
- No new GitHub secret is required.
- Existing email deadlines, coach names, schedules and communication history remain unchanged.

## Install and test

1. Keep the existing `.env.local` file safe.
2. Replace the contents of the local project with this release, keeping `.env.local` in the root.
3. Run `npm install`, `npm run build` and `npm run dev`.
4. Create or select a session that has already ended.
5. Assign an attended player whose decision is **Awaiting decision**.
6. Confirm the reminder appears on the dashboard, Players page and Schedule roster.
7. Change the player's decision and confirm the reminder disappears.
8. Open the site on a phone-sized screen while using the club PIN and confirm the logout icon is visible in the top navigation.
