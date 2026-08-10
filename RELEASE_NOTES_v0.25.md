# F6 Club Manager v0.25.0

## New

- Player assessments remain available when Trials Mode is off.
- A **Save assessment** action records a new dated snapshot instead of overwriting the player’s history.
- Each snapshot keeps all ten ratings, average score, recommendation, suitable teams, strengths, development areas, date and coach identity.
- Player profiles now include an eight-entry progression chart, change since the previous assessment and expandable assessment history.
- Team cards open the Assessment tab in either Trials or Club Mode.

## Compatibility

- Existing current assessments are preserved and can be saved as the player’s first historical snapshot.
- Older players without assessment history default safely to an empty history.
- Assessment snapshots live inside the existing Firebase player record and are included in season archives automatically.
- No new Firebase rules, database migration or GitHub secrets are required.

## Verification

- `npm install` completed.
- `npm run lint` completed without warnings.
- `npm run build` completed with TypeScript and Vite production output.
