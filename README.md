# F6 Trials Manager v0.7

A GitHub Pages app with Firebase Authentication and Firebase Realtime Database. Coaches enter one shared club PIN and see changes live across devices.

Version 0.7 makes the Players list easier to search during trials and adds optional individual coach accounts. The existing shared PIN, v0.6 Email Centre, live Firebase data, CSV import, assessments and team planner are preserved.

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

No extra GitHub secrets or database-rule changes are required. Individual accounts identify the coach's email in player updates and communication history. All authenticated accounts currently have the same access; v0.7 does not add administrator or team-specific roles.

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
5. Open the **Rules** tab and publish:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

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


## CSV import (v0.3)

Open **Players** and choose **Import players**. Upload a CSV from Google Forms or Sheets, confirm the automatic column matching, review duplicates/invalid rows, then import. Existing players are matched by email and skipped. Imported records sync to Firebase immediately.

## Build verification

```bash
npm install
npm run lint
npm run build
```

See `RELEASE_NOTES_v0.7.md` for replacement and testing steps.
