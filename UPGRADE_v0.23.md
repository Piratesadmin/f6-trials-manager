# Upgrade to v0.23

1. Keep a safe copy of your existing `.env.local` file.
2. Unzip this release and copy everything inside it into your existing `f6-trials-manager` repository folder. Choose **Replace** or **Merge** when prompted.
3. Confirm that your original `.env.local` is still in the project root beside `package.json`.
4. In Firebase, open **Realtime Database → Rules**, replace the rules with the supplied `firebase-database-rules.json`, and select **Publish**. This enables the protected event-photo path.
5. In the VS Code terminal, run `npm install`, then `npm run build`, then `npm run dev`.
6. Test the site locally before committing and pushing it with GitHub Desktop.

## Recommended checks

- Sign in with the shared PIN and with a coach account.
- Open a calendar event and confirm it expands full screen and minimises correctly.
- Edit the event notes, attach and remove a photo, then refresh the page.
- Open a training session or game assigned to a team with confirmed players.
- Mark one player Present, one Absent and one Excused, then refresh the page.
- Open **Teams**, select that team and confirm the attendance statistics and recent session update.
- Confirm a coach can edit only attendance for an assigned team, while an administrator can edit every team.
- Check the calendar and attendance controls on a phone-sized browser window.
