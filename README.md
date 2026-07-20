# F6 Trials Manager v0.5

A GitHub Pages app with Firebase Authentication and Firebase Realtime Database. Coaches enter one shared club PIN and see changes live across devices.

Version 0.5 adds an interactive, live-synced team planner on top of the v0.4 player profiles and assessments. Coaches can configure squad targets, balance positions, plan players, move them between teams and prepare offers without a manual database migration.

## How the PIN works

The portal uses one Firebase Email/Password user behind the scenes:

- The shared email is configured in GitHub and is never typed by coaches.
- The Firebase user's password is the club PIN.
- Coaches only see a PIN field.
- Firebase Authentication protects access to the shared database.

Choose a PIN with at least 6 digits. Avoid obvious values such as `123456`, the club's founding year, or the venue postcode.

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


## CSV import (v0.3)

Open **Players** and choose **Import players**. Upload a CSV from Google Forms or Sheets, confirm the automatic column matching, review duplicates/invalid rows, then import. Existing players are matched by email and skipped. Imported records sync to Firebase immediately.

## Build verification

```bash
npm install
npm run lint
npm run build
```

See `RELEASE_NOTES_v0.5.md` for replacement and testing steps.
