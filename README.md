# MGS Exam System — Phase 1

Exam-management platform for **Moon Grammar School**: term exams, midterms, finals, results, and report cards. This is Phase 1 of the planned 15-phase build — the core architecture, database, auth, and dashboard.

Stack: **Node.js / Express / PostgreSQL**, matching the MGS Test System so the two can share data and auth patterns later.

## What's included in Phase 1

- Full project scaffold (routes / controllers / models / middleware / config)
- PostgreSQL schema: users, academic sessions, classes, sections, subjects, students, exams, exam date-sheet
- JWT authentication — the **first account registered automatically becomes admin**; everyone after defaults to `teacher` unless a role is specified
- Role-based access control (`admin`, `principal`, `teacher`, `coordinator`)
- REST APIs for academic sessions, classes, sections, subjects, exams, and exam date-sheets
- A dashboard API that reports total / upcoming / running / completed exams, class & subject counts, and auto-flips exam status (`upcoming → running → completed`) based on today's date
- A working dashboard UI (navy & gold, matching MGS branding) with login/registration, stat cards, an upcoming-exams table, and quick-action shortcuts to the modules coming in later phases

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` — set `DATABASE_URL` (or the discrete `PG*` vars) to your PostgreSQL instance, and set `JWT_SECRET` to a long random string.

### 3. Create the database and run migrations
```bash
createdb mgs_exam_system   # or create it however you normally do
npm run migrate
```
This applies `migrations/001_init.sql` (schema) and `migrations/002_seed.sql` (starter classes, sections, subjects, and the current academic session — safe to skip if you want an empty system).

### 4. Start the server
```bash
npm start          # production
npm run dev         # with nodemon, auto-restart on changes
```
The app serves both the API and the dashboard UI at `http://localhost:5000`.

### 5. Create your admin account
Open the app in a browser and use "Create the first admin account" — the very first registration becomes `admin` automatically. Every account after that defaults to `teacher`.

## API overview

All routes except `/api/health`, `/api/auth/register`, and `/api/auth/login` require `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Academic sessions | `GET/POST /api/sessions`, `GET /api/sessions/current`, `PUT/DELETE /api/sessions/:id` |
| Classes | `GET/POST /api/classes`, `PUT/DELETE /api/classes/:id`, plus nested `/sections` and `/subjects` |
| Sections | `GET /api/sections?classId=`, `PUT/DELETE /api/sections/:id` |
| Subjects | `GET /api/subjects?classId=`, `POST/PUT/DELETE /api/subjects/:id` |
| Exams | `GET/POST /api/exams`, `GET/PUT/DELETE /api/exams/:id`, plus `/schedule` (date sheet) sub-routes |
| Dashboard | `GET /api/dashboard/stats` |

Write access to sessions/classes/sections/subjects and exam management is restricted to `admin`, `principal`, and (for exams) `coordinator` roles.

## What's next (per the phased plan)

Phase 2 (classes/sections/students), Phase 3 (exam creation UI), Phase 4 (printable date sheets), Phase 5 (question papers), Phase 6 (exam attendance), Phase 7 (marks entry), Phase 8 (automatic result calculation), Phase 9 (result cards & gazette), Phase 10 (reports & analytics), Phase 11 (promotion), Phase 12–13 (MGS Test System / Fee System integration), Phase 14 (security & backups), Phase 15 (final UI polish & deployment).

The database schema, auth, and dashboard built in Phase 1 are designed so none of that needs to be redone — later phases add tables, routes, and UI views on top of this foundation.

## Notes

- Password hashing: bcrypt. Tokens: JWT, 7-day expiry by default (`JWT_EXPIRES_IN`).
- Exam status (`upcoming` / `running` / `completed`) is computed from `start_date`/`end_date` against the current date every time the dashboard or exam list is loaded — no cron job needed for Phase 1.
- `MGS_TEST_SYSTEM_API_URL` and `MGS_FEE_SYSTEM_API_URL` are placeholders in `.env.example` for the Phase 12/13 integrations.
