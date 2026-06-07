-- =========================================================================
-- Originally added an `image_data_url` column to SOPs (later renamed to
-- `attachment_data_url` by migration 010). We must NOT re-add the old column
-- once 010 has already renamed it — otherwise we end up with both columns
-- on the next boot and 010's RENAME fails with "column already exists".
--
-- Rule: only add image_data_url if NEITHER the old nor the new name exists.
-- =========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sops'
      AND column_name IN ('image_data_url', 'attachment_data_url')
  ) THEN
    ALTER TABLE sops ADD COLUMN image_data_url TEXT;
  END IF;
END $$;
