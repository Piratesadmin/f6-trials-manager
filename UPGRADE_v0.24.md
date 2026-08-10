# Upgrade to v0.24

1. Keep a safe copy of your existing `.env.local` file.
2. Unzip this release and copy everything inside it into your existing project folder. Choose **Replace** or **Merge** when prompted.
3. Confirm that `.env.local` remains beside `package.json`.
4. Run `npm install`, `npm run build`, then `npm run dev` in the VS Code terminal.
5. Test locally, then commit and push the changes using GitHub Desktop.

The supplied Firebase rules remain compatible with this release. If the live project is still using rules older than v0.23, publish the included `firebase-database-rules.json`.

## Recommended checks

- Sign in as an administrator and open **Settings**.
- Enter the fully-paid date, both instalment dates and at least three direct-debit dates, then save.
- In **Finance**, give test players each payment arrangement and different amounts paid.
- Confirm overdue players are flagged only after the relevant date and can be filtered.
- Turn Trials Mode off and confirm Emails disappears, the dashboard is simplified, Players shows only the Overview tab, new calendar events default to training, and Teams shows only confirmed squads and attendance.
- Sign in as a coach and confirm they cannot change Trials Mode or payment schedules.
- Turn Trials Mode back on and confirm the complete trials workflow returns with existing data unchanged.
