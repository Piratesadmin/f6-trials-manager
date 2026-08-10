# F6 Club Manager v0.21

A GitHub Pages app with Firebase Authentication and Firebase Realtime Database. Coaches enter one shared club PIN and see changes live across devices.

Version 0.21 adds multi-team offers, a separate position and squad role for every option, and clearer 72-hour response wording.

## v0.21 multi-team offer options

- Player decisions and the Email Centre can now offer one player several teams in one message.
- Coaches tick the teams being offered and choose a playing position for every option.
- Every team option records an expected squad role: Starting six, Frequent player, Rotational player, Development / improvement role, Training squad or Role to be discussed.
- Offer and alternative-offer templates list every option and include the relevant training, venue and competition details for each team.
- The generated response paragraph asks for a reply within 72 hours of the trial session and invites the player to contact the club if that timing is not possible.
- Pre-send checks validate every selected option and warn against each team and positional target independently.
- The Email Centre queue, search and CSV handover export show all offered teams.
- The Team Planner counts each option against its own team while an accepted player is confirmed only in the option they choose.
- Existing Firebase records with a single legacy offer are upgraded safely in memory, so no database migration is required.
- No Firebase rule change or new GitHub secret is required.

## v0.20.1 trialist cleanup

- The administrator **Seasons** page now includes **Remove trialists from live records**.
- **Final rejections only** removes players whose rejection email is marked sent.
- **Everyone outside confirmed squads** removes every player whose decision is not **Offer accepted**.
- A live preview shows confirmed players protected, final rejections, open offers and waiting-list players.
- The broader option warns explicitly when unresolved offers or waiting-list players are included.
- Typing `REMOVE` is required before any live records can be deleted.
- Cleanup removes the selected player profiles, player photos, player finance records and every coach's personal star reference.
- Confirmed players, schedules, team settings and coach accounts are unaffected.
- The cleanup is recorded in the administrator activity history.
- Existing season archives and prior audit entries remain unchanged; this is a live-workspace cleanup rather than a complete historic erasure.
- Publish the supplied v0.20.1 Firebase rules before using cleanup so administrators can remove stale star references safely.

## v0.20 season rollover and activity history

- Administrators have new **Activity** and **Seasons** sections in the main navigation.
- Important player decisions, recommendations, team-plan changes, attendance, trial payments, schedules, imports, emails, account permissions, fees and club settings are attributed to the signed-in account.
- Activity records are append-only, visible only to full administrators and exportable as CSV.
- The Activity page supports search plus category, team and person filters.
- A season rollover creates a read-only snapshot before changing any live records.
- Archives retain player profiles, assessments, decisions, communication history, schedules, team targets and finance records.
- Each archived season shows final totals and confirmed squads and can be downloaded as structured JSON.
- Rollover clears live players, events, player payments, personal stars and photos for the new season.
- Coach accounts, permissions, team targets, email templates, team details, standard fees and the activity history continue into the new season.
- The live season name now appears in the sidebar and updates automatically after rollover.
- An explicit `ARCHIVE` confirmation is required before rollover can run.
- Empty live Firebase player data now remains empty instead of recreating sample players after rollover.
- Publish the supplied v0.20 Firebase rules before using either feature.

## v0.19 dashboard notifications

- The dashboard bell shows a live count of active player and schedule reminders.
- Coaches and Team administrators only receive player notifications for their assigned teams.
- Full administrators and the shared PIN account see club-wide notifications.
- Recommended and referred players link directly to their Decision tab.
- Trial reminders are available club-wide, while training and game reminders are matched to the account's assigned teams.
- Relevant events appear during the next seven days and open directly in the Schedule.
- Player alerts clear automatically when the player is added to the relevant team plan or reaches a final outcome.
- No Firebase migration, rule update or new GitHub secret is required.

## How the PIN works

The portal uses one Firebase Email/Password user behind the scenes:

- The shared email is configured in GitHub and is never typed by coaches.
- The Firebase user's password is the club PIN.
- Coaches only see a PIN field.
- Firebase Authentication protects access to the shared database.

Choose a PIN with at least 6 digits. Avoid obvious values such as `123456`, the club's founding year, or the venue postcode.

## Individual club accounts

The sign-in screen offers **Club PIN** and **Individual login**. Coach and Team administrator accounts use Firebase's existing Email/Password authentication:

1. Open **Firebase → Authentication → Users**.
2. Choose **Add user**.
3. Enter the coach's email address and a strong temporary password.
4. Send those details privately to the coach.

No extra GitHub secrets are required. Individual accounts identify the person's email in player updates and communication history. After they sign in once, use **Settings → Team permissions** while signed in with a full administrator account to choose their role and team access.

Administrators can also edit the person's **Coach name** in that permissions row. The saved name appears automatically in offer, alternative-offer, waiting-list and rejection templates whenever that individual account is signed in. The shared PIN account continues to use the fallback name configured under **Settings → Club communication** because a shared login cannot identify which person is using it.

## v0.16 coach names and 72-hour response deadlines

- Individual coach and Team administrator accounts automatically sign email templates using the display name saved in their account profile.
- Administrators can correct or update coach names under **Settings → Team permissions**.
- A scheduled player's response deadline is calculated exactly 72 hours after the trial session end time.
- When no end time exists, the session start time is used; when neither time exists, the session date ends at 23:59 before the 72 hours are added.
- A player-specific deadline can be earlier, but the pre-send check blocks an override later than the scheduled 72-hour limit.
- A shared fallback deadline remains available for older players who have no assigned scheduled session.
- Warnings appear 48 hours before a deadline, become more prominent inside 24 hours, and show as overdue after the deadline passes.
- Deadline warnings appear on the dashboard, in the Email Centre queue, in the email review panel and on the player's Email tab.
- Sent communication history stores the exact generated wording, calculated deadline and coach name used at the time.
- Existing Firebase players, sessions, accounts, email drafts and security rules remain compatible; no database migration or new GitHub secret is required.

## v0.16.1 post-trial decision reminders

- Attended players with an **Awaiting decision** status receive a reminder as soon as their scheduled session finishes.
- During the first 24 hours the player is marked **Decision needed**.
- From 24 to 72 hours the reminder changes to **Decision pending**.
- After 72 hours it changes to **Decision overdue**.
- The dashboard shows live totals and the five most urgent players; selecting one opens that player's Decision tab.
- The same reminder appears on the player list and beside the player in the Schedule roster.
- Recording any offer, waiting-list or rejection decision removes the decision reminder automatically.
- Only players marked as attended receive these reminders, so non-attendees do not create false alerts.
- The shared PIN account now has an explicit logout icon in the mobile navigation as well as the existing desktop logout button.
- No Firebase migration, rule update or new secret is required.

## v0.17 club schedule

- Schedule entries can now be created as **Trial**, **Training** or **Game / fixture** events.
- Calendar days use coloured event markers: orange for trials, blue for training and green for games.
- Multiple events can still run on the same day and are clearly labelled by type and time.
- Training and game events can be assigned to one or several club teams.
- Games can record the opponent, home/away status, competition, venue and timings.
- Training and games show the confirmed squad for every assigned team, with direct links to player profiles.
- Trial events retain player assignment, RSVP information, payment status, attendance and post-trial decision reminders.
- Excel attendance imports always create Trial events.
- Players can only be assigned to Trial events, protecting email deadlines and decision reminders from training or game entries.
- Existing schedule records automatically become Trial events, so no migration is required.
- The Firebase path and rules remain unchanged; no new GitHub secret is required.

## v0.18 recurring training and calendar views

- New Training events can repeat every week, every two weeks or every month until a selected end date.
- Before saving, the event editor shows how many training sessions will be created.
- Each generated occurrence is saved as a real shared calendar event and can be edited or removed individually.
- Recurring sessions carry a recurrence badge in their event details.
- The Schedule can switch between **Week**, **Month** and **Year** views.
- Week view provides a seven-day agenda with full event cards and quick Add buttons.
- Month view shows event names and times directly inside a larger monthly grid.
- Year view retains the compact twelve-month overview.
- Navigation adapts to the selected view: previous/next week, month or year plus a Today button.
- Every team has a custom calendar colour under **Settings → Team details**.
- Training and game events automatically use the colour of their first selected team; multi-team events retain the additional teams in their details.
- Changing a team colour updates its existing schedule entries automatically.
- Existing email/team settings receive safe default colours without migration.
- No Firebase rule change or new GitHub secret is required.

## 1. Create the Firebase login

1. Open **Security → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Open **Users → Add user**.
4. Enter a fixed shared email, for example `trials@flamingsix.co.uk`.
5. Set the password to the numeric PIN coaches will use.

Firebase passwords must be at least 6 characters, so use a PIN of 6–12 digits.

## 2. Create Realtime Database

1. Open **Databases & Storage → Realtime Database**.
2. Click **Create database**.
3. Choose a nearby European location where available.
4. Start in **Locked mode**.
5. Open the **Rules** tab and publish the complete contents of `firebase-database-rules.json`.

The supplied rules allow every authenticated account to work with players, trial sessions and communications while restricting each team plan to that team's assigned coaches. They enforce a minimum positional-target total of 17, keep each coach's starred-player list private, protect player photos behind authentication and restrict `playerFinance` and `financeSettings` to administrators at database level.

The rules use `trials@flamingsix.co.uk` as the shared administrator email. If your `VITE_FIREBASE_LOGIN_EMAIL` is different, replace that email in `firebase-database-rules.json` before publishing it.

Publishing the v0.15 rules is required before assigning Team administrators. The rules also prevent Coach and Team administrator accounts from reading or writing season fee records and standard fees.

## 3. Register the web app

1. Open **Project settings**.
2. Under **Your apps**, click the Web `</>` icon.
3. Register the app without enabling Firebase Hosting.
4. Keep the displayed `firebaseConfig` values available.

## 4. Add GitHub repository secrets

Open:

**GitHub repository → Settings → Secrets and variables → Actions**

Create these repository secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_LOGIN_EMAIL`

For `VITE_FIREBASE_LOGIN_EMAIL`, enter the same fixed email used when creating the Firebase user. Do **not** add the PIN to GitHub. The PIN remains the Firebase user's password.

## 5. Push the update

```bash
git add .
git commit -m "Add shared PIN access"
git push
```

GitHub Actions will rebuild and publish the site.

## Changing the PIN later

In Firebase, open:

**Authentication → Users → select the shared user → Reset password**

Set a new numeric password and give the new PIN to the coaches. No code or GitHub update is required.

## Local testing

Copy `.env.example` to `.env.local`, fill in all values including the shared login email, then run:

```bash
cp .env.example .env.local
npm install
npm run dev
```

The PIN itself is not placed in `.env.local`; enter it on the portal screen.

## Important privacy note

The PIN protects access through Firebase, but it is still a shared credential. Change it after trials, when a coach leaves, or if it is shared outside the intended group.

Dates of birth and photos are personal data. Only collect them when needed, limit portal access to current coaches and remove trial records in line with the club's retention policy.

## v0.10 player information, personal stars and photos

The player overview and CSV importer now support:

- full name and email;
- date of birth;
- interested division or divisions;
- primary and second position;
- past playing experience;
- highest level played in England or internationally;
- an optional player photo.

Phone numbers, street addresses, city and postal-code fields are not available in the player profile or CSV mapping. Common legacy phone and address properties are also stripped whenever an older player is normalised and next saved. Remove those questions separately from the club's public Google Form if they are still present there.

Each coach can select the star beside a player and use **Filters → Show only my starred players** to open their personal shortlist. Stars belong to the signed-in Firebase account. Coaches using separate logins therefore receive separate lists; everyone using the shared club PIN shares the one PIN-account list.

Photos are reduced in the browser to a small JPEG thumbnail before upload and stored in the authenticated Realtime Database under `playerPhotos`. The original file is not retained. This avoids requiring Firebase Cloud Storage or an additional GitHub secret. Publish the supplied `firebase-database-rules.json` before using stars or photos on the live site.

## v0.11 schedule, payment and attendance

Open **Schedule** to:

- view all twelve months of the selected year;
- move between years or return to the current year;
- select an empty day to create a trial session;
- add a session name, date, time, venue and notes;
- run more than one session on the same day;
- assign or unassign players from the session roster;
- mark assigned players **Paid / Not paid** and **Attended / Not attended**;
- see live assigned, paid and attended totals;
- open a player's full profile directly from the roster.

The player Overview tab also contains the assigned session, payment status and attendance status. The Players filter panel can filter by a specific session, unassigned players, payment status and attendance.

Sessions sync through Firebase under `trialSessions`. Existing player records receive empty `trialSessionId` and unpaid defaults automatically. An older free-text trial date remains visible until the player is assigned to one of the new scheduled sessions; it is not guessed or automatically matched.

## v0.12 Excel player and schedule importer

The import window now accepts both `.csv` and `.xlsx` files. For Excel workbooks matching the Flaming Six attendance export, it automatically:

- reads the session name from the first row;
- reads the date and start/end times from the second row;
- reads the venue from the third row;
- combines detailed player information from **For print** with RSVP status from **For import**;
- imports name, email, date of birth, divisions, primary/second position, experience and highest level;
- ignores the Phone column completely;
- identifies Going, Not answered and Can’t go players;
- creates the calendar session at the same time as importing players;
- assigns Going and Not answered players to the session;
- imports Can’t go players without placing them on the session roster;
- updates an existing player profile when the email already exists, instead of creating a duplicate;
- shows invalid or repeated rows before import.

The detected session name, date, times and venue remain editable in the preview. If the workbook omits a year, the importer assumes the current year and asks the coach to confirm the date.

Trial response status is visible in the schedule roster and player Overview. It is also available as a player filter.

## v0.13 confirmed squads and finance

- Set a player's Decision to **Offer accepted** to place them in the confirmed squad for their offered team (or applied team when no offered team is set).
- Each Team Planner has a separate **Confirmed squad** section. All authenticated coaches can see confirmed names and positions.
- Administrators receive a **Finance** navigation item and dashboard summary; coach accounts do not.
- Administrators can set the amount owed, record the amount paid, choose **Fully paid**, **2 instalments** or **Direct debit**, and add a short payment note.
- The treasurer view totals billed, collected and outstanding amounts and exports a CSV.
- Finance data is stored separately under `playerFinance`, not in player profiles, and Firebase rules restrict it to the shared PIN administrator and accounts with the admin role.
- Existing players and Firebase records remain compatible. Missing finance records start with no fee, no payment arrangement and £0 paid.

## v0.14 standard fees and financial insights

- Administrators can set the **NVL standard fee** and **LVA standard fee** under Settings.
- Aces and Ravens inherit the NVL standard; Cobras, Coyotes, Llamas, Meerkats, Leopards and Pirates inherit the LVA standard.
- Confirmed players use their team's standard fee automatically.
- The treasurer can switch an individual player from **Standard** to **Custom amount** for discounts, waivers or other exceptions.
- Existing v0.13 records with a manually entered amount remain custom, so the upgrade does not overwrite them.
- The Finance page contains a pull-out **Financial insights** panel with collection progress, outstanding balance by team, payment-arrangement breakdowns and team-by-team progress bars.
- Dashboard, Team Planner, CSV export and Finance totals all use the effective standard or custom fee consistently.
- `financeSettings` and `playerFinance` are both protected by administrator-only Firebase rules. Publish the updated rules before using this release.

## v0.15 Club Manager and Team administrators

- The application is now named **F6 Club Manager** in the sign-in screen, sidebar, browser title and deployment workflow.
- The GitHub repository and existing Pages address do not need to change.
- Administrators can assign **Coach**, **Team administrator** or **Administrator** under Settings.
- A Team administrator can view and edit player records like a coach and can edit exactly one assigned team in the Team Planner.
- Selecting a different team for a Team administrator replaces their previous team assignment.
- Team administrators cannot see Finance, financial insights or administrator-only fee settings.
- Existing coach and administrator profiles remain compatible without migration.
- The updated Firebase rules recognise `team-admin` and enforce a maximum of one team assignment for that role.

## v0.4 player profiles and assessment

Open a player to use four focused tabs:

- **Overview:** player details, bib number, team, position, attendance and general notes.
- **Assessment:** ten 1–5 skill ratings, automatic average, recommendation, suitable teams, strengths and development areas.
- **Decision:** offer, alternative offer and rejection options.
- **Email:** preview, copy and sent tracking.

Firebase authentication and Realtime Database syncing remain unchanged.

Older Firebase records are normalised in the app with empty v0.4 assessment fields, so no database migration is required.

## v0.5 team planner

Open **Teams** to:

- configure positional targets for every squad;
- compare recommended, planned and offered totals;
- see shortages and over-capacity warnings;
- add recommended players, referrals and applicants to the plan;
- change a planned position or move a player to another team;
- prepare standard and alternative-team offers;
- open the player's assessment from the planner.

Team targets are stored in Firebase under `teamPlans`. The existing authentication rules already protect this path because database access requires an authenticated user.

Existing offer records are automatically included in the appropriate team plan. Existing players receive an empty `teamConsideration` value in the app until they are planned or next saved.

## v0.6 Email Centre

Open **Emails** to:

- filter the shared queue by Needs info, Ready, Reviewed and Sent;
- review offers, alternative offers, waiting-list messages and rejections;
- catch missing recipient, coach, deadline, offer or rejection details;
- see team-detail and squad-capacity warnings before contacting a player;
- add a player-specific coach name, deadline and personal message;
- copy the subject or body, or open a populated draft in the default email app;
- mark messages as reviewed and record them as sent;
- retain the exact subject, body, recipient, time and portal user in communication history;
- select several messages, mark them reviewed and export a CSV handover list.

Shared coach defaults and team training details are configured under **Settings** and sync through Firebase under `emailSettings`.

“Mark as sent” is tracking only. It shows a confirmation and must be used after the coach sends the message from their email app. No provider key, automatic delivery or paid email service is included.

Older Firebase players receive safe email-draft, review-status and history defaults when loaded; no manual migration is required.

## v0.7 player filters

Open **Players** and select the filter icon to filter by:

- one or several playing positions;
- attended or not attended;
- assessed or not assessed;
- coach recommendation;
- final decision;
- minimum average rating.

Filters combine with the existing name/bib search and team selector. The filter button shows the number of active filters, and **Clear all filters** restores the complete player list.

## v0.8 Flaming Six design

- Official Flaming Six crest in the sidebar and sign-in screen.
- Charcoal navigation based on the logo background.
- Yellow primary actions and flame-orange interactive accents.
- Branded page labels, active navigation and card highlights.
- Warmer application background and refined panel shadows.
- Branded assessment, filter, team-planner and Email Centre states.
- Status colours remain distinct: offers, warnings and rejections retain their semantic green, amber and red treatments.
- Updated application title, theme colour and favicon.

The supplied logo is stored locally as `public/flaming-six-logo.png`; the application does not depend on an external image URL.

## v0.9 squad sizes and coach access

- Every team starts with positional targets totalling at least 17 players.
- Older saved team plans below 17 are upgraded automatically when an administrator opens the app.
- Targets cannot be reduced below a total squad size of 17.
- The shared PIN account is the default administrator and can edit every team.
- Individual coaches can see every Team Planner but can only change assigned teams.
- All authenticated coaches retain full access to player profiles, assessments, notes, decisions and email workflow.
- Coaches create their access profile automatically on first sign-in.
- Administrators assign teams under **Settings → Team permissions**.
- Firebase rules enforce Team Planner permissions on the database, not only in the interface.


## CSV import (v0.3)

Open **Players** and choose **Import players**. Upload a CSV from Google Forms or Sheets, confirm the automatic column matching, review duplicates/invalid rows, then import. Existing players are matched by email and skipped. Imported records sync to Firebase immediately.

## Build verification

```bash
npm install
npm run lint
npm run build
```

See `RELEASE_NOTES_v0.12.md` for replacement and testing steps.
