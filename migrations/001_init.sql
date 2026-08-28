-- MGS Exam System — Phase 1 schema
-- Core structure: sessions, classes, sections, subjects, users, exams, schedule, students

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- Users (admin / teacher / principal) — reused as exam-system operators
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL DEFAULT 'teacher'
                  CHECK (role IN ('admin', 'principal', 'teacher', 'coordinator')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================
-- Academic sessions (e.g. 2026-2027)
-- ==========================================================
CREATE TABLE IF NOT EXISTS academic_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,      -- e.g. "2026-2027"
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one session can be "current" at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_current_session
  ON academic_sessions ((is_current))
  WHERE is_current = true;

-- ==========================================================
-- Classes (e.g. Class 1, Class 9, O-Level)
-- ==========================================================
CREATE TABLE IF NOT EXISTS classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,             -- e.g. "Class 9"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);

-- ==========================================================
-- Sections (e.g. A, B, Rose)
-- ==========================================================
CREATE TABLE IF NOT EXISTS sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,             -- e.g. "A"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, name)
);

-- ==========================================================
-- Subjects (global catalogue, linked to classes via class_subjects)
-- ==========================================================
CREATE TABLE IF NOT EXISTS subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(20) UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE (class_id, subject_id)
);

-- ==========================================================
-- Students
-- ==========================================================
CREATE TABLE IF NOT EXISTS students (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no   VARCHAR(30) UNIQUE NOT NULL,
  full_name      VARCHAR(150) NOT NULL,
  roll_number    VARCHAR(20),
  class_id       UUID REFERENCES classes(id) ON DELETE SET NULL,
  section_id     UUID REFERENCES sections(id) ON DELETE SET NULL,
  photo_url      TEXT,
  guardian_name  VARCHAR(150),
  status         VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'graduated', 'left')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_class_section ON students (class_id, section_id);

-- ==========================================================
-- Exams
-- ==========================================================
CREATE TABLE IF NOT EXISTS exams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(150) NOT NULL,       -- e.g. "Mid Term Examination"
  exam_type         VARCHAR(30) NOT NULL DEFAULT 'term'
                       CHECK (exam_type IN ('term', 'midterm', 'final', 'test', 'other')),
  session_id        UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  class_id          UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id        UUID REFERENCES sections(id) ON DELETE CASCADE,  -- NULL = all sections
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'upcoming'
                       CHECK (status IN ('upcoming', 'running', 'completed', 'cancelled')),
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exams_session ON exams (session_id);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams (class_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams (status);

-- ==========================================================
-- Exam schedule / date sheet — one row per subject paper within an exam
-- ==========================================================
CREATE TABLE IF NOT EXISTS exam_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id    UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date     DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  duration_mins INTEGER NOT NULL,
  total_marks   INTEGER NOT NULL DEFAULT 100,
  passing_marks INTEGER NOT NULL DEFAULT 33,
  room          VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_schedule_exam ON exam_schedule (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_date ON exam_schedule (exam_date);

-- ==========================================================
-- Trigger to auto-update updated_at columns
-- ==========================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_exams_updated_at ON exams;
CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
