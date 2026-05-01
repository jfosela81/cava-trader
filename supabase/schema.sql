-- ============================================================
-- CAVA TRADER — Tablas Supabase
-- Ejecutar este SQL en el dashboard de Supabase (SQL Editor)
-- Prefijo "cava_" para coexistir con las tablas del BTC trader
-- ============================================================

-- ── cava_trades ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cava_trades (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy       TEXT        NOT NULL CHECK (strategy IN ('european_close', 'institutional_push', 'mean_reversion')),
  direction      TEXT        NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price    DECIMAL     NOT NULL,
  entry_time     TIMESTAMPTZ NOT NULL,
  exit_price     DECIMAL,
  exit_time      TIMESTAMPTZ,
  stop_loss      DECIMAL     NOT NULL,
  take_profit    DECIMAL     NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'closed_tp', 'closed_sl', 'closed_manual', 'closed_eod')),
  pnl_percent    DECIMAL,
  pnl_dollars    DECIMAL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cava_trades_status      ON cava_trades (status);
CREATE INDEX IF NOT EXISTS idx_cava_trades_entry_time  ON cava_trades (entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_cava_trades_strategy    ON cava_trades (strategy);

-- ── cava_portfolio ────────────────────────────────────────────
-- Solo debe existir una fila. Usa upsert para actualizarla.
CREATE TABLE IF NOT EXISTS cava_portfolio (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_capital  DECIMAL     NOT NULL DEFAULT 10000,
  current_capital  DECIMAL     NOT NULL DEFAULT 10000,
  total_trades     INT         NOT NULL DEFAULT 0,
  winning_trades   INT         NOT NULL DEFAULT 0,
  losing_trades    INT         NOT NULL DEFAULT 0,
  total_pnl        DECIMAL     NOT NULL DEFAULT 0,
  max_drawdown     DECIMAL     NOT NULL DEFAULT 0,
  best_trade       DECIMAL     NOT NULL DEFAULT 0,
  worst_trade      DECIMAL     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar el registro inicial (solo si no existe)
INSERT INTO cava_portfolio (initial_capital, current_capital)
SELECT 10000, 10000
WHERE NOT EXISTS (SELECT 1 FROM cava_portfolio);

-- ── cava_daily_summary ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cava_daily_summary (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date             DATE        NOT NULL UNIQUE,
  sp500_open       DECIMAL,
  sp500_close      DECIMAL,
  sp500_change_pct DECIMAL,
  trades_count     INT         NOT NULL DEFAULT 0,
  trades_won       INT         NOT NULL DEFAULT 0,
  pnl_day          DECIMAL     NOT NULL DEFAULT 0,
  capital_eod      DECIMAL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cava_daily_summary_date ON cava_daily_summary (date DESC);

-- ── Row Level Security (RLS) ──────────────────────────────────
-- Habilitar RLS en todas las tablas
ALTER TABLE cava_trades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cava_portfolio      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cava_daily_summary  ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública (dashboard sin login)
CREATE POLICY "Public read access" ON cava_trades
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON cava_portfolio
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON cava_daily_summary
  FOR SELECT USING (true);

-- Política: escritura solo con service_role (el bot usa SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role write" ON cava_trades
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role write" ON cava_portfolio
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role write" ON cava_daily_summary
  FOR ALL USING (auth.role() = 'service_role');
