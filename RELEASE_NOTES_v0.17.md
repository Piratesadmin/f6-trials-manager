# F6 Club Manager v0.17 release notes

## Club-wide calendar

- Add Trials, Training or Games from the same yearly schedule.
- Calendar markers distinguish each event type at a glance.
- Create multiple events on the same day and switch between them by type and time.

## Training

- Assign training to one or several teams.
- Store the date, start/end time, venue and instructions.
- View the confirmed players belonging to every selected team.

## Games and fixtures

- Assign one or several teams.
- Record the opposition, home/away status and competition.
- Store the venue, timings and match instructions.
- Open confirmed player profiles directly from the event squad.

## Trials remain protected

- Player assignment, attendance, session payment and RSVP controls remain available on Trial events.
- Only Trial events can be assigned to player trial profiles.
- Response deadlines and post-trial decision warnings only use Trial events.
- Excel attendance workbooks always create Trial events.

## Compatibility

- Existing calendar records automatically load as Trial events.
- No Firebase migration is required.
- No database-rule update is required.
- No new GitHub secret is required.

## Install and test

1. Keep the existing `.env.local` file safe.
2. Replace the local project files with this release, retaining `.env.local` in the root.
3. Run `npm install`, `npm run build` and `npm run dev`.
4. Open Schedule and create one Training event with a team selected.
5. Create one Game with a team, opponent, home/away status and competition.
6. Confirm both appear with the correct calendar colour and confirmed squad.
7. Open an existing Trial and confirm its roster, payments, attendance and reminders are unchanged.
8. Commit the tested update in GitHub Desktop and push it to deploy GitHub Pages.
