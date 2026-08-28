-- Optional starter data — safe to run once. Uses ON CONFLICT to stay idempotent.

INSERT INTO academic_sessions (name, start_date, end_date, is_current)
VALUES ('2026-2027', '2026-08-01', '2027-05-31', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO classes (name, sort_order) VALUES
  ('Playgroup', 0), ('Nursery', 1), ('KG', 2),
  ('Class 1', 3), ('Class 2', 4), ('Class 3', 5), ('Class 4', 6), ('Class 5', 7),
  ('Class 6', 8), ('Class 7', 9), ('Class 8', 10), ('Class 9', 11), ('Class 10', 12),
  ('O-Level', 13), ('A-Level', 14)
ON CONFLICT (name) DO NOTHING;

INSERT INTO subjects (name, code) VALUES
  ('English', 'ENG'), ('Urdu', 'URD'), ('Mathematics', 'MATH'),
  ('Science', 'SCI'), ('Physics', 'PHY'), ('Chemistry', 'CHEM'),
  ('Biology', 'BIO'), ('Computer Science', 'CS'), ('Islamiat', 'ISL'),
  ('Pakistan Studies', 'PST'), ('Social Studies', 'SST'), ('Art', 'ART')
ON CONFLICT (name) DO NOTHING;

-- Sections A/B for every class
INSERT INTO sections (class_id, name)
SELECT c.id, s.name
FROM classes c
CROSS JOIN (VALUES ('A'), ('B')) AS s(name)
ON CONFLICT (class_id, name) DO NOTHING;
