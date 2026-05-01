import type { TradeStatus, StrategyName } from '@/types';

const STATUS_CONFIG: Record<TradeStatus, { label: string; color: string; bg: string }> = {
  open:           { label: 'Abierta',   color: 'var(--blue)',   bg: '#1c2d4a' },
  closed_tp:      { label: 'TP ✓',      color: 'var(--green)',  bg: '#1a3328' },
  closed_sl:      { label: 'SL ✗',      color: 'var(--red)',    bg: '#3d1a1a' },
  closed_eod:     { label: 'EOD',       color: 'var(--yellow)', bg: '#3d2e0a' },
  closed_manual:  { label: 'Manual',    color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
};

const STRATEGY_LABEL: Record<StrategyName, string> = {
  european_close:    'European Close',
  institutional_push: 'Institutional Push',
  mean_reversion:    'Mean Reversion',
};

export function StatusBadge({ status }: { status: TradeStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

export function StrategyBadge({ strategy }: { strategy: StrategyName }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs"
      style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
      {STRATEGY_LABEL[strategy]}
    </span>
  );
}
