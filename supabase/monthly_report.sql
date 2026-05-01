-- ============================================================
-- AÑADIR AL SCHEMA EXISTENTE
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS cava_monthly_report (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  month                 TEXT        NOT NULL UNIQUE,  -- formato: '2026-05'

  -- Capital
  capital_start         DECIMAL     NOT NULL,
  capital_end           DECIMAL     NOT NULL,
  pnl_month             DECIMAL     NOT NULL,
  pnl_month_pct         DECIMAL     NOT NULL,

  -- Actividad
  trading_days          INT         NOT NULL DEFAULT 0,
  total_trades          INT         NOT NULL DEFAULT 0,
  signals_skipped       INT         NOT NULL DEFAULT 0,  -- días con señal pero no operamos (max trades, pausa, etc.)

  -- Win/Loss
  winning_trades        INT         NOT NULL DEFAULT 0,
  losing_trades         INT         NOT NULL DEFAULT 0,
  win_rate              DECIMAL     NOT NULL DEFAULT 0,

  -- Resultados por tipo de cierre
  closed_tp             INT         NOT NULL DEFAULT 0,
  closed_sl             INT         NOT NULL DEFAULT 0,
  closed_eod            INT         NOT NULL DEFAULT 0,

  -- P&L stats
  best_trade            DECIMAL     NOT NULL DEFAULT 0,
  worst_trade           DECIMAL     NOT NULL DEFAULT 0,
  avg_win               DECIMAL     NOT NULL DEFAULT 0,
  avg_loss              DECIMAL     NOT NULL DEFAULT 0,
  profit_factor         DECIMAL     NOT NULL DEFAULT 0,  -- gross_win / gross_loss (>1.5 es bueno)
  expectancy            DECIMAL     NOT NULL DEFAULT 0,  -- (win% * avg_win) - (loss% * avg_loss)

  -- Riesgo
  max_drawdown_month    DECIMAL     NOT NULL DEFAULT 0,
  sharpe_ratio          DECIMAL,                         -- retorno / desviación estándar de retornos diarios

  -- Por estrategia (JSON)
  by_strategy           JSONB       NOT NULL DEFAULT '{}',
  -- Formato: { "european_close": { trades, win_rate, pnl, profit_factor }, "institutional_push": {...} }

  -- Parámetros vigentes ese mes (para comparar calibraciones)
  params_snapshot       JSONB       NOT NULL DEFAULT '{}',
  -- Formato: { "stop_loss_pct": 0.3, "take_profit_pct": 1.0, "ec_threshold": 0.2, ... }

  -- Notas de calibración (rellenar manualmente o via AI)
  calibration_notes     TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cava_monthly_report_month ON cava_monthly_report (month DESC);

ALTER TABLE cava_monthly_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON cava_monthly_report
  FOR SELECT USING (true);

CREATE POLICY "Service role write" ON cava_monthly_report
  FOR ALL USING (auth.role() = 'service_role');
