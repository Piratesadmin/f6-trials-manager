# F6 Club Manager v0.15

## New role: Team administrator

- Added Team administrator to Settings → Team permissions.
- Team administrators use an individual Firebase login.
- They can view and edit player records like coaches.
- They can edit exactly one assigned Team Planner.
- Choosing another team replaces their previous team assignment.
- They cannot access Finance, financial insights, standard fees or full administrator controls.

## Product rename

The application is now displayed as **F6 Club Manager** on the login screen, sidebar, browser tab, loading screen and GitHub deployment workflow. The existing repository name and GitHub Pages URL continue to work.

## Security

The supplied Firebase rules now accept the `team-admin` role and enforce no more than one assigned team. Finance remains restricted to the shared PIN administrator and full Administrator accounts.

Publish the complete updated `firebase-database-rules.json` before assigning the new role. No new GitHub secrets are required.

## Test

1. Sign in as a full administrator.
2. Open Settings → Team permissions.
3. Change a test individual account to Team administrator and select one team.
4. Sign in using that account.
5. Confirm its assigned team is editable and every other team is view-only.
6. Confirm player records remain editable.
7. Confirm Finance and standard-fee settings are unavailable.
