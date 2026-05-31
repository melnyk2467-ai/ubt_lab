# UBT System

Internal tool for managing organic traffic arbitrage: workers, social accounts, video uploads, bundles, and performance tracking.

## Stack

- **Backend**: Node.js + Express + PostgreSQL (`pg` driver, raw SQL)
- **Frontend**: React + Vite
- **Auth**: Custom JWT (email + password) — Supabase Auth is not used
- **Database**: Supabase (hosted PostgreSQL) or local PostgreSQL

---

## Quick Start

### Option A — Supabase (recommended)

#### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Wait for the project to finish provisioning (~1 min).

#### 2. Get the connection string

1. Open your project dashboard.
2. Go to **Project Settings → Database → Connection string → URI**.
3. Copy the URI — it looks like:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   > ⚠️ **Use port 5432** (direct connection). Do **not** use port 6543 (the PgBouncer pooler) — the schema auto-apply on startup requires a persistent session connection.

#### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and paste your Supabase URI as `DATABASE_URL`. Also set `JWT_SECRET`:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your_long_random_secret   # openssl rand -hex 32
PORT=3001
```

#### 4. Start the backend

```bash
npm install
npm run dev
```

On first start the backend auto-applies `src/db/schema.sql` — all 8 tables and indexes are created in your Supabase database automatically. You can verify in the Supabase dashboard under **Table Editor**.

---

### Option B — Local PostgreSQL

#### 1. Create the database

```sql
CREATE DATABASE ubt_system;
```

#### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ubt_system
JWT_SECRET=your_long_random_secret
PORT=3001
```

#### 3. Start the backend

```bash
npm install
npm run dev
```

---

### Frontend (same for both options)

```bash
cd frontend
npm install
npm run dev
```

The UI runs on **http://localhost:3000**.

---

### First Login

Open **http://localhost:3000** and click **"Set up admin account"** to create the first admin user. After that, log in normally. All subsequent users are created from the Users page inside the app.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection URI (Supabase or local) |
| `JWT_SECRET` | ✅ | Secret for signing JWTs — use a long random string |
| `PORT` | optional | API port, defaults to `3001` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/setup | Create first admin |
| GET/POST | /api/users | List / create users |
| GET/PUT/DELETE | /api/users/:id | User CRUD |
| GET/POST | /api/accounts | List / create accounts |
| GET/PUT/DELETE | /api/accounts/:id | Account CRUD |
| GET/POST | /api/offers | List / create offers |
| GET/PUT/DELETE | /api/offers/:id | Offer CRUD |
| GET/POST | /api/bundles | List / create bundles |
| GET/PUT/DELETE | /api/bundles/:id | Bundle CRUD |
| GET/POST | /api/videos | List / create videos |
| GET/PUT/DELETE | /api/videos/:id | Video CRUD |
| GET/POST | /api/metrics | List / create metrics |
| GET/PUT/DELETE | /api/metrics/:id | Metric CRUD |
| GET/POST | /api/tasks | List / create tasks |
| GET/PUT/DELETE | /api/tasks/:id | Task CRUD |
| GET/POST | /api/notes | List / create notes |
| DELETE | /api/notes/:id | Delete note |
| GET | /api/dashboard | Dashboard stats |

### Query filters

- `GET /api/videos?bundle_id=...`
- `GET /api/videos?account_id=...`
- `GET /api/bundles?offer_id=...`
- `GET /api/metrics?video_id=...`
- `GET /api/accounts?user_id=...`
- `GET /api/tasks?user_id=...`
- `GET /api/notes?bundle_id=...`

## Environment Variables

```
# Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Local PostgreSQL
# DATABASE_URL=postgresql://postgres:password@localhost:5432/ubt_system

JWT_SECRET=your_long_random_secret_here
PORT=3001
```
