# Upgrade to v0.25.1

1. Keep a safe copy of your existing `.env.local` file.
2. Unzip this release and copy everything inside it into your existing project folder.
3. Choose **Replace** or **Merge** when prompted.
4. Confirm `.env.local` remains beside `package.json`.
5. Run `npm install`, `npm run build`, then `npm run dev`.
6. Test locally, then commit and push the change with GitHub Desktop.

## Recommended checks

- Turn Trials Mode off and open a player’s Assessment tab.
- Confirm ratings, strengths, development notes, Save assessment and progression remain available.
- Confirm Coach recommendation and Suitable teams are hidden.
- Save another assessment and confirm it appears in progression history.
- Turn Trials Mode on and confirm Recommendation and Suitable teams return with their previous values.

No Firebase rule or GitHub secret changes are required.
