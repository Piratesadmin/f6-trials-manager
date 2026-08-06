# F6 Club Manager v0.15.1

This maintenance release replaces the unsupported Realtime Database rules call `numChildren()`.

The corrected rule uses only supported `child()`, `exists()` and `val()` checks. It still enforces that a Team administrator has no more than one team and rejects unknown team names.

Replace and publish the complete `firebase-database-rules.json`. No application configuration or GitHub secret changes are required.
