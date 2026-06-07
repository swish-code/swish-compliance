-- =========================================================================
-- Add an inline cover image to SOPs.
-- Stored as a base64 data URL directly in the row so it survives any
-- environment without needing object storage. Limit enforced at the
-- application layer (≤ 2 MB per image). For very large or many images
-- the right next step is a Railway volume or an external bucket.
-- =========================================================================

ALTER TABLE sops ADD COLUMN IF NOT EXISTS image_data_url TEXT;
