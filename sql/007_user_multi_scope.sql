-- =========================================================================
-- Phase 2b — Multi-brand / multi-department user scope
-- A user can now be assigned to multiple brands AND multiple departments.
-- The legacy single brand_id / department_id columns on `users` are kept as
-- a "primary" hint (and to avoid breaking existing reads), but the canonical
-- source of truth becomes the junction tables below.
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_brands (
  user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  brand_id    INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, brand_id)
);
CREATE INDEX IF NOT EXISTS idx_user_brands_brand ON user_brands(brand_id);

CREATE TABLE IF NOT EXISTS user_departments (
  user_id        INTEGER NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  department_id  INTEGER NOT NULL REFERENCES departments(id)  ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, department_id)
);
CREATE INDEX IF NOT EXISTS idx_user_depts_dept ON user_departments(department_id);

-- Backfill from the existing single-column hints (idempotent)
INSERT INTO user_brands (user_id, brand_id)
SELECT id, brand_id FROM users
WHERE brand_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO user_departments (user_id, department_id)
SELECT id, department_id FROM users
WHERE department_id IS NOT NULL
ON CONFLICT DO NOTHING;
