# F6 Trials Manager v0.10

A GitHub Pages app with Firebase Authentication and Firebase Realtime Database. Coaches enter one shared club PIN and see changes live across devices.

Version 0.10 expands player profiles and CSV import with date of birth, division interest, second position, playing experience and highest level played. Phone numbers and home addresses are deliberately excluded. Coaches also receive a personal starred-player shortlist, and each player can have an optional resized profile photo.

## How the PIN works

The portal uses one Firebase Email/Password user behind the scenes:

- The shared email is configured in GitHub and is never typed by coaches.
- The Firebase user's password is the club PIN.
- Coaches only see a PIN field.
- Firebase Authentication protects access to the shared database.

Choose a PIN with at least 6 digits. Avoid obvious values such as `123456`, the club's founding year, or the venue postcode.

## Individual coach accounts

The sign-in screen now offers **Club PIN** and **Coach login**. Individual coach accounts use Firebase's existing Email/Password authentication:

1. Open **Firebase → Authentication → Users**.
2. Choose **Add user**.
3. Enter the coach's email address and a strong temporary password.
4. Send those details privately to the coach.

No extra GitHub secrets are required. Individual accounts identify the coach's email in player updates and communication history. After a coach signs in once, use **Settings → Team permissions** while signed in with the shared PIN administrator account to assign one or more teams.

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

The supplied rules allow every authenticated account to work with players and communications while restricting each team plan to that team's assigned coaches. They also enforce a minimum positional-target total of 17, keep each coach's starred-player list private to their Firebase account and protect player photos behind authentication.

The rules use `trials@flamingsix.co.uk` as the shared administrator email. If your `VITE_FIREBASE_LOGIN_EMAIL` is different, replace that email in `firebase-database-rules.json` before publishing it.

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

See `RELEASE_NOTES_v0.10.md` for replacement, Firebase and testing steps.
