-- =========================================================================
-- Generalize the SOP cover image to any attachment (PDF / Word / Excel /
-- image). The base64 data URL column is renamed for clarity and gets two
-- new metadata columns: original file name and mime type.
-- =========================================================================

-- Rename the column only if it still has the old name (idempotent on re-run).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sops' AND column_name = 'image_data_url'
  ) THEN
    ALTER TABLE sops RENAME COLUMN image_data_url TO attachment_data_url;
  END IF;
END $$;

ALTER TABLE sops ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(120);
