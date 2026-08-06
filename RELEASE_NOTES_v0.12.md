# F6 Trials Manager v0.12

## Excel player and schedule import

- The existing import window accepts `.csv` and `.xlsx` files.
- Excel workbooks matching the club attendance export are detected automatically.
- Session name, date, start/end time and venue are read from the first three rows.
- The full player details in **For print** are combined with RSVP information in **For import**.
- Phone numbers are never read into player records or Firebase.
- The detected session details can be corrected before import.
- Existing player emails update the matching profile rather than creating duplicates.
- Going and Not answered players are assigned to the created session.
- Can’t go players are imported but left off the session roster.
- New payment and attendance values begin as not paid and not attended.

## RSVP integration

- Going, Not answered and Can’t go status appears in the import preview.
- RSVP status appears beside players in the Schedule roster.
- Player Overview includes an editable Trial response field.
- Marking a player Can’t go removes them from the scheduled session and clears payment/attendance.
- Players can be filtered by trial response.

## Attached workbook verification

Using `mens nvl div 1.xlsx`, the importer detects:

- Session: Men’s NVL Div 1
- Date: 11 August 2026
- Time: 19:45–21:45
- Venue: The Elms Academy
- 27 player rows
- 5 Going
- 18 Not answered
- 4 Can’t go
- 26 importable players
- 1 player skipped because no email address is supplied

The Phone column in **For import** is ignored.

## Install

1. Keep a safe copy of `.env.local`.
2. Unzip v0.12 and copy everything inside into the existing local `f6-trials-manager` repository.
3. Choose **Replace** or **Merge**, then confirm `.env.local` remains alongside `package.json`.
4. Run:

```bash
npm install
npm run build
npm run lint
npm run dev
```

5. Open either **Players → Import players / schedule** or **Schedule → Import Excel**.
6. Select the attached workbook, check the session preview and import it.
7. Test locally, then commit and push through GitHub Desktop.

If the v0.11 Realtime Database rules have already been published, no Firebase rule or secret changes are required for v0.12.

## Suggested checks

1. Confirm the preview shows the session details listed above.
2. Confirm the status counts are 5 Going, 18 Not answered and 4 Can’t go.
3. Confirm John House is shown as invalid because his email cell is empty.
4. Import and confirm 22 players appear on the session roster: 5 Going plus 17 valid Not answered players.
5. Confirm the four Can’t go players exist in Players but are not assigned to the session.
6. Confirm no phone number appears in any profile, preview or search.
7. Upload the same workbook again and confirm existing profiles are marked for update rather than duplication.
8. Recheck CSV import, schedule payment/attendance, assessments, stars, photos, Team Planner and Email Centre.

## Verification

The attached workbook parser, production build, lint checks and dependency security audit pass. The Excel reader is loaded only when a coach selects an Excel file.
