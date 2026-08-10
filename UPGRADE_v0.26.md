# Upgrade to v0.26

1. Keep a safe copy of your existing `.env.local` file.
2. Unzip this release and copy everything inside it into your existing project folder.
3. Choose **Replace** or **Merge** when prompted.
4. Confirm `.env.local` remains beside `package.json`.
5. In Firebase, open **Realtime Database → Rules**.
6. Replace the complete rules with `firebase-database-rules.json` from this release and select **Publish**.
7. Run `npm install`, `npm run build`, then `npm run dev`.
8. Test locally, then commit and push the changes using GitHub Desktop.

## Recommended checks

- Sign in as an administrator and open **Seasons**.
- Run **Final rejections only** cleanup with a test player.
- Confirm the player disappears from the live Players list and appears under Archived players.
- Search and filter the replacement pool, then review the archived assessment and notes.
- Restore the test player and confirm their profile, assessment history and photo return to live Players.
- Confirm old finance data and personal coach stars are not restored.
- Sign in as a Coach or Team administrator and confirm Seasons and Archived players remain unavailable.
- If possible, test a season rollover in local demo data and confirm Archived players are included in the completed snapshot and the new-season replacement pool is empty.

No new GitHub secrets are required.
