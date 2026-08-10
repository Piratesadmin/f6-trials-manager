# F6 Club Manager v0.16 release notes

## New

- Signed-in coach names are inserted into club email templates automatically.
- Administrators can edit each account's coach name in Settings.
- Offer, alternative-offer and waiting-list deadlines default to 72 hours after the assigned trial session finishes.
- Dashboard and Email Centre warnings highlight deadlines within 48 hours, within 24 hours and overdue.
- The player Email tab shows the effective deadline and its current warning state.

## Safeguards

- A player-specific response deadline later than the scheduled 72-hour limit blocks the draft from being marked ready or sent.
- Earlier player-specific deadlines remain possible.
- Players without a scheduled session keep using the shared fallback deadline.
- Rejection emails use the signed-in coach name but do not require a response deadline.

## Compatibility

- No Firebase migration is required.
- No new Firebase rules or GitHub secrets are required.
- Existing PIN login, individual logins, schedules, players, CSV/Excel import, email history, team planning and finance remain supported.

## Install and test

1. Keep the existing `.env.local` file safe.
2. Replace the files in the local `f6-trials-manager` repository with this release, keeping `.env.local` in the project root.
3. Run `npm install` and `npm run build`.
4. Start the local site with `npm run dev`.
5. Sign in as an administrator and set a coach's name under Settings → Team permissions.
6. Sign in using that individual coach account and confirm the name appears in a player's email template.
7. Assign the player to a scheduled trial session with an end time and prepare an offer or waiting-list email.
8. Confirm the displayed deadline is exactly 72 hours after the session end time.
9. After testing, commit the replacement in GitHub Desktop and push it to deploy GitHub Pages.
