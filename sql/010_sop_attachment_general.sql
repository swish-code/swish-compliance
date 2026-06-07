-- =========================================================================
-- Generalize the SOP cover image to any attachment (PDF / Word / Excel /
-- image). The base64 data URL column is renamed for clarity and gets two
-- new metadata columns.
--
-- Self-healing: covers every possible current state of the table.
--   Case A — only image_data_url     → rename to attachment_data_url
--   Case B — only attachment_data_url → nothing (already migrated)
--   Case C — BOTH columns exist       → drop the old image_data_url
--                                       (can happen after a previous
--                                       interrupted deploy left both in place)
--   Case D — NEITHER column exists    → create attachment_data_url
-- =========================================================================

DO $$
BEGIN
  -- Case C: both columns exist → drop the legacy one
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'sops' AND column_name = 'image_data_url')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sops' AND column_name = 'attachment_data_url') THEN
    ALTER TABLE sops DROP COLUMN image_data_url;

  -- Case A: only the old column exists → rename it
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'sops' AND column_name = 'image_data_url') THEN
    ALTER TABLE sops RENAME COLUMN image_data_url TO attachment_data_url;

  -- Case D: neither exists → just create the new one
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'sops' AND column_name = 'attachment_data_url') THEN
    ALTER TABLE sops ADD COLUMN attachment_data_url TEXT;
  END IF;
  -- Case B falls through silently — nothing to do.
END $$;

ALTER TABLE sops ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
ALTER TABLE sops ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(120);
