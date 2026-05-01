import { getPortfolio, getDailySummaries, getAllTrades } from '@/lib/supabase';
import { MetricCard } from '@/components/MetricCard';
import { EquityCurve } from '@/components/EquityCurve';
import { TradeTable } from '@/components/TradeTable';

export const revalidate = 60;

function fmt(n: number | null, decimals = 2) {
  if (n === null) return '—';
  return n.toFixed(decimals);
}

export default async function HomePage() {
  const [portfolio, summaries, trades] = await Promise.all([
    getPortfolio(),
    getDailySummaries(60),
    getAllTrades(),
  ]);

  const pnlPct = portfolio
    ? ((portfolio.current_capital - portfolio.initial_capital) / portfolio.initial_capital) * 100
    : 0;

  const winRate = portfolio && portfolio.total_trades > 0
    ? (portfolio.winning_trades / portfolio.total_trades) * 100
    : 0;

  const recentTrades = trades.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Resumen del portfolio
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Paper trading · Sistema Cava · SP500 intradía
        </p>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Capital actual"
          value={`$${fmt(portfolio?.current_capital ?? 10000)}`}
          sub={`Inicial: $${fmt(portfolio?.initial_capital ?? 10000)}`}
          trend={pnlPct >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          label="P&L total"
          value={`${pnlPct >= 0 ? '+' : ''}${fmt(pnlPct)}%`}
          sub={`$${fmt(portfolio?.total_pnl ?? 0)}`}
          trend={pnlPct >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          label="Win rate"
          value={`${fmt(winRate, 0)}%`}
          sub={`${portfolio?.winning_trades ?? 0}W / ${portfolio?.losing_trades ?? 0}L`}
          trend={winRate >= 50 ? 'up' : winRate > 0 ? 'down' : 'neutral'}
        />
        <MetricCard
          label="Trades totales"
          value={portfolio?.total_trades ?? 0}
          sub={`Max drawdown: ${fmt(portfolio?.max_drawdown ?? 0)}%`}
          trend="neutral"
        />
      </div>

      {/* Equity Curve */}
      <EquityCurve
        summaries={summaries}
        initialCapital={portfolio?.initial_capital ?? 10000}
      />

      {/* Últimos 10 trades */}
      <div>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Últimos trades
        </h2>
        <TradeTable trades={recentTrades} />
      </div>
    </div>
  );
}
