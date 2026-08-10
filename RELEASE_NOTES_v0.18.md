# F6 Club Manager v0.18 release notes

## Recurring training

- Choose **Does not repeat**, **Every week**, **Every 2 weeks** or **Every month** when creating Training.
- Select the final recurrence date.
- See the number of sessions that will be created before saving.
- Each occurrence is saved to Firebase as a normal calendar event, so all coaches see it immediately.
- Individual occurrences can be edited or deleted without affecting the rest of the series.
- A recurrence badge identifies generated training events.

## Calendar views

- **Week:** seven-day agenda with event cards and quick Add controls.
- **Month:** large calendar showing event names and start times.
- **Year:** compact twelve-month overview.
- Previous, Today and Next controls follow the selected view.

## Team colours

- Each team now has a shared custom colour under Settings → Team details.
- Training and games use their first selected team's colour throughout the calendar.
- Changing a colour updates existing entries automatically; events do not need to be recreated.
- Older settings receive distinctive default colours for all eight teams.

## Compatibility

- Existing events remain available and unchanged.
- Existing settings are normalised with default team colours.
- No Firebase migration is required.
- No Firebase rules or GitHub secrets need changing.

## Install and test

1. Preserve the existing `.env.local` file.
2. Replace the local project contents with this release, keeping `.env.local` in the root.
3. Run `npm install`, `npm run build` and `npm run dev`.
4. Under Settings, change one team's calendar colour and save the club settings.
5. Create a weekly Training event for that team with an end date several weeks later.
6. Confirm the stated number of sessions appears in the Week, Month and Year views.
7. Edit or delete one occurrence and confirm the other dates remain intact.
8. Commit the tested update through GitHub Desktop and push it to deploy GitHub Pages.
