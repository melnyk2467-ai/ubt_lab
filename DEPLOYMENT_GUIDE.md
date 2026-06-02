# UBT Lab — Deployment Guide

> Stack: **Vercel** (frontend) · **Render** (backend) · **Supabase** (database)  
> Last updated: 2026-06-02

---

## Quick Reference

| Property | Value |
|---|---|
| Frontend build command | `npm run build` |
| Frontend output directory | `dist` |
| Frontend root directory | `frontend` |
| Backend build command | *(none — Node.js, no compile step)* |
| Backend start command | `npm start` |
| Backend root directory | `backend` |
| Node version (recommended) | 18.x or 20.x |

---

## Is the codebase deploy-ready without additional changes?

**Almost — one code change is required before deploying.**

The frontend API client hardcodes the base URL as `/api` (relative path):

```js
// frontend/src/api/client.js
const BASE = '/api';
```

On Vercel, the frontend is a static site served from a CDN. It has no server to proxy `/api` requests to the backend. In production, `/api` calls will return 404 unless you either:

1. **(Recommended — no code change)** Configure a Vercel rewrite rule in `vercel.json` to proxy `/api/*` → your Render backend URL, **or**
2. Change `client.js` to use `import.meta.env.VITE_API_URL` and set that variable in Vercel.

**Option 1 (vercel.json rewrite) requires no code changes and is covered in the deploy steps below.** Everything else is deploy-ready as-is.

---

## Part 1 — Supabase (Database)

Supabase is already in use. No migration scripts are needed — the backend applies the schema automatically on every startup via `CREATE TABLE IF NOT EXISTS`.

### Steps

1. Log in to [supabase.com](https://supabase.com) → open your project
2. Go to **Settings → Database**
3. Copy the **Connection string** (URI format) — it looks like:
   ```
   postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
   ```
4. Keep this string — you'll paste it as `DATABASE_URL` in Render

### Notes

- The backend auto-detects Supabase and enables SSL (`rejectUnauthorized: false`) — no extra config needed
- Supabase free tier pauses after 1 week of inactivity — upgrade to Pro for production
- Enable **Row Level Security (RLS)** on Supabase tables only if you ever use the Supabase client directly; the current backend uses a direct `pg` connection and enforces access at the API layer

---

## Part 2 — Render (Backend)

### Create a new Web Service

1. [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (testing) or Starter $7/mo (production) |

### Environment Variables

Add these in Render → **Environment → Environment Variables**:

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | **YES** | Your Supabase connection string |
| `JWT_SECRET` | **YES** | Run `openssl rand -hex 32` — paste the output |
| `ALLOWED_ORIGINS` | **YES** | Your Vercel frontend URL (see below) |
| `PORT` | No | Render sets this automatically — do not set it |
| `NODE_ENV` | Recommended | `production` |

#### `ALLOWED_ORIGINS` value for production

Once your Vercel deployment is live, set this to your exact frontend URL:

```
ALLOWED_ORIGINS=https://your-app-name.vercel.app
```

If you have a custom domain:
```
ALLOWED_ORIGINS=https://your-custom-domain.com
```

Multiple origins (e.g. Vercel preview + production):
```
ALLOWED_ORIGINS=https://your-app-name.vercel.app,https://your-custom-domain.com
```

> **Important:** No trailing slash. No wildcards. Exact origin match only.

### First deploy behaviour

On first boot, Render runs `npm start` → `node src/index.js`. The backend will:
1. Validate `DATABASE_URL` and `JWT_SECRET` — exits immediately with a clear error if either is missing
2. Connect to Supabase and apply the full schema (`CREATE TABLE IF NOT EXISTS` — safe to run on existing data)
3. Start listening on the port Render assigns

After deploy, verify with:
```
GET https://your-render-service.onrender.com/api/health
→ {"ok":true}
```

> **Free tier note:** Render free services spin down after 15 minutes of inactivity and take ~30 seconds to cold-start. Use the Starter plan ($7/mo) for a production app.

---

## Part 3 — Vercel (Frontend)

### Option A — Deploy via Vercel Dashboard (recommended)

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. Add Environment Variables (see below)
5. Click **Deploy**

### Option B — Deploy via Vercel CLI

```bash
npm i -g vercel
cd frontend
vercel --prod
```

Follow the prompts — set root to `frontend`, build to `npm run build`, output to `dist`.

### Environment Variables on Vercel

The current `client.js` uses a hardcoded `/api` base path. **No Vercel environment variables are needed** if you use the `vercel.json` rewrite approach below.

If you later switch to `VITE_API_URL`:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-render-service.onrender.com/api` |

### Critical: vercel.json rewrite (required for API calls to work)

Create `frontend/vercel.json` with the following content — replace the destination with your actual Render URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-render-service.onrender.com/api/:path*"
    }
  ]
}
```

This proxies all `/api/*` requests from the Vercel CDN to your Render backend, so the hardcoded `/api` base URL in `client.js` works without any code changes.

> **Commit this file** — Vercel reads it from the repo on every deploy.

---

## Part 4 — Deployment Order

Deploy in this sequence to avoid broken states:

```
1. Supabase    — already running, copy DATABASE_URL
2. Render      — deploy backend, set all env vars, verify /api/health
3. Vercel      — deploy frontend (needs Render URL for vercel.json and ALLOWED_ORIGINS)
```

---

## Part 5 — Post-Deploy Verification Checklist

Run these checks after each service is live:

### Backend (Render)
- [ ] `GET /api/health` → `{"ok":true}`
- [ ] Render logs show `Schema applied` and `API running on http://localhost:PORT`
- [ ] No `FATAL: Missing required environment variables` in logs

### Frontend (Vercel)
- [ ] App loads at Vercel URL — login page appears
- [ ] No console errors in browser DevTools

### End-to-End
- [ ] Admin login succeeds
- [ ] Worker login succeeds
- [ ] Worker `GET /api/users` → 403 (not 404)
- [ ] Admin dashboard loads with data
- [ ] Assignment Center opens
- [ ] Proxy page opens
- [ ] Worker sees My Proxies (credentials hidden unless `visible_to_worker = true`)
- [ ] Worker submits a Result Upload → admin can approve → video appears in dashboard
- [ ] Mobile: sidebar hamburger works, tables switch to cards

### CORS verification
```bash
# Should succeed (your Vercel origin):
curl -H "Origin: https://your-app-name.vercel.app" \
     https://your-render-service.onrender.com/api/health

# Should be blocked (random origin):
curl -H "Origin: https://evil.example.com" \
     https://your-render-service.onrender.com/api/health
```

---

## Part 6 — Environment Variable Summary

### Backend (set in Render dashboard)

| Variable | Required | How to get |
|---|---|---|
| `DATABASE_URL` | **YES** | Supabase → Settings → Database → URI |
| `JWT_SECRET` | **YES** | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | **YES** | Your Vercel URL, e.g. `https://ubt-lab.vercel.app` |
| `NODE_ENV` | Recommended | Set to `production` |

### Frontend (set in Vercel dashboard — only if switching from vercel.json approach)

| Variable | Required | Value |
|---|---|---|
| `VITE_API_URL` | No (if using vercel.json) | `https://your-render-service.onrender.com/api` |

---

## Part 7 — One Remaining Code Change (Optional)

If you prefer not to use `vercel.json` rewrites, update the API client to support an environment variable:

**`frontend/src/api/client.js` line 1:**
```js
// Before:
const BASE = '/api';

// After:
const BASE = import.meta.env.VITE_API_URL || '/api';
```

Then set `VITE_API_URL=https://your-render-service.onrender.com/api` in Vercel environment variables. This is more explicit and works without a proxy.

Both approaches are valid. The `vercel.json` approach requires zero code changes.

---

*Document covers commit `1cc2a3f` (Production security fixes)*
