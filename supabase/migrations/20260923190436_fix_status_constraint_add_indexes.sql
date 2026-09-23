/*
# Fix status constraint and add performance indexes

## What this migration does

1. **Fixes a critical bug in the status check constraint**: The original constraint only allowed
   'pending', 'approved', 'rejected', 'paid' — it was missing 'checked'. This means the auditor
   could never actually mark a request as checked because the database would reject the update.
   This migration drops the old constraint and creates a new one that includes all 5 statuses.

2. **Adds performance indexes** on the most frequently queried columns so the app stays fast
   even with a full year of payment voucher data (thousands of rows):
   - `approval_requests_status_idx` — the status column is filtered on every page load and in the dashboard metrics
   - `approval_requests_created_at_idx` — all lists are sorted by created_at descending
   - `approval_requests_request_type_idx` — the Approved PVs view filters by request_type + status
   - `approval_requests_status_type_idx` — composite index for the common "approved payment vouchers" query

## Security changes
- None. No RLS policy or access control changes.

## Important notes
1. The constraint drop/recreate is safe — it only affects the CHECK constraint, not the data.
2. All indexes use `IF NOT EXISTS` so re-running this migration is safe.
3. These indexes will make dashboard metric calculations, filtered lists, and the Approved PVs
   view all fast even with thousands of rows accumulated over a year.
*/

-- Fix the status check constraint to include 'checked'
ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'checked'::text, 'approved'::text, 'rejected'::text, 'paid'::text]));

-- Performance indexes for year-scale data
CREATE INDEX IF NOT EXISTS approval_requests_status_idx ON approval_requests (status);
CREATE INDEX IF NOT EXISTS approval_requests_created_at_idx ON approval_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS approval_requests_request_type_idx ON approval_requests (request_type);
CREATE INDEX IF NOT EXISTS approval_requests_status_type_idx ON approval_requests (status, request_type);
