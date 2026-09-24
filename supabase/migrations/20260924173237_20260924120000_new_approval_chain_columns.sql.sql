/*
# New approval chain: Auditor → Accountant → MD (final) / GM (≤500)

## What this migration does

Replaces the old single-step "checked → approved" chain with a clearer
multi-step chain:

1. Auditor checks the request (existing `checked_by` / `checked_at` columns)
2. Accountant reviews/verifies (NEW `accountant_checked_by`, `accountant_checked_at`,
   `accountant_checked_name`, `accountant_checked_signature` columns)
3. MD gives final approval (existing `approved_by` / `approved_at` columns) —
   the MD is always the final approver for amounts > 500
4. For amounts ≤ 500, the General Manager can approve instead of the MD

The status constraint is updated to include 'accountant_checked' so the
chain can track: pending → checked → accountant_checked → approved/paid.

## New columns on approval_requests
- `accountant_checked_by` uuid — links to auth.users for the accountant review step
- `accountant_checked_name` text — display name of the accountant
- `accountant_checked_at` timestamptz — when the accountant reviewed
- `accountant_checked_signature` text — accountant's signature data URL

## Modified columns
- Status constraint updated to include 'accountant_checked'

## Security
- No RLS or policy changes. Existing UPDATE policy already covers these columns.

## Important notes
1. All new columns are nullable — no data loss.
2. Existing records keep their current status and approval data.
3. Uses IF NOT EXISTS guards for idempotency.
*/

ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS accountant_checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS accountant_checked_name text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS accountant_checked_at timestamptz;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS accountant_checked_signature text;

-- Update status constraint to include 'accountant_checked'
ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'checked'::text, 'accountant_checked'::text, 'approved'::text, 'rejected'::text, 'paid'::text]));
