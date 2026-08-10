# F6 Club Manager v0.22

## New dashboard shortcuts

- The top of the coach dashboard now contains three clickable boxes for Starred players, Recommended players and Email deadlines.
- Each box opens a complete player list without leaving the dashboard.
- Selecting a player opens their Overview, Assessment or Email tab as appropriate.
- Personal stars stay private, while recommendations respect each coach or Team administrator's assigned teams.

## Receipt-based response deadlines

- Offers and waiting-list messages ask for a reply within 72 hours of receiving the email.
- The outgoing wording also asks the player to contact the club if they need more time.
- The response clock begins when a coach records the email as sent.
- Sent emails display the exact deadline, due-soon warning and overdue state on the dashboard, in the Email Centre and on the player profile.
- Draft emails explain that the response window has not started yet.
- The previous trial-session calculation and fallback deadline control are no longer used.

## Compatibility

- Existing sent communication records already contain a send timestamp and are supported automatically.
- No Firebase migration, security-rule change or new GitHub secret is required.
