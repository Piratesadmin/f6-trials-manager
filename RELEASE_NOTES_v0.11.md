# F6 Trials Manager v0.11

## New schedule

- A new **Schedule** tab with a complete twelve-month calendar.
- Previous year, current year and next year navigation.
- Create, edit and delete trial sessions with a name, date, start/end time, venue and notes.
- Multiple trial sessions can be created on the same day.
- Calendar days clearly show when one or more sessions are scheduled.
- The dashboard links directly to the schedule and shows the next upcoming session.

## Session rosters

- Assign and unassign players from each session.
- Search the roster by name, email, team, position or bib number.
- Switch between assigned players, players available to add and all players.
- Mark each assigned player **Paid / Not paid**.
- Mark each assigned player **Attended / Not attended**.
- View live assigned, paid and attended totals.
- Open the full player profile directly from the roster.

## Player integration

- Player Overview now shows the scheduled session, payment status and attendance status.
- Changing a player's session updates their displayed trial date.
- Moving a player to a different session resets payment and attendance, preventing the previous session's status carrying over accidentally.
- Player filters now include trial session, unassigned players, payment status and attendance.
- Existing Firebase players load safely as unassigned and unpaid. Existing free-text trial dates remain visible until a coach assigns the player to a new session.

## Install the upgrade

1. Keep a safe copy of `.env.local`.
2. Unzip v0.11 and copy everything inside it into the existing local `f6-trials-manager` repository.
3. Choose **Replace** or **Merge**, then confirm `.env.local` remains alongside `package.json`.
4. Run:

```bash
npm install
npm run build
npm run lint
npm run dev
```

5. In Firebase, open **Realtime Database → Rules**. Replace the rules with the complete contents of `firebase-database-rules.json` and select **Publish**. The live Schedule cannot save sessions until these rules are published.
6. Test locally, then commit and push through GitHub Desktop.

No new GitHub secrets or Firebase services are required.

## Suggested tests

1. Open Schedule and create two trial sessions on different dates.
2. Create a second session on the same date and confirm both appear in the day switcher.
3. Assign several players to each session.
4. Mark one player Paid and Attended and confirm the session totals update.
5. Open that player from the roster and confirm the session, payment and attendance values match.
6. Open Players → Filters and filter to the session, then combine it with Paid or Attended.
7. Move a player to another session and confirm payment and attendance reset.
8. Open the live site in a second signed-in browser and confirm session and roster changes sync.
9. Delete a test session and confirm its assigned players become unassigned.
10. Recheck player assessments, stars, photos, team plans and the Email Centre.

## Verification

The release passes the production build and lint checks. Vite's advisory main-bundle size warning does not prevent deployment.
