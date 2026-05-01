import { getAllTrades } from '@/lib/supabase';
import type { StrategyName, Trade } from '@/types';

export const revalidate = 60;

const STRATEGIES: { key: StrategyName; label: string; desc: string }[] = [
  { key: 'european_close',    label: 'European Close',      desc: 'SHORT a las 17:00 CEST si SPY sube >0.2% desde apertura' },
  { key: 'institutional_push', label: 'Institutional Push', desc: 'LONG a las 21:00 CEST si precio > media sesión y SMA50' },
  { key: 'mean_reversion',    label: 'Mean Reversion',      desc: 'LONG si SPY cae >0.5% en los primeros 30min (Fase 4)' },
];

function calcStats(trades: Trade[]) {
  const closed = trades.filter(t => t.status !== 'open');
  if (!closed.length) return null;

  const won = closed.filter(t => (t.pnl_dollars ?? 0) > 0);
  const lost = closed.filter(t => (t.pnl_dollars ?? 0) <= 0);
  const totalPnl = closed.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);
  const grossWin = won.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);
  const grossLoss = Math.abs(lost.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const avgWin = won.length ? grossWin / won.length : 0;
  const avgLoss = lost.length ? grossLoss / lost.length : 0;

  return {
    total: closed.length,
    won: won.length,
    lost: lost.length,
    winRate: (won.length / closed.length) * 100,
    totalPnl,
    profitFactor,
    avgWin,
    avgLoss,
  };
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-mono font-semibold" style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default async function StrategiesPage() {
  const allTrades = await getAllTrades();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Estrategias</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Rendimiento desglosado por estrategia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STRATEGIES.map(({ key, label, desc }) => {
          const trades = allTrades.filter(t => t.strategy === key);
          const stats = calcStats(trades);
          const openTrade = trades.find(t => t.status === 'open');

          return (
            <div key={key} className="rounded-lg border p-5"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="mb-4">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>

              {openTrade && (
                <div className="mb-3 px-3 py-2 rounded text-xs"
                  style={{ background: '#1c2d4a', color: 'var(--blue)' }}>
                  ● Posición abierta @ ${openTrade.entry_price.toFixed(2)}
                </div>
              )}

              {stats ? (
                <div>
                  <StatRow label="Trades"      value={`${stats.total}`} />
                  <StatRow label="Win Rate"    value={`${stats.winRate.toFixed(0)}%`}
                    color={stats.winRate >= 50 ? 'var(--green)' : 'var(--red)'} />
                  <StatRow label="P&L total"   value={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`}
                    color={stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
                  <StatRow label="Profit Factor" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
                    color={stats.profitFactor >= 1.5 ? 'var(--green)' : 'var(--yellow)'} />
                  <StatRow label="Avg Win"     value={`$${stats.avgWin.toFixed(2)}`} color="var(--green)" />
                  <StatRow label="Avg Loss"    value={`$${stats.avgLoss.toFixed(2)}`} color="var(--red)" />
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Sin datos aún — {trades.length > 0 ? `${trades.length} trade(s) abierto(s)` : 'ningún trade ejecutado'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
