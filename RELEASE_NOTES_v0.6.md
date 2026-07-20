# F6 Trials Manager v0.6

## New Email Centre

- Shared queue for offers, alternative offers, waiting-list messages and rejections.
- Needs info, Ready, Reviewed and Sent workflow with live counts and filters.
- Search and message-type filters.
- Per-player response deadline, coach name and optional personal message.
- Shared email defaults plus team training, venue and competition settings.
- Pre-send blockers for invalid recipients and missing required information.
- Warnings for incomplete team details, previous communications and squad targets.
- Subject/body copy controls and **Open in email app**.
- Review status, sent confirmation and exact communication history.
- Multi-select review action and CSV handover export.
- Communication progress added to the dashboard.
- Responsive desktop, tablet and mobile layouts.

## Important sending behaviour

This release does **not** send email automatically. **Open in email app** creates a populated draft. **Mark as sent** records that a coach has already sent it and stores the exact wording used.

## Preserved

- Shared PIN login and Firebase Authentication.
- Firebase Realtime Database syncing.
- CSV player import and duplicate detection.
- Player profiles, shared assessments and recommendations.
- Team planner, squad targets and position warnings.
- Existing decision and email-preview workflow in player profiles.
- GitHub Pages deployment.

## Compatibility

- No manual Firebase migration is required.
- Existing player records receive safe empty draft, review-status and communication-history defaults when loaded.
- Existing sent decisions remain marked as sent.
- New shared email settings are created automatically under `emailSettings`.

## Replace your current project

1. Keep your current `.env.local` somewhere safe.
2. Unzip this release.
3. Copy everything **inside** the unzipped `f6-trials-manager-v0.6` folder into your existing local `f6-trials-manager` repository.
4. Choose **Replace** or **Merge** when macOS asks. Confirm that `.env.local` is still in the project root.
5. In the VS Code terminal, run:

   ```bash
   npm install
   npm run build
   npm run dev
   ```

6. Open the local address shown, normally `http://localhost:5173`.

## Test before pushing

1. Sign in with the existing club PIN and confirm existing players and team plans remain present.
2. Open **Settings**, add a default coach name/deadline and one team's training details, then save.
3. Open a player and choose Offer planned, Alternative offer, Waiting list planned or Rejection planned.
4. Open **Emails** and confirm the player appears in the correct message type.
5. Resolve any Needs info blockers and confirm the message moves to Ready to review.
6. Check the generated wording, copy the body and use **Open in email app** to confirm a populated draft opens. Do not send the test email.
7. Mark the message reviewed.
8. After a genuine message is sent, use **Mark as sent** and confirm an entry appears in Communication history.
9. Open a second browser, sign in and confirm queue and settings changes sync live.
10. Re-test one CSV import, player assessment and team-planner action.

When testing is complete, commit and push through GitHub Desktop with:

```text
Release v0.6 Email Centre
```

## Verification completed for this package

- `npm install`
- `npm run lint`
- `npm run build`
- Queue/filter and missing-information checks
- Draft readiness and review-status workflow
- Sent confirmation and communication-history recording
- Shared settings screen
- 390-pixel mobile layout
- Browser console error check
