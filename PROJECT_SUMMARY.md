# UBT Lab — Project Summary

> **Purpose of this document:** Complete architectural reference for continuing development in a new chat session. Read this before making any changes to the codebase.

---

## Table of Contents

1. [Stack & Architecture](#1-stack--architecture)
2. [Repository Structure](#2-repository-structure)
3. [Database Schema](#3-database-schema)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [Implemented Modules](#5-implemented-modules)
6. [Admin Features](#6-admin-features)
7. [Worker Features](#7-worker-features)
8. [Assignment System](#8-assignment-system)
9. [Result Upload System](#9-result-upload-system)
10. [API Reference](#10-api-reference)
11. [Frontend Structure](#11-frontend-structure)
12. [Design System](#12-design-system)
13. [Pending Roadmap](#13-pending-roadmap)

---

## 1. Stack & Architecture

### Backend
- **Runtime:** Node.js (CommonJS)
- **Framework:** Express 4
- **Database:** PostgreSQL (via `pg` driver, raw SQL — no ORM)
- **Auth:** JWT (`jsonwebtoken`), bcrypt password hashing
- **Dev server:** nodemon (auto-restart on file change)
- **Port:** 3001
- **Entry point:** `backend/src/index.js`
- **Schema:** Applied on every startup via `db.query(schema.sql)` — all statements use `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN IF NOT EXISTS` so they are idempotent

### Frontend
- **Framework:** React 18 + Vite 5
- **Routing:** React Router 6 (BrowserRouter)
- **Styling:** Plain CSS with CSS custom properties (no Tailwind, no CSS-in-JS)
- **Icons:** Lucide React (`lucide-react` ^1.17)
- **State:** React Context (AuthContext, ThemeContext) + local component state
- **HTTP:** Custom fetch wrapper (`frontend/src/api/client.js`) — base `/api`, auto-attaches JWT
- **Port:** 3000 (Vite dev server, proxies `/api` → `http://localhost:3001`)

### Dev Setup
```bash
# Backend
cd backend && npm run dev      # nodemon src/index.js

# Frontend
cd frontend && npm run dev     # vite (port 3000)
```

---

## 2. Repository Structure

```
UBT-system/
├── backend/
│   └── src/
│       ├── index.js                    # Express app + schema runner
│       ├── db/
│       │   └── schema.sql              # Full database schema (idempotent)
│       ├── middleware/
│       │   ├── auth.js                 # requireAuth, requireAdmin
│       │   └── ownership.js            # own.account/task/video/metric/experiment
│       └── routes/
│           ├── auth.js                 # /api/auth
│           ├── users.js                # /api/users
│           ├── accounts.js             # /api/accounts
│           ├── offers.js               # /api/offers
│           ├── bundles.js              # /api/bundles
│           ├── videos.js               # /api/videos
│           ├── metrics.js              # /api/metrics
│           ├── tasks.js                # /api/tasks
│           ├── notes.js                # /api/notes
│           ├── workers.js              # /api/workers
│           ├── workspace.js            # /api/workspace  (worker dashboard data)
│           ├── dashboard.js            # /api/dashboard  (admin dashboard data)
│           ├── assignment-center.js    # /api/assignment-center
│           ├── result-uploads.js       # /api/result-uploads
│           └── research/
│               ├── ideas.js            # /api/research/ideas
│               ├── patterns.js         # /api/research/patterns
│               ├── hypotheses.js       # /api/research/hypotheses
│               ├── experiments.js      # /api/research/experiments
│               ├── results.js          # /api/research/results
│               └── winners.js          # /api/research/winners
│
└── frontend/
    └── src/
        ├── main.jsx
        ├── App.jsx                     # Router + route definitions
        ├── index.css                   # Global design system (CSS variables, components)
        ├── api/
        │   └── client.js               # fetch wrapper (get/post/put/delete)
        ├── config/
        │   └── navigation.js           # Sidebar nav tree (Lucide icons, role filters)
        ├── contexts/
        │   ├── AuthContext.jsx          # user, token, login(), logout()
        │   └── ThemeContext.jsx         # theme ('dark'|'light'), toggleTheme()
        ├── components/
        │   ├── Layout.jsx               # Sidebar + main content shell
        │   └── Modal.jsx                # Reusable modal (title, children, footer)
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx            # Routes to WorkerDashboard if role=worker
            ├── Users.jsx
            ├── Accounts.jsx
            ├── Offers.jsx
            ├── Bundles.jsx
            ├── Videos.jsx
            ├── Metrics.jsx
            ├── Tasks.jsx
            ├── AssignmentCenter.jsx     # Worker cards overview
            ├── WorkerAssignment.jsx     # Per-worker assignment management
            ├── ResultUploads.jsx        # Upload list (admin: all; worker: own)
            ├── ResultUploadNew.jsx      # Worker upload form
            ├── ResultUploadDetail.jsx   # Detail + admin approve/reject
            ├── worker/
            │   └── WorkerDashboard.jsx  # Worker home (scoped stats + panels)
            ├── team/
            │   ├── Workers.jsx          # Worker list with stats
            │   └── WorkerProfile.jsx    # Full worker profile
            └── research/
                ├── Ideas.jsx
                ├── Patterns.jsx
                ├── Hypotheses.jsx
                ├── Experiments.jsx
                ├── Results.jsx
                └── Winners.jsx
```

---

## 3. Database Schema

All tables in PostgreSQL. UUIDs as primary keys (`gen_random_uuid()`).

### Core Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | |
| `email` | TEXT UNIQUE | |
| `password_hash` | TEXT | bcrypt |
| `role` | TEXT | `'admin'` or `'worker'` |
| `is_active` | BOOLEAN | default true |
| `created_at` | TIMESTAMPTZ | |

#### `accounts`
Social media accounts assigned to workers.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID → users | **nullable** (unassigned state) |
| `platform` | TEXT | `tiktok`, `instagram`, `youtube`, `threads` |
| `login` | TEXT | |
| `status` | TEXT | `warmup`, `active`, `banned` |
| `created_at` | TIMESTAMPTZ | |

#### `offers`
Advertiser offers with payout.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | |
| `geo` | TEXT | e.g. `US`, `UK` |
| `payout` | FLOAT | dollars |
| `notes` | TEXT | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

#### `bundles`
Content templates linked to an offer.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `offer_id` | UUID → offers | |
| `name` | TEXT | |
| `angle` | TEXT | |
| `hook` | TEXT | |
| `concept` | TEXT | |
| `status` | TEXT | `testing`, `working`, `dead` |
| `created_by` | UUID → users | |
| `created_at` | TIMESTAMPTZ | |

#### `videos`
Posted videos linked to an account + bundle.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `account_id` | UUID → accounts | |
| `bundle_id` | UUID → bundles | |
| `url` | TEXT | |
| `description` | TEXT | |
| `posted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

> **Note:** Videos are created manually via the Videos page OR automatically when a `result_upload` is approved.

#### `metrics`
Performance snapshots for a video (append-only, latest = most recent).
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `video_id` | UUID → videos | |
| `views` | INTEGER | |
| `likes` | INTEGER | |
| `comments` | INTEGER | |
| `shares` | INTEGER | added in Result Upload Center v1 |
| `watch_time` | INTEGER | seconds; added in Result Upload Center v1 |
| `collected_at` | TIMESTAMPTZ | |

#### `tasks`
Work assignments given to workers.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID → users | the assigned worker |
| `bundle_id` | UUID → bundles | |
| `videos_required` | INTEGER | |
| `status` | TEXT | `pending`, `in_progress`, `done` |
| `created_at` | TIMESTAMPTZ | |

#### `notes`
Internal notes attached to bundles (admin use).
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `bundle_id` | UUID → bundles | |
| `text` | TEXT | |
| `created_by` | UUID → users | |
| `created_at` | TIMESTAMPTZ | |

### Research Engine Tables

#### `ideas`
Raw content observations / inspiration.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT | |
| `description` | TEXT | |
| `source` | TEXT | e.g. `TikTok`, `competitor` |
| `creator_id` | UUID → users | |
| `status` | TEXT | `new`, `reviewing`, `archived` |
| `created_at` | TIMESTAMPTZ | |

#### `patterns`
Recurring observations extracted from ideas.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT | |
| `description` | TEXT | |
| `creator_id` | UUID → users | |
| `confidence_score` | INTEGER | 1–10 |
| `created_at` | TIMESTAMPTZ | |

#### `pattern_ideas` (junction)
| `pattern_id` | UUID → patterns |
| `idea_id` | UUID → ideas |
| Composite PK |

#### `hypotheses`
Testable statements derived from patterns.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT | the hypothesis statement |
| `description` | TEXT | |
| `linked_pattern_id` | UUID → patterns | nullable |
| `expected_result` | TEXT | |
| `priority` | TEXT | `low`, `medium`, `high` |
| `status` | TEXT | `planned`, `testing`, `completed`, `failed` |
| `creator_id` | UUID → users | |
| `created_at` | TIMESTAMPTZ | |

#### `experiments`
Live tests of a hypothesis.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `hypothesis_id` | UUID → hypotheses | |
| `assigned_worker_id` | UUID → users | nullable |
| `assigned_account_id` | UUID → accounts | nullable |
| `assigned_bundle_id` | UUID → bundles | nullable |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `status` | TEXT | `active`, `completed` |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

#### `results` (research results)
Outcome data recorded for a completed experiment.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `experiment_id` | UUID → experiments | |
| `views` | INTEGER | |
| `likes` | INTEGER | |
| `comments` | INTEGER | |
| `shares` | INTEGER | |
| `watch_time` | INTEGER | seconds |
| `conversion_notes` | TEXT | |
| `conclusion` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

#### `winners`
Promoted winning concepts ready to scale.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT | |
| `linked_result_id` | UUID → results | nullable |
| `linked_bundle_id` | UUID → bundles | nullable |
| `winning_reason` | TEXT | |
| `scaling_notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### Assignment & Upload Tables

#### `worker_assignments` (future-ready)
Generic extensible assignment registry for resource types not yet built.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `worker_id` | UUID → users | |
| `resource_type` | TEXT | `'proxy'`, `'device'`, `'creative'`, `'farm'`, … |
| `resource_id` | UUID | ID in the resource-specific table |
| `notes` | TEXT | |
| `assigned_by` | UUID → users | nullable |
| `assigned_at` | TIMESTAMPTZ | |
| UNIQUE | `(worker_id, resource_type, resource_id)` | |

> **Do NOT query this table for accounts/tasks/experiments** — those use their own FK columns. This table is for future resource types only.

#### `result_uploads`
Worker-submitted video results pending admin review.
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `worker_id` | UUID → users | |
| `task_id` | UUID → tasks | nullable — source task |
| `experiment_id` | UUID → experiments | nullable — source experiment |
| `bundle_id` | UUID → bundles | **denormalised at submit** |
| `account_id` | UUID → accounts | **denormalised at submit** |
| `hypothesis_id` | UUID → hypotheses | **denormalised at submit** |
| `video_url` | TEXT | |
| `views` | INTEGER | |
| `likes` | INTEGER | |
| `comments` | INTEGER | |
| `shares` | INTEGER | |
| `watch_time` | INTEGER | seconds |
| `notes` | TEXT | |
| `screenshot_url` | TEXT | |
| `status` | TEXT | `pending_review`, `approved`, `rejected` |
| `admin_comment` | TEXT | |
| `reviewed_by` | UUID → users | |
| `reviewed_at` | TIMESTAMPTZ | |
| `video_id` | UUID → videos | set on approve (materialised record) |
| `created_at` | TIMESTAMPTZ | |

---

## 4. User Roles & Access Control

### Roles
| Role | Description |
|------|-------------|
| `admin` | Full access to all pages, data, and management actions |
| `worker` | Read/write access scoped strictly to their own assigned resources |

### Auth Flow
1. `POST /api/auth/login` → returns JWT
2. JWT stored in `localStorage` via `AuthContext`
3. All API requests send `Authorization: Bearer <token>`
4. Backend middleware: `requireAuth` (any role), `requireAdmin` (admin only)
5. Worker ownership checks via `middleware/ownership.js` (`own.account`, `own.task`, `own.video`, etc.)

### First-Time Setup
- `GET /api/auth/status` → `{ has_users: bool }`
- If `false`, Login page shows "Set up admin account" link
- `POST /api/auth/setup` creates the first admin (blocked once users exist)

### Security Rules
- Workers **cannot** see other workers' data at any level (API filters by `req.user.id`)
- Workers **cannot** access Assignment Center (`requireAdmin` on all routes)
- Workers **cannot** approve/reject result uploads (`isAdmin` check in route)
- All worker-facing list endpoints filter by `user_id = req.user.id` or `assigned_worker_id = req.user.id`

---

## 5. Implemented Modules

### 5.1 Authentication
- Login / logout
- JWT-based sessions
- First-run admin setup wizard
- Dark/light theme toggle on login page

### 5.2 Dashboard
- **Admin Dashboard** (`/`): stat cards for Content, Research, Team; top bundles by avg views; top workers by video count; worker overview table; research funnel visualisation
- **Worker Dashboard** (`/`): personal stat cards; open tasks panel with "✓ Done" quick action; assigned accounts; active experiments; recent videos; **Upload Result** button

### 5.3 Research Engine
Full pipeline from raw ideas to proven winners:

| Stage | Page | Route | Access |
|-------|------|-------|--------|
| Ideas | `/research/ideas` | `ideas.js` | Admin (write), Worker (read) |
| Patterns | `/research/patterns` | `patterns.js` | Admin only |
| Hypotheses | `/research/hypotheses` | `hypotheses.js` | Admin only |
| Experiments | `/research/experiments` | `experiments.js` | Admin (write), Worker (read own) |
| Results | `/research/results` | `results.js` | Admin only |
| Winners | `/research/winners` | `winners.js` | Admin only |

### 5.4 Content Management
| Page | Route | Features |
|------|-------|---------|
| Bundles | `/bundles` | CRUD, offer link, angle/hook/concept, status (testing/working/dead) |
| Videos | `/videos` | CRUD, linked to account + bundle, colour-coded views |
| Metrics | `/metrics` | Append metrics snapshots to videos |

### 5.5 Team Management
| Page | Route | Features |
|------|-------|---------|
| Users | `/users` | CRUD, role assignment, password management |
| Workers | `/workers` | Worker list with stats (accounts, tasks, experiments, videos) |
| Worker Profile | `/workers/:id` | Full profile: accounts, tasks, experiments, videos |
| Accounts | `/accounts` | CRUD, platform, status, worker assignment |
| Tasks | `/tasks` | CRUD with inline quick-assign and status change |

### 5.6 Offers
| Page | Route | Features |
|------|-------|---------|
| Offers | `/offers` | CRUD, GEO, payout, active/paused status |

### 5.7 Analytics
| Page | Route | Features |
|------|-------|---------|
| Metrics | `/metrics` | Video performance tracking, filter by video, colour thresholds |

### 5.8 Assignment Center
Dedicated admin control panel for distributing resources to workers.

### 5.9 Result Upload Center
Worker → Admin review pipeline for video results.

---

## 6. Admin Features

### Global Access
- View and manage all workers, accounts, tasks, experiments, videos, metrics
- Full CRUD on all entities
- Inline quick-actions in tables (status dropdowns, reassignment selects)

### Research Pipeline
- Create and manage the full idea → winner pipeline
- View research funnel on admin dashboard

### Assignment Center (`/assignment-center`)
- Grid of worker cards with live stats (accounts, tasks, experiments, videos, total views)
- Click **Manage Assignments** → per-worker view at `/assignment-center/:workerId`
- **Accounts block:** assign unassigned accounts, remove assignments
- **Tasks block:** create new tasks directly for a worker, remove (delete) tasks
- **Experiments block:** assign unassigned experiments, unassign

### Result Upload Review
- `/result-uploads` — full list with filters: worker, bundle, experiment, status, date range
- Yellow banner shows count of pending reviews
- Click any row → `/result-uploads/:id` — detail view
- **Approve:** creates `videos` + `metrics` row (stats update automatically)
- **Reject:** marks status, comment stored and visible to worker
- Both actions record `reviewed_by` and `reviewed_at`

### Dashboard Integration
Admin dashboard reads directly from `videos` + `metrics` tables, so approved result uploads are counted immediately in all stat cards and tables.

---

## 7. Worker Features

### Scoped Workspace (`/`)
Worker Dashboard shows only their own data:
- Assigned accounts count
- Open tasks count (pending + in_progress)
- Active experiments count
- Videos uploaded
- Total views
- Best video views

### My Accounts (`/accounts`)
- View accounts assigned to them (read-only)
- No ability to reassign or see other workers' accounts

### My Tasks (`/tasks`)
- View tasks assigned to them
- Read-only — no create/delete
- Status badge only (no inline selects)

### My Experiments (`/research/experiments`)
- View experiments assigned to them
- Can see hypothesis, bundle, account, dates, status

### My Videos (`/videos`)
- View videos linked to their accounts
- Can add/edit videos themselves

### My Uploads (`/result-uploads`)
- View own result uploads with status badges (Pending Review / Approved / Rejected)
- See admin comment on rejected uploads
- Upload Result form at `/result-uploads/new`

### Upload Result Form (`/result-uploads/new`)
- Source selector: Task or Experiment (only shows worker's open tasks / active experiments)
- Account picker (from worker's assigned accounts; auto-fills from experiment if available)
- Fields: video URL*, views*, likes, comments, shares, watch time, screenshot URL, notes
- Submits to `pending_review` — worker sees status update once admin reviews

---

## 8. Assignment System

### How Assignments Are Stored

| Resource | FK column | Table | Nullability |
|----------|-----------|-------|------------|
| Account → Worker | `accounts.user_id` | accounts | Nullable (unassigned = NULL) |
| Task → Worker | `tasks.user_id` | tasks | NOT NULL (task is always owned by a worker) |
| Experiment → Worker | `experiments.assigned_worker_id` | experiments | Nullable |

### Assignment Center API (`/api/assignment-center`)
All routes require admin.

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/` | All workers with stats |
| GET | `/:workerId` | Worker detail + assigned resources + available pools |
| POST | `/:workerId/accounts/:accountId` | Sets `accounts.user_id = workerId` |
| DELETE | `/:workerId/accounts/:accountId` | Sets `accounts.user_id = NULL` |
| POST | `/:workerId/tasks` | Creates new task with `user_id = workerId` |
| DELETE | `/:workerId/tasks/:taskId` | Deletes the task row |
| POST | `/:workerId/experiments/:experimentId` | Sets `experiments.assigned_worker_id = workerId` |
| DELETE | `/:workerId/experiments/:experimentId` | Sets `experiments.assigned_worker_id = NULL` |

### Available Pools
The `GET /:workerId` endpoint also returns:
- `pool_accounts` — accounts where `user_id IS NULL`
- `pool_experiments` — experiments where `assigned_worker_id IS NULL`
- `bundles` — active bundles (not `dead`) for task creation

### Future-Ready Table
`worker_assignments` is pre-built for resource types not yet implemented. When adding proxies, devices, creatives, or farms:
1. Create the resource table
2. Insert a row: `(worker_id, resource_type='proxy', resource_id=proxy.id)`
3. No changes to existing tables or routes needed

---

## 9. Result Upload System

### Flow
```
Worker → /result-uploads/new
  → Selects Task or Experiment (own only)
  → Fills metrics (views required)
  → POST /api/result-uploads
      → auto-resolves bundle_id, account_id, hypothesis_id
      → status = 'pending_review'

Admin → /result-uploads
  → Sees pending banner
  → Clicks result → /result-uploads/:id
  → Reviews video URL, metrics, context chain, screenshot
  → POST /:id/approve
      → INSERT INTO videos (account_id, bundle_id, url)
      → INSERT INTO metrics (video_id, views, likes, comments, shares, watch_time)
      → UPDATE result_uploads SET video_id = new_id, status = 'approved'
  → OR POST /:id/reject
      → UPDATE result_uploads SET status = 'rejected', admin_comment = …

Dashboard auto-updates:
  Approved upload → new videos row linked to worker's account
  → workspace.js queries videos JOIN accounts WHERE accounts.user_id = worker_id
  → stat cards update automatically, no extra code needed
```

### Auto-Link Chain
At submit time, the backend resolves and stores:
- `bundle_id` — from `tasks.bundle_id` or `experiments.assigned_bundle_id`
- `account_id` — from form selection or `experiments.assigned_account_id`
- `hypothesis_id` — from `experiments.hypothesis_id` (NULL if source is task only)

From `hypothesis_id`, further joins in the detail query resolve:
- `pattern_title` — via `hypotheses.linked_pattern_id → patterns.title`
- `offer_name` — via `bundle_id → bundles.offer_id → offers.name`

This structure supports future analytics: avg views by bundle, win rate per hypothesis, top patterns — all queryable without schema changes.

### Status Lifecycle
```
pending_review → approved (video + metric created)
             ↘ rejected  (no video created, comment stored)
```
Once reviewed, status is final (re-review not supported in current version).

---

## 10. API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/status` | None | `{ has_users }` — first-run check |
| POST | `/auth/setup` | None | Create first admin (blocked if users exist) |
| POST | `/auth/login` | None | Returns `{ token, user }` |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Any | List all users |
| POST | `/users` | Admin | Create user |
| PUT | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |

### Accounts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/accounts` | Any | List — admin: all+filters; worker: own only |
| POST | `/accounts` | Admin | Create account |
| PUT | `/accounts/:id` | Admin | Update (worker: ownership checked) |
| DELETE | `/accounts/:id` | Admin | Delete |

### Offers, Bundles, Notes
Standard CRUD at `/offers`, `/bundles`, `/notes`.

### Videos
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/videos` | Any | Admin: all; worker: own accounts only |
| POST | `/videos` | Any | Worker: must own the account |
| PUT | `/videos/:id` | Any | Ownership checked for workers |
| DELETE | `/videos/:id` | Any | Ownership checked for workers |

### Metrics
Standard CRUD at `/metrics`. Workers can only touch metrics on their own videos.

### Tasks
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/tasks` | Any | Filters: user_id, status, bundle_id; worker sees own only |
| POST | `/tasks` | Admin | Create task |
| PUT | `/tasks/:id` | Admin | Update (worker: can only update status of own tasks) |
| DELETE | `/tasks/:id` | Admin | Delete |

### Workers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/workers` | Any | All workers with assignment stats |
| GET | `/workers/:id` | Any | Full profile: accounts, tasks, experiments, videos, metrics summary |

### Workspace
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/workspace` | Any | Current user's scoped dashboard data |

### Dashboard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Admin | Admin dashboard aggregates |

### Research Engine
All under `/research/` prefix. Standard CRUD for each entity. Workers can read ideas + experiments assigned to them. All other research endpoints are admin-only.

### Assignment Center
All require admin. See [Section 8](#8-assignment-system) for full table.

### Result Uploads
See [Section 9](#9-result-upload-system) for full flow.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/result-uploads/context` | Any | Worker's tasks/experiments/accounts for form |
| GET | `/result-uploads` | Any | List — admin: all+filters; worker: own |
| POST | `/result-uploads` | Any | Submit upload |
| GET | `/result-uploads/:id` | Any | Detail (worker: own only) |
| POST | `/result-uploads/:id/approve` | Admin | Approve + materialise video |
| POST | `/result-uploads/:id/reject` | Admin | Reject with comment |

---

## 11. Frontend Structure

### Routes (`App.jsx`)
```
/login                         Login
/                              Dashboard (→ WorkerDashboard if worker)
/users                         Users (admin)
/accounts                      Accounts
/offers                        Offers (admin)
/bundles                       Bundles (admin)
/videos                        Videos
/metrics                       Metrics
/tasks                         Tasks
/workers                       Workers (admin)
/workers/:id                   Worker Profile (admin)
/research/ideas                Ideas
/research/patterns             Patterns (admin)
/research/hypotheses           Hypotheses (admin)
/research/experiments          Experiments
/research/results              Results (admin)
/research/winners              Winners (admin)
/assignment-center             Assignment Center (admin)
/assignment-center/:workerId   Worker Assignment view (admin)
/result-uploads                Result Uploads list
/result-uploads/new            Upload form (worker)
/result-uploads/:id            Upload detail + review
```

All routes are wrapped in `<Protected>` which redirects to `/login` if not authenticated.

### Navigation (`config/navigation.js`)
The sidebar nav tree is defined here as a JS array. Each entry is either:
- `{ type: 'link', to, label, icon, roles }` — standalone link
- `{ type: 'group', label, icon, roles, items[] }` — collapsible group

`roles: null` = all users, `roles: ['admin']` = admin only, `roles: ['worker']` = worker only.

`workerLabel` on group items renders a different label for workers (e.g. "Accounts" → "My Accounts").

Icons are **Lucide React components**, not emoji strings. Layout renders them as `<Icon size={15} strokeWidth={1.75} />`.

### Current Navigation Tree
```
Dashboard          (LayoutDashboard)   — all roles

Research           (FlaskConical)      — all roles
  ├── Ideas        (Lightbulb)         — admin
  ├── Patterns     (Sparkles)          — admin
  ├── Hypotheses   (Brain)             — admin
  ├── Experiments  (Beaker)            — all  [worker: "My Experiments"]
  ├── Results      (BarChart3)         — admin
  └── Winners      (Trophy)            — admin

Content            (PlaySquare)        — all roles
  ├── Bundles      (Package)           — admin
  ├── Videos       (PlaySquare)        — all  [worker: "My Videos"]
  └── Result Uploads (Upload)          — all  [worker: "My Uploads"]

Team               (Users)             — all roles
  ├── Users        (Users)             — admin
  ├── Workers      (UserCheck)         — admin
  ├── Accounts     (UserCircle)        — all  [worker: "My Accounts"]
  ├── Tasks        (CheckSquare)       — all  [worker: "My Tasks"]
  └── Assignment Center (ClipboardList) — admin

Offers             (Tag)               — admin
  └── Offers       (Tag)               — admin

Analytics          (TrendingUp)        — all roles
  └── Metrics      (TrendingUp)        — all  [worker: "My Metrics"]
```

---

## 12. Design System

### CSS Architecture (`index.css`)
- All styling via CSS custom properties on `:root` (dark) and `[data-theme="light"]`
- No Tailwind, no CSS modules — single global stylesheet
- Theme toggled by setting `data-theme` attribute on `<html>` via `ThemeContext`

### Key CSS Variables
```css
--bg            background
--surface       card / panel background
--surface-2     secondary surface (hover states, table headers)
--border        default border
--text          primary text
--text-muted    secondary / label text
--text-soft     body text
--accent        primary blue (#638cff dark / #3b6ef0 light)
--accent-dim    accent at 12% opacity
--success       green
--warning       orange
--danger        red
--radius        10px  (default)
--radius-lg     14px  (cards, modals)
--radius-xl     20px  (login box, modal on mobile)
--sidebar-w     260px
```

### Responsive Breakpoints
| Breakpoint | Behaviour |
|-----------|-----------|
| `>1100px` | Full layout, 40px padding |
| `900px` | Panel grid collapses to 1 col, card grid narrows |
| `768px` | Sidebar collapses to off-canvas drawer, cards replace tables |
| `480px` | Further compact adjustments, single-column card grid |

### Mobile Table Pattern
Every data table has two siblings controlled by CSS:
```jsx
<div className="table-wrap hide-mobile">  {/* hidden at ≤768px */}
  <table>…</table>
</div>
<div className="mobile-cards">  {/* hidden at >768px */}
  {items.map(item => <div className="mc-card">…</div>)}
</div>
```

### Component Classes
| Class | Usage |
|-------|-------|
| `.card` | Standard content card (14px radius, shadow-sm) |
| `.stat-card` | Dashboard metric card with corner glow hover |
| `.btn` `.btn-primary/secondary/danger/ghost` | Buttons (38px min-height, 44px on mobile) |
| `.badge` `.badge-active/banned/pending/testing/…` | Status pills |
| `.form-control` | Inputs, selects, textareas (42px min-height, 46px mobile) |
| `.modal-overlay` `.modal` | Modal (bottom sheet on mobile) |
| `.page-header` `.page-title` | Page title row |
| `.filter-bar` | Filter controls row |
| `.table-wrap` | Horizontal scroll container |
| `.mc-card` `.mc-head` `.mc-meta` `.mc-stats` `.mc-actions` | Mobile card sub-components |

---

## 13. Pending Roadmap

The following features are **not yet built** but the data structure is ready or partially prepared:

### High Priority
- **Proxy assignments** — `worker_assignments` table is ready, just needs a `proxies` table + UI
- **Advanced analytics** — avg views, median views, win rate per hypothesis/pattern/idea. All data is denormalised in `result_uploads` and queryable today
- **Result re-review** — currently once approved/rejected, status is final; could allow admin to re-open
- **Notifications** — no in-app notifications when admin reviews a worker's upload

### Medium Priority
- **Device assignments** — same pattern as proxies via `worker_assignments`
- **Creative assignments** — creative assets linked to workers
- **Farm assignments** — device farm / sim farm management
- **Worker performance reports** — per-worker stats page beyond the current profile
- **Bundle analytics** — avg views by bundle over time, conversion rate
- **Experiment auto-close** — mark experiments complete when end_date passes

### Low Priority / Future
- **File uploads** — screenshot field currently accepts a URL; could add direct upload to object storage
- **Webhook integrations** — post result data to external analytics platforms
- **CSV export** — download result uploads or metrics as CSV
- **Pagination** — all list endpoints currently return all rows; large datasets need cursor/offset pagination
- **Search** — global search across bundles, hypotheses, workers
- **Comments/activity log** — audit trail per entity
- **Two-factor auth** — no 2FA currently

### Schema Extension Points
| Future resource | How to add |
|----------------|-----------|
| Proxies | Add `proxies` table + use `worker_assignments(resource_type='proxy')` |
| Devices | Add `devices` table + use `worker_assignments(resource_type='device')` |
| Creatives | Add `creatives` table + use `worker_assignments(resource_type='creative')` |
| Farms | Add `farms` table + use `worker_assignments(resource_type='farm')` |

---

*Last updated: 2026-06-02 — covers commits up to `075b4e0` (UI/UX overhaul).*
