/*
# Add staff profiles, approval chain, and role-based access

1. New Tables
- `profiles` stores staff members and their roles.
  - `id` links to auth.users.
  - `full_name` display name.
  - `role` one of: accountant, md, auditor, general_manager, madam_charity, staff.

2. Modified Tables
- `approval_requests` gains:
  - `requested_by` uuid (nullable) links to auth.users when submitter is logged in.
  - `requested_by_name` text so anyone can attach their name.
  - `checked_by`, `checked_at`, `checked_by_name` for the auditor check step.
  - `approved_by`, `approved_at`, `approved_by_name` for the MD approval step.
  - `paid_by`, `paid_at`, `paid_by_name` for the accountant payment step.

3. Security
- RLS on profiles. Authenticated users read all profiles. Users insert/update only their own row.
- approval_requests: anon can still INSERT. SELECT is public. UPDATE/DELETE restricted to authenticated.

4. Notes
- No data lost — all new columns are nullable or have defaults.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('accountant', 'md', 'auditor', 'general_manager', 'madam_charity', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS requested_by_name text NOT NULL DEFAULT 'Anonymous';
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS checked_by_name text;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS checked_at timestamptz;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS approved_by_name text;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS paid_by_name text;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DROP POLICY IF EXISTS "shared_update_approval_requests" ON public.approval_requests;
CREATE POLICY "shared_update_approval_requests" ON public.approval_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shared_delete_approval_requests" ON public.approval_requests;
CREATE POLICY "shared_delete_approval_requests" ON public.approval_requests
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS approval_requests_requested_by_idx ON public.approval_requests(requested_by);
