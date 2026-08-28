-- MGS Exam System — Phases 2-15 schema additions
-- Attendance, marks, question papers, remarks, promotion, settings

-- ==========================================================
-- Exam attendance (Phase 6)
-- ==========================================================
CREATE TABLE IF NOT EXISTS exam_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL DEFAULT 'present'
                CHECK (status IN ('present', 'absent')),
  marked_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, subject_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_exam_subject ON exam_attendance (exam_id, subject_id);

-- ==========================================================
-- Exam marks (Phase 7 & 8)
-- ==========================================================
CREATE TABLE IF NOT EXISTS exam_marks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id        UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id     UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(6,2),
  is_absent      BOOLEAN NOT NULL DEFAULT false,
  entered_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, subject_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_marks_exam_subject ON exam_marks (exam_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON exam_marks (student_id);

-- ==========================================================
-- Student remarks per exam (Phase 9)
-- ==========================================================
CREATE TABLE IF NOT EXISTS student_remarks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id           UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_remark    TEXT,
  principal_remark  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

-- ==========================================================
-- Question papers & questions (Phase 5)
-- ==========================================================
CREATE TABLE IF NOT EXISTS question_papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id    UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  version       VARCHAR(5) NOT NULL DEFAULT 'A',
  title         VARCHAR(200) NOT NULL,
  instructions  TEXT,
  total_marks   INTEGER NOT NULL DEFAULT 100,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, subject_id, version)
);

CREATE TABLE IF NOT EXISTS paper_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id        UUID NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
  question_type   VARCHAR(20) NOT NULL DEFAULT 'short'
                    CHECK (question_type IN ('mcq', 'short', 'long', 'numerical', 'practical')),
  question_text   TEXT NOT NULL,
  options         JSONB,          -- for MCQ: ["a","b","c","d"]
  correct_answer  TEXT,
  marks           INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paper_questions_paper ON paper_questions (paper_id);

-- ==========================================================
-- Promotion system (Phase 12)
-- ==========================================================
CREATE TABLE IF NOT EXISTS promotions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_session_id  UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  to_session_id    UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  from_class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
  to_class_id      UUID REFERENCES classes(id) ON DELETE SET NULL,
  from_section_id  UUID REFERENCES sections(id) ON DELETE SET NULL,
  to_section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'promoted'
                     CHECK (status IN ('promoted', 'retained', 'graduated')),
  remarks          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promotions_student ON promotions (student_id);

-- ==========================================================
-- App settings — key/value store (Phase 14: security & settings, branding)
-- ==========================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('school_name', 'Moon Grammar School'),
  ('grade_scale', '[{"min":90,"grade":"A+"},{"min":80,"grade":"A"},{"min":70,"grade":"B"},{"min":60,"grade":"C"},{"min":50,"grade":"D"},{"min":33,"grade":"E"},{"min":0,"grade":"F"}]'),
  ('mgs_test_system_api_url', ''),
  ('mgs_fee_system_api_url', '')
ON CONFLICT (key) DO NOTHING;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON exam_attendance;
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON exam_attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_marks_updated_at ON exam_marks;
CREATE TRIGGER trg_marks_updated_at BEFORE UPDATE ON exam_marks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_remarks_updated_at ON student_remarks;
CREATE TRIGGER trg_remarks_updated_at BEFORE UPDATE ON student_remarks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_papers_updated_at ON question_papers;
CREATE TRIGGER trg_papers_updated_at BEFORE UPDATE ON question_papers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
