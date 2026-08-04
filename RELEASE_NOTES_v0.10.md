# F6 Trials Manager v0.10

## New

- Expanded player profiles for date of birth, division interest, second position, playing experience and highest level played.
- Expanded Google Forms/Sheets CSV matching for the same fields.
- Phone numbers and full address fields are intentionally excluded from the profile and importer.
- Personal player stars for each signed-in coach, with a **Show only my starred players** filter.
- Optional player photos, resized in the browser before being stored as small protected thumbnails.
- Richer player search covering second position, divisions, experience and highest level.

## Privacy and compatibility

- Existing Firebase player records load with safe empty defaults for all new fields; no player migration is required.
- Common legacy phone and address properties are discarded when records are normalised and next saved.
- Individual coach accounts have individual starred lists. The shared PIN is one Firebase account, so people using that PIN share its shortlist.
- Photos are stored under `playerPhotos` in the authenticated Realtime Database. The selected original image is never retained.
- Dates of birth and photos are personal data. Apply the club's access and retention policy.

## Replace the existing project

1. Keep a safe copy of the existing `.env.local` file. It is deliberately excluded from this release.
2. Unzip v0.10 and copy everything inside the unzipped folder into the existing local `f6-trials-manager` repository.
3. Choose **Replace** or **Merge** when prompted. Confirm `.env.local` is still alongside `package.json` afterward.
4. In the project terminal, run:

```bash
npm install
npm run build
npm run lint
npm run dev
```

5. In Firebase, open **Realtime Database → Rules**. Replace the rules with the complete contents of `firebase-database-rules.json` and select **Publish**. Stars and photos will not work on the live site until these rules are published.
6. Test locally, then commit and push the update with GitHub Desktop. GitHub Actions will publish the updated Pages site.

No new GitHub secrets and no Firebase Storage setup are required.

## Suggested tests

1. Import a short CSV containing these headings:

```text
Name,Email,Cell,Date of birth,Street address,City,Postal Code,What division(s) are you interested in playing for?,What position do you primarily play?,Do you have a second position you'd like you play?,What is your past playing experience?,Highest level played in England/internationally
```

2. Confirm all requested playing fields appear in the preview and imported profile, while Cell and all address columns have no mapping and are not stored.
3. Star two players, open the player filter and enable **Show only my starred players**.
4. Sign into a different individual coach account and confirm its shortlist starts separately. If testing with the shared PIN, expect that shortlist to be shared.
5. Add a JPG, PNG or browser-supported image to a player. Confirm the profile header updates on a second signed-in browser, then test **Change photo** and **Remove photo**.
6. Confirm existing assessments, decisions, team plans, CSV imports and the Email Centre still work.

## Verification

The release passes:

```text
npm run build
npm run lint
```

Vite reports only its advisory warning that the main JavaScript bundle is above 500 kB; this does not prevent deployment.
