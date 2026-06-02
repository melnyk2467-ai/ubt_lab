# UBT Lab — Production Readiness Audit

> Audited: 2026-06-02  
> Branch: `master` (commit `420dd8b`)  
> Scope: backend security, worker access control, frontend, mobile layout, build/deploy pipeline

---

## Table of Contents

1. [Passed Checks](#1-passed-checks)
2. [Problems Found](#2-problems-found)
3. [Critical Fixes — Required Before Deploy](#3-critical-fixes--required-before-deploy)
4. [Nice-to-Have Fixes — After Deploy](#4-nice-to-have-fixes--after-deploy)
5. [Recommended Deploy Steps](#5-recommended-deploy-steps)
6. [Required Environment Variables](#6-required-environment-variables)

---

## 1. Passed Checks

### Security & Auth
- ✅ `requireAdmin` guards all destructive admin routes (accounts POST/PUT/DELETE, tasks POST/DELETE, offers, bundles, users CRUD, assignment-center, result-upload approve/reject, proxies POST/PUT/DELETE)
- ✅ `ownership.js` middleware covers 5 resource types: `own.account`, `own.task`, `own.video`, `own.metric`, `own.experiment`
- ✅ Workers cannot see other workers' data — all list endpoints filter by `req.user.id` or `assigned_worker_id = req.user.id`
- ✅ Proxy credentials properly masked: `password` and `username` replaced with `••••••••` for workers when `visible_to_worker = false` (proxies.js lines 19–26)
- ✅ JWT has 7-day expiry (`{ expiresIn: '7d' }`)
- ✅ Only 3 public routes: `GET /api/auth/status`, `POST /api/auth/login`, `POST /api/auth/setup`
- ✅ `/api/auth/setup` is blocked once any user exists (cannot create a second admin via setup)
- ✅ `GET /api/health` — public health check (no data exposure)
- ✅ `.gitignore` lists `backend/.env` — correct intention

### Database
- ✅ Supabase auto-detection: `db/index.js` checks if `DATABASE_URL` includes `supabase.co` and enables `ssl: { rejectUnauthorized: false }` accordingly
- ✅ All schema migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`)
- ✅ Schema applied on every startup — no manual migration steps needed
- ✅ Correct foreign key cascades throughout schema

### Build & Start Scripts
- ✅ Backend `package.json` has distinct `"start": "node src/index.js"` (production) and `"dev": "nodemon src/index.js"` (development)
- ✅ Frontend `package.json` has `"build": "vite build"` outputting to `frontend/dist/`
- ✅ Vite dev proxy configured: `/api` → `http://localhost:3001`

### Frontend Structure
- ✅ All imports in `App.jsx` resolve to existing files — no broken imports
- ✅ `<Protected>` wrapper redirects unauthenticated users to `/login` on every route
- ✅ `/proxies` route correctly renders `<Proxies>` for admins and `<MyProxies>` for workers
- ✅ Navigation items filtered by role in `Layout.jsx` — workers never see admin sidebar links
- ✅ `workerLabel` on nav items (e.g. "My Videos", "My Accounts") renders correctly for workers

### Mobile Layout
- ✅ Mobile hamburger button in `Layout.jsx` with overlay-to-close
- ✅ CSS breakpoints at 1100 / 900 / 768 / 480px
- ✅ Every data page implements the dual-layout pattern: `<div className="table-wrap hide-mobile">` + `<div className="mobile-cards">` (verified across Proxies, Workers, WorkerAssignment, Tasks, Accounts, ResultUploads)
- ✅ Mobile modal = bottom sheet
- ✅ Buttons and form controls meet 44px touch target minimum on mobile

### Worker Workspace
- ✅ WorkerDashboard scoped to own stats only (workspace.js endpoint)
- ✅ My Accounts — filtered by `accounts.user_id = req.user.id`
- ✅ My Tasks — filtered by `tasks.user_id = req.user.id`
- ✅ My Experiments — filtered by `experiments.assigned_worker_id = req.user.id`
- ✅ My Videos — joined through accounts where `user_id = req.user.id`
- ✅ My Proxies — filtered by `proxies.assigned_worker_id = req.user.id`
- ✅ My Uploads — filtered by `result_uploads.worker_id = req.user.id`
- ✅ Result Upload form only shows own tasks and experiments in source picker

---

## 2. Problems Found

### 🔴 CRITICAL

#### C1 — Real secrets committed to git
**File:** `backend/.env`

The file contains a live Supabase database URL (including password) and a real JWT_SECRET. It was committed to version control. Even though `.gitignore` now lists `backend/.env`, git history retains the values permanently until explicitly purged.

```
DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres
JWT_SECRET=6ba4924cf24ef4236667a441dbfee4572c0fc4c096eb76bf00aeaf2bead251ff
```

**Impact:** Anyone with repo read access can connect to the production database and forge JWTs.

---

#### C2 — No startup validation for critical env vars
**File:** `backend/src/index.js`

`JWT_SECRET` and `DATABASE_URL` are consumed without any check. If either is missing at deploy time, the server starts, then crashes on the first request (JWT) or on schema application (database).

---

#### C3 — CORS accepts all origins
**File:** `backend/src/index.js`, line 7

```js
app.use(cors());  // no options — accepts any origin
```

In production, any website can make credentialed requests to the API. Combined with localStorage-stored JWTs this is an OWASP Top-10 exposure.

---

### 🟠 HIGH

#### H1 — `/api/users` not admin-only
**File:** `backend/src/routes/users.js`

`GET /users` and `GET /users/:id` are protected by `requireAuth`, not `requireAdmin`. Any authenticated worker can enumerate all users, their emails, roles, and active status.

---

### 🟡 MEDIUM

#### M1 — No frontend route guards for admin pages
**File:** `frontend/src/App.jsx`

Routes like `/users`, `/offers`, `/assignment-center`, `/research/ideas`, `/research/patterns`, `/research/results`, `/research/winners` are wrapped only in `<Protected>` (authentication check), not in an admin-only guard. Workers never see these links in the sidebar, but if they type the URL manually, the page loads and then shows an error when the backend rejects the request.

Backend is the true enforcement layer (all routes are protected server-side), but the UX is poor and it leaks page structure.

---

#### M2 — Frontend API base URL is not environment-aware
**File:** `frontend/src/api/client.js`, line 1

```js
const BASE = '/api';
```

Hardcoded relative path. Works fine behind a reverse proxy but cannot be easily overridden for staging environments without a code change. No `VITE_API_URL` support.

---

#### M3 — JWT stored in localStorage
**File:** `frontend/src/contexts/AuthContext.jsx`

```js
localStorage.setItem('token', token);
```

localStorage is accessible to any JavaScript on the page. If an XSS vulnerability is introduced in the future, tokens can be exfiltrated. The current app has no visible XSS vectors, but this is standard security hygiene.

---

### 🔵 LOW

#### L1 — No `.env.example` file
There is no `backend/.env.example` documenting required variables for new developers or CI/CD setup.

#### L2 — Database pool error handler doesn't exit
**File:** `backend/src/db/index.js`

```js
pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
  // no process.exit — pool may be left in broken state
});
```

#### L3 — Workers can manually navigate to admin UI pages (UX)
Covered under M1 — backend is safe, but UX is poor.

#### L4 — Proxy `PUT /:id` does not handle worker/account assignment fields
**File:** `backend/src/routes/proxies.js`

The `PUT` update endpoint does not accept `assigned_worker_id` / `assigned_account_id` fields (they are managed through dedicated `/assign-worker` and `/assign-account` endpoints). This is intentional but undocumented and can confuse future developers.

---

## 3. Critical Fixes — Required Before Deploy

### Fix C1 — Purge secrets from git and rotate credentials

```bash
# Step 1: Remove .env from tracking (file stays on disk)
git rm --cached backend/.env
git commit -m "Remove .env from tracking"

# Step 2: Purge from full git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Step 3: Force push (coordinate with team)
git push origin --force --all

# Step 4: IMMEDIATELY rotate in Supabase dashboard:
#   - Database password (Settings → Database → Reset password)
#   - JWT_SECRET (generate a new one: openssl rand -hex 32)
#   - Invalidate all existing sessions (users will be logged out once)
```

Create `backend/.env.example` (never commit the real `.env`):

```env
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
JWT_SECRET=generate_with_openssl_rand_hex_32
PORT=3001
```

---

### Fix C2 — Add startup validation

In `backend/src/index.js`, add before the `start()` call:

```js
// Validate required env vars before attempting to start
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`FATAL: Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
```

---

### Fix C3 — Restrict CORS to production origin

In `backend/src/index.js`:

```js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

Add `CORS_ORIGIN` to `.env.example`:
```env
CORS_ORIGIN=https://your-production-domain.com
```

---

### Fix H1 — Protect user list endpoint

In `backend/src/routes/users.js`, change:

```js
// Before:
router.get('/',    requireAuth,  async (req, res) => { … });
router.get('/:id', requireAuth,  async (req, res) => { … });

// After:
router.get('/',    requireAdmin, async (req, res) => { … });
router.get('/:id', requireAdmin, async (req, res) => { … });
```

---

## 4. Nice-to-Have Fixes — After Deploy

### Add frontend AdminOnly route guard (fixes M1)

In `frontend/src/App.jsx`, add:

```jsx
function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}
```

Wrap admin-only routes with `<AdminOnly>` instead of `<Protected>`.

---

### Make API base URL configurable (fixes M2)

In `frontend/src/api/client.js`:

```js
const BASE = import.meta.env.VITE_API_URL || '/api';
```

Add to `.env.example` (frontend):
```env
VITE_API_URL=/api
```

---

### Migrate JWT to httpOnly cookies (fixes M3)

Requires backend changes to set `Set-Cookie` header on login and read cookie on each request. Only necessary if other XSS mitigations are absent. Medium-complexity change.

---

### Create `.env.example` (fixes L1)

Document all required variables so new developers and CI/CD pipelines can onboard without guessing.

---

### Add pool error exit (fixes L2)

```js
pool.on('error', (err) => {
  console.error('Unexpected DB error — exiting', err);
  process.exit(1);
});
```

---

## 5. Recommended Deploy Steps

### Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | Both backend and frontend |
| PostgreSQL 14+ **or** Supabase project | DB already running in Supabase per current config |
| A VPS / PaaS (Railway, Render, Fly.io, DigitalOcean) | Or any reverse-proxy-capable host |
| Domain name + SSL cert (Let's Encrypt) | Required for secure cookie and CORS |

---

### Step 1 — Rotate secrets (mandatory)

1. Supabase Dashboard → Settings → Database → Reset password → copy new connection string
2. Generate new JWT secret: `openssl rand -hex 32`
3. Never commit these values to git

---

### Step 2 — Set environment variables on the host

Set the following on your PaaS/VPS (via dashboard, secrets manager, or systemd env file — never in git):

```
DATABASE_URL=postgresql://postgres:NEWPASSWORD@db.PROJECT.supabase.co:5432/postgres
JWT_SECRET=<new 64-char hex>
PORT=3001
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
```

---

### Step 3 — Deploy backend

```bash
cd backend
npm install --production
npm start         # node src/index.js
```

Backend starts on `PORT` (default 3001). Schema is applied automatically on first startup.

---

### Step 4 — Build frontend

```bash
cd frontend
npm install
npm run build     # outputs to frontend/dist/
```

---

### Step 5 — Configure reverse proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Serve React frontend
    root /var/www/ubt/frontend/dist;
    index index.html;

    # API proxy → backend
    location /api/ {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # SPA fallback — all non-asset routes → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Step 6 — Verify deploy

- [ ] `GET https://your-domain.com/api/health` → `{ "ok": true }`
- [ ] Login with admin credentials
- [ ] Admin dashboard loads with data
- [ ] Create a worker user, log in as worker — sidebar shows worker-only items
- [ ] Worker cannot reach `/users` or other admin routes (backend returns 403)
- [ ] Mobile: sidebar hamburger opens/closes, tables switch to cards
- [ ] Result Upload: worker submits, admin reviews and approves, video appears in dashboard
- [ ] Proxy: admin creates proxy, assigns to worker, worker sees it in My Proxies (credentials hidden or shown based on `visible_to_worker`)

---

### Step 7 — Ongoing

- Set up process manager: `pm2 start npm --name ubt-api -- start` (in `backend/`)
- Enable `pm2 startup` to survive reboots
- Configure log rotation
- Set up Supabase connection pooling (PgBouncer) for production traffic
- Schedule regular database backups in Supabase Dashboard → Backups

---

## 6. Required Environment Variables

### Backend (`backend/.env` — never commit)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | **YES** | `postgresql://postgres:pass@host:5432/postgres` | Supabase or local PostgreSQL |
| `JWT_SECRET` | **YES** | `openssl rand -hex 32` output | 32+ char random string |
| `PORT` | No | `3001` | Defaults to 3001 |
| `CORS_ORIGIN` | Recommended | `https://your-domain.com` | Without this, CORS is wide-open |
| `NODE_ENV` | Recommended | `production` | Affects error verbosity |

### Frontend (`.env` in `frontend/` — optional for multi-env)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `VITE_API_URL` | No | `/api` | Override only if backend is on a different domain |

> **Note:** Frontend env vars prefixed with `VITE_` are baked into the build at compile time. They are **not secrets** — they are visible in the built JS bundle. Never put private keys here.

---

*Document generated: 2026-06-02 — covers commit `420dd8b` (Proxy Assignments v1)*
