# F6 Trials Manager v0.7

## New player filters

- Functional filter button on the Players page.
- Select one or several positions at once.
- Attendance, assessment, recommendation and decision filters.
- Optional minimum average rating.
- Active-filter counter and filtered-player total.
- One-click reset for team and advanced filters.
- Filters work alongside the existing text search and team selector.

## Individual coach accounts

- The existing shared club PIN remains available.
- Coaches can instead sign in with an individual email address and password.
- Accounts use the existing Firebase Email/Password provider.
- Player changes and communication records use the signed-in coach's email.
- The sidebar identifies whether the session uses the shared PIN or a coach account.
- Settings contains account-creation and offboarding guidance.

Individual accounts currently have the same access to the portal. Role-based or team-specific permissions are not part of this release.

## Create a coach account

1. Open **Firebase Console → Authentication → Users**.
2. Click **Add user**.
3. Enter the coach's email address and a strong temporary password.
4. Send the credentials privately.
5. The coach selects **Coach login** on the portal and signs in.

No new GitHub secrets or Realtime Database rules are required. Disable or delete the Firebase user when the coach leaves.

## Preserved

- Shared PIN login.
- Firebase Realtime Database live syncing.
- CSV import and duplicate detection.
- Player profiles, assessments and recommendations.
- Team planner and squad targets.
- v0.6 Email Centre and communication history.
- GitHub Pages deployment.

## Replace your current project

1. Keep your current `.env.local` somewhere safe.
2. Unzip this release.
3. Copy everything **inside** the unzipped `f6-trials-manager-v0.7` folder into your existing local `f6-trials-manager` repository.
4. Choose **Replace** or **Merge** when macOS asks. Confirm `.env.local` remains in the project root.
5. In the VS Code terminal, run:

   ```bash
   npm install
   npm run build
   npm run dev
   ```

6. Open the local address shown, normally `http://localhost:5173`.

## Test before pushing

1. Sign in with the existing shared PIN.
2. Open **Players**, open the filter panel and select one position.
3. Add a second position and confirm both groups appear.
4. Combine the positions with attendance or assessment status.
5. Choose **Clear all filters** and confirm the full list returns.
6. In Firebase Authentication, create one temporary test coach account.
7. Sign out, choose **Coach login**, and sign in with that account.
8. Change a harmless test player field and confirm the sidebar shows Coach account.
9. Sign out, disable/delete the test Firebase user, and confirm the shared PIN still works.
10. Re-test CSV import, the team planner and one Email Centre draft.

When testing is complete, commit and push through GitHub Desktop with:

```text
Release v0.7 player filters and coach accounts
```

## Verification completed for this package

- `npm install`
- `npm run lint`
- `npm run build`
- Single- and multi-position filters
- Combined assessment filter
- Complete filter reset
- Shared PIN and coach-login screen modes
- Browser console error checks
