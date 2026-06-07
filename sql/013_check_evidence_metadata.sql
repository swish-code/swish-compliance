-- =========================================================================
-- Check results — allow attaching a real file (PDF / Word / Excel / image)
-- instead of a URL string. The file is stored inline in evidence_url as a
-- base64 data URL; these two columns carry the filename and MIME type so
-- the UI can render a proper download link and icon.
-- =========================================================================

ALTER TABLE check_results
  ADD COLUMN IF NOT EXISTS evidence_name VARCHAR(255);

ALTER TABLE check_results
  ADD COLUMN IF NOT EXISTS evidence_mime VARCHAR(120);
