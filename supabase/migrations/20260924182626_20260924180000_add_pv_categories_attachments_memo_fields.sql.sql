/*
# Add PV categories, file attachments, and memo-specific columns

## What this migration does

1. Adds `pv_category` column to classify payment vouchers:
   - general, fuel, electricity, water, rent, transport, maintenance, supplies, other
   - Only applies to payment_voucher type; memoranda default to 'general'

2. Adds `attachment_url` column to store a URL to an uploaded file
   (proforma, invoice, or receipt) attached to a PV.

3. Adds memo-specific columns for the separate memorandum form:
   - `memo_to` — who the memo is addressed to
   - `memo_from` — who it's from
   - `memo_cc` — cc'd parties
   - `memo_reference` — a reference line

## New columns on approval_requests
- `pv_category` text (default 'general') — categorizes the PV
- `attachment_url` text (nullable) — URL to uploaded file in storage
- `memo_to` text (nullable) — memo addressee
- `memo_from` text (nullable) — memo sender
- `memo_cc` text (nullable) — memo cc
- `memo_reference` text (nullable) — memo reference line

## Security
- No RLS changes. Existing UPDATE policy covers new columns.
- A storage bucket 'pv-attachments' is created for file uploads.

## Important notes
1. All new columns are nullable or have safe defaults — no data loss.
2. Uses IF NOT EXISTS guards for idempotency.
*/

ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS pv_category text NOT NULL DEFAULT 'general'
  CHECK (pv_category IN ('general', 'fuel', 'electricity', 'water', 'rent', 'transport', 'maintenance', 'supplies', 'other'));
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS memo_to text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS memo_from text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS memo_cc text;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS memo_reference text;

-- Create storage bucket for PV attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('pv-attachments', 'pv-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to pv-attachments
DROP POLICY IF EXISTS "auth_upload_pv_attachments" ON storage.objects;
CREATE POLICY "auth_upload_pv_attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pv-attachments');

-- Allow public read of pv-attachments
DROP POLICY IF EXISTS "public_read_pv_attachments" ON storage.objects;
CREATE POLICY "public_read_pv_attachments" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'pv-attachments');

-- Allow authenticated users to delete their own uploads
DROP POLICY IF EXISTS "auth_delete_pv_attachments" ON storage.objects;
CREATE POLICY "auth_delete_pv_attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pv-attachments');
