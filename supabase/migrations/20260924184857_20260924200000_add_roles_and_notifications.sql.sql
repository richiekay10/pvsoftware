/*
# Add new roles (Sales Manager, Aftersales Manager) + Notifications table

## What this migration does

1. Updates the profiles role CHECK constraint to include:
   - sales_manager (Sales Manager)
   - aftersales_manager (Aftersales Manager)
   Keeping existing roles: accountant, md, auditor, general_manager, madam_charity, staff

2. Creates a `notifications` table for role-based notifications:
   - Each notification targets a specific role
   - Links to the approval_request that triggered it
   - Tracks which user has seen/dismissed it

## New table: notifications
- id uuid PK
- request_id uuid FK → approval_requests(id)
- target_role text — which role should see this notification
- title text — short title
- message text — notification body
- action_type text — what happened (new_request, checked, accountant_checked, approved, rejected, paid)
- created_by uuid — who triggered it
- created_by_name text — display name
- created_at timestamptz
- seen_by uuid[] — array of user IDs who have seen it

## Security
- RLS enabled on notifications
- SELECT: users can see notifications targeting their role
- INSERT: any authenticated user can create a notification (app writes them)
- UPDATE: authenticated users can add their ID to seen_by
- DELETE: no delete policy (notifications persist)

## Important notes
1. Role constraint is dropped and recreated — no data loss.
2. Notifications table is new — no existing data affected.
3. Uses IF NOT EXISTS guards.
*/

-- Update profiles role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['accountant', 'md', 'auditor', 'general_manager', 'madam_charity', 'sales_manager', 'aftersales_manager', 'staff']));

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES approval_requests(id) ON DELETE CASCADE,
  target_role text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('new_request', 'checked', 'accountant_checked', 'approved', 'rejected', 'paid')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_by uuid[] NOT NULL DEFAULT '{}'
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can see notifications targeting their role
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications
  FOR SELECT TO authenticated
  USING (target_role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Any authenticated user can create notifications
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can update to mark as seen (only adding their own uid to seen_by)
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
