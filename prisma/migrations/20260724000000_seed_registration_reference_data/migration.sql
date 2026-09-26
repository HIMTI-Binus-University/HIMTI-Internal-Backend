BEGIN;

-- ============================================================
-- UNIVERSITY
-- Preserve an existing row ID when BINUS University already exists.
-- ============================================================

INSERT INTO "universities" (
  "id",
  "name",
  "shortName",
  "status"
)
VALUES (
  'university-binus',
  'BINUS University',
  'BINUS',
  'ACTIVE'
)
ON CONFLICT ("name") DO UPDATE
SET
  "shortName" = EXCLUDED."shortName",
  "status" = EXCLUDED."status";


-- ============================================================
-- REGIONS
-- ============================================================

INSERT INTO "regions" (
  "id",
  "name",
  "shortName",
  "status"
)
VALUES
  ('alam-sutera', 'Alam Sutera', 'Alam Sutera', 'ACTIVE'),
  ('bandung', 'Bandung', 'Bandung', 'ACTIVE'),
  ('bekasi', 'Bekasi', 'Bekasi', 'ACTIVE'),
  ('kemanggisan', 'Kemanggisan', 'Kemanggisan', 'ACTIVE'),
  ('malang', 'Malang', 'Malang', 'ACTIVE'),
  ('medan', 'Medan', 'Medan', 'ACTIVE'),
  ('semarang', 'Semarang', 'Semarang', 'ACTIVE'),
  ('senayan', 'Senayan', 'Senayan', 'ACTIVE')
ON CONFLICT ("name") DO UPDATE
SET
  "shortName" = EXCLUDED."shortName",
  "status" = EXCLUDED."status";


-- ============================================================
-- STUDY PROGRAMS
-- Existing IDs are preserved when the name already exists.
-- This protects users that already reference the existing
-- CS Regular or CS Global records.
-- ============================================================

INSERT INTO "study_programs" (
  "id",
  "name",
  "shortName",
  "status"
)
VALUES
  (
    'sp-artificial-intelligence',
    'Artificial Intelligence',
    'AI',
    'ACTIVE'
  ),
  (
    'sp-computer-science-global',
    'Computer Science - Global Class',
    'CS Global',
    'ACTIVE'
  ),
  (
    'sp-computer-science-regular',
    'Computer Science - Regular Class',
    'CS Regular',
    'ACTIVE'
  ),
  (
    'sp-computer-science-master',
    'Computer Science - Master Track',
    'CS Master',
    'ACTIVE'
  ),
  (
    'sp-computer-science-software-engineering',
    'Computer Science - Software Engineering',
    'CS Software Engineering',
    'ACTIVE'
  ),
  (
    'sp-cyber-security',
    'Cyber Security',
    'Cyber Security',
    'ACTIVE'
  ),
  (
    'sp-data-science',
    'Data Science',
    'Data Science',
    'ACTIVE'
  ),
  (
    'sp-digital-psychology',
    'Digital Psychology',
    'Digital Psychology',
    'ACTIVE'
  ),
  (
    'sp-game-application-technology',
    'Game Application and Technology',
    'GAT',
    'ACTIVE'
  )
ON CONFLICT ("name") DO UPDATE
SET
  "shortName" = EXCLUDED."shortName",
  "status" = EXCLUDED."status";

COMMIT;
