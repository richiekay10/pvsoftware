/*
# Add signature columns to approval_requests

## What this migration does

Adds three new columns to store handwritten signatures captured on screen
when each approval step is completed:

1. `checked_signature` (text, nullable) — stores the auditor's signature as a
   base64-encoded PNG data URL when they mark a request as checked.
2. `approved_signature` (text, nullable) — stores the MD/GM's signature when
   they approve a request.
3. `paid_signature` (text, nullable) — stores the accountant's signature when
   they mark a request as paid.

## Security changes
- None. No RLS or policy changes. The existing UPDATE policy already allows
  authenticated users to update these columns.

## Important notes
1. All three columns are nullable and use TEXT type to store data URLs.
2. Uses IF NOT EXISTS guard for idempotency.
3. No data is lost — existing rows simply have NULL signatures until someone
   re-signs.
*/

ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS checked_signature text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_signature text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS paid_signature text;
