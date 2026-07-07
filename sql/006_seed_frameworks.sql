-- =========================================================================
-- RETIRED (2026-07-07, user decision): this file used to seed six demo
-- frameworks (ISO22000, HACCP, PIC1976, CIVDEF, OHS, CUSTSAT) on every
-- deploy via ON CONFLICT DO NOTHING. The real GRC now comes from the
-- SOP_GRC workbook import, and the re-seeding kept resurrecting empty
-- placeholder frameworks after each deploy. Kept as a no-op so the
-- numbered migration sequence stays intact.
-- =========================================================================
SELECT 1;
