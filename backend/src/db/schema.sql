-- UBT System Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'threads')),
  login TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'warmup' CHECK (status IN ('active', 'banned', 'warmup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  geo TEXT NOT NULL,
  payout FLOAT NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  angle TEXT,
  hook TEXT,
  concept TEXT,
  status TEXT NOT NULL DEFAULT 'testing' CHECK (status IN ('testing', 'working', 'dead')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  videos_required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RESEARCH ENGINE ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  creator_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES users(id),
  confidence_score INTEGER NOT NULL DEFAULT 5 CHECK (confidence_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pattern_ideas (
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  idea_id    UUID NOT NULL REFERENCES ideas(id)    ON DELETE CASCADE,
  PRIMARY KEY (pattern_id, idea_id)
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  linked_pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
  expected_result TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'testing', 'completed', 'failed')),
  creator_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id      UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  assigned_worker_id UUID REFERENCES users(id)    ON DELETE SET NULL,
  assigned_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  assigned_bundle_id UUID REFERENCES bundles(id)  ON DELETE SET NULL,
  start_date DATE,
  end_date   DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  views            INTEGER NOT NULL DEFAULT 0,
  likes            INTEGER NOT NULL DEFAULT 0,
  comments         INTEGER NOT NULL DEFAULT 0,
  shares           INTEGER NOT NULL DEFAULT 0,
  watch_time       INTEGER NOT NULL DEFAULT 0,
  conversion_notes TEXT,
  conclusion       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  linked_result_id UUID REFERENCES results(id)  ON DELETE SET NULL,
  linked_bundle_id UUID REFERENCES bundles(id)  ON DELETE SET NULL,
  winning_reason   TEXT,
  scaling_notes    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bundles_offer_id ON bundles(offer_id);
CREATE INDEX IF NOT EXISTS idx_videos_bundle_id ON videos(bundle_id);
CREATE INDEX IF NOT EXISTS idx_videos_account_id ON videos(account_id);
CREATE INDEX IF NOT EXISTS idx_metrics_video_id ON metrics(video_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_bundle_id ON notes(bundle_id);

-- ── Team Assignment System ────────────────────────────────────────────────────
-- Allow accounts to exist without an assigned worker (unassign support).
-- ALTER … DROP NOT NULL is idempotent in PostgreSQL — safe to run on every startup.
ALTER TABLE accounts ALTER COLUMN user_id DROP NOT NULL;

-- Research Engine indexes
CREATE INDEX IF NOT EXISTS idx_ideas_creator_id       ON ideas(creator_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status           ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_patterns_creator_id    ON patterns(creator_id);
CREATE INDEX IF NOT EXISTS idx_hypotheses_status      ON hypotheses(status);
CREATE INDEX IF NOT EXISTS idx_hypotheses_pattern_id  ON hypotheses(linked_pattern_id);
CREATE INDEX IF NOT EXISTS idx_experiments_hypothesis ON experiments(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_experiments_worker     ON experiments(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_results_experiment     ON results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_winners_result         ON winners(linked_result_id);

-- ── Future-Ready Assignment System ───────────────────────────────────────────
-- Generic assignment table for extensible resource types.
-- Existing resources (accounts, tasks, experiments) use their own FK columns.
-- New resource types (proxy, device, creative, farm) should add a row here
-- plus their own table, then reference this for the worker linkage.
CREATE TABLE IF NOT EXISTS worker_assignments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT        NOT NULL, -- 'proxy' | 'device' | 'creative' | 'farm' | …
  resource_id   UUID        NOT NULL,
  notes         TEXT,
  assigned_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker ON worker_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_type   ON worker_assignments(resource_type);

-- ── Result Upload Center ──────────────────────────────────────────────────────
-- Extend metrics with shares + watch_time (additive, no breakage)
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS shares     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS watch_time INTEGER NOT NULL DEFAULT 0;

-- Worker-submitted result uploads pending admin review.
-- On approve: a video + metric row is created and video_id is set here.
-- That keeps all existing dashboard/videos queries working unchanged.
CREATE TABLE IF NOT EXISTS result_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     UUID NOT NULL  REFERENCES users(id)       ON DELETE CASCADE,
  -- source (at least one should be set)
  task_id       UUID           REFERENCES tasks(id)       ON DELETE SET NULL,
  experiment_id UUID           REFERENCES experiments(id) ON DELETE SET NULL,
  -- denormalised at submit time for fast queries & analytics foundation
  bundle_id     UUID           REFERENCES bundles(id)     ON DELETE SET NULL,
  account_id    UUID           REFERENCES accounts(id)    ON DELETE SET NULL,
  hypothesis_id UUID           REFERENCES hypotheses(id)  ON DELETE SET NULL,
  -- result data
  video_url     TEXT NOT NULL,
  views         INTEGER NOT NULL DEFAULT 0,
  likes         INTEGER NOT NULL DEFAULT 0,
  comments      INTEGER NOT NULL DEFAULT 0,
  shares        INTEGER NOT NULL DEFAULT 0,
  watch_time    INTEGER NOT NULL DEFAULT 0, -- seconds
  notes         TEXT,
  screenshot_url TEXT,
  -- review workflow
  status        TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  admin_comment TEXT,
  reviewed_by   UUID           REFERENCES users(id)       ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  -- materialised video record (populated on approve)
  video_id      UUID           REFERENCES videos(id)      ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_result_uploads_worker     ON result_uploads(worker_id);
CREATE INDEX IF NOT EXISTS idx_result_uploads_status     ON result_uploads(status);
CREATE INDEX IF NOT EXISTS idx_result_uploads_task       ON result_uploads(task_id);
CREATE INDEX IF NOT EXISTS idx_result_uploads_experiment ON result_uploads(experiment_id);
CREATE INDEX IF NOT EXISTS idx_result_uploads_bundle     ON result_uploads(bundle_id);

-- ── Proxy Assignments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proxies (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  host                TEXT        NOT NULL,
  port                INTEGER     NOT NULL,
  username            TEXT,
  password            TEXT,
  type                TEXT        NOT NULL DEFAULT 'http'
    CHECK (type IN ('http', 'socks5', 'mobile', 'residential')),
  country             TEXT,
  status              TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'banned', 'testing')),
  notes               TEXT,
  assigned_worker_id  UUID        REFERENCES users(id)    ON DELETE SET NULL,
  assigned_account_id UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  visible_to_worker   BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proxies_worker  ON proxies(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_proxies_account ON proxies(assigned_account_id);
CREATE INDEX IF NOT EXISTS idx_proxies_status  ON proxies(status);

-- ── UBT Bundles (testing combinations) ───────────────────────────────────────
-- Separate from content `bundles` table which has FK chains to tasks/experiments.
CREATE TABLE IF NOT EXISTS test_bundles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'testing', 'winner', 'dead', 'retest')),
  geo             TEXT,
  offer           TEXT,
  source_platform TEXT,
  account_type    TEXT,
  proxy_setup     TEXT,
  creative_angle  TEXT,
  hypothesis      TEXT,
  owner_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
  start_date      DATE,
  end_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_bundles_status   ON test_bundles(status);
CREATE INDEX IF NOT EXISTS idx_test_bundles_geo      ON test_bundles(geo);
CREATE INDEX IF NOT EXISTS idx_test_bundles_platform ON test_bundles(source_platform);
CREATE INDEX IF NOT EXISTS idx_test_bundles_owner    ON test_bundles(owner_id);

-- ── Test Bundle Experiments ───────────────────────────────────────────────────
-- Individual tests/experiments within a UBT Bundle.
CREATE TABLE IF NOT EXISTS test_bundle_experiments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_bundle_id   UUID        NOT NULL REFERENCES test_bundles(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'running', 'waiting_result', 'completed', 'success', 'failed', 'retest')),
  test_goal        TEXT,
  variable_tested  TEXT,
  setup_notes      TEXT,
  start_date       DATE,
  end_date         DATE,
  result_summary   TEXT,
  conclusion       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbe_bundle ON test_bundle_experiments(test_bundle_id);
CREATE INDEX IF NOT EXISTS idx_tbe_status ON test_bundle_experiments(status);
