# Upgrade to v0.25

1. Keep a safe copy of your existing `.env.local` file.
2. Unzip this release and copy everything inside it into your existing project folder. Choose **Replace** or **Merge** when prompted.
3. Confirm that `.env.local` remains beside `package.json`.
4. In the VS Code terminal, run `npm install`, `npm run build`, then `npm run dev`.
5. Test locally, then commit and push the changes using GitHub Desktop.

No Firebase rules or GitHub secrets need to change for v0.25. If your live project is still using rules older than v0.23, publish the included `firebase-database-rules.json` so the existing event-photo and attendance features remain protected.

## Recommended checks

- Turn Trials Mode off and confirm each player still has **Overview** and **Assessment** tabs, while Decision and Email remain hidden.
- Change several ratings and confirm they do not update the saved player card until **Save assessment** is selected.
- Save an assessment, refresh the page and confirm it appears in Assessment history.
- Change the ratings and save again. Confirm the chart has two points and the change from the previous average is shown.
- Expand both history entries and confirm their ratings, recommendations and notes remain distinct.
- Open the app in a second signed-in browser and confirm a newly saved assessment appears live.
- Open a player from a team’s confirmed squad and confirm it opens directly on Assessment in Club Mode.
- Turn Trials Mode back on and confirm Decision and Email return without losing assessment history.
