import type { Trade } from '@/types';
import { StatusBadge, StrategyBadge } from './Badges';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TradeRowProps {
  trade: Trade;
}

function fmt(n: number | null, prefix = '') {
  if (n === null) return '—';
  return `${prefix}${n.toFixed(2)}`;
}

function pnlColor(pnl: number | null) {
  if (pnl === null) return 'var(--text-secondary)';
  return pnl >= 0 ? 'var(--green)' : 'var(--red)';
}

export function TradeRow({ trade }: TradeRowProps) {
  return (
    <tr className="border-b hover:bg-[var(--surface-2)] transition-colors"
      style={{ borderColor: 'var(--border)' }}>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {format(new Date(trade.entry_time), 'dd MMM HH:mm', { locale: es })}
      </td>
      <td className="px-4 py-3"><StrategyBadge strategy={trade.strategy} /></td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono font-semibold"
          style={{ color: trade.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>
          {trade.direction.toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-mono">${fmt(trade.entry_price)}</td>
      <td className="px-4 py-3 text-sm font-mono">{trade.exit_price ? `$${fmt(trade.exit_price)}` : '—'}</td>
      <td className="px-4 py-3 text-sm font-mono font-semibold"
        style={{ color: pnlColor(trade.pnl_dollars) }}>
        {trade.pnl_dollars !== null
          ? `${trade.pnl_dollars >= 0 ? '+' : ''}$${fmt(trade.pnl_dollars)}`
          : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-mono"
        style={{ color: pnlColor(trade.pnl_percent) }}>
        {trade.pnl_percent !== null
          ? `${trade.pnl_percent >= 0 ? '+' : ''}${fmt(trade.pnl_percent)}%`
          : '—'}
      </td>
      <td className="px-4 py-3"><StatusBadge status={trade.status} /></td>
    </tr>
  );
}

export function TradeTable({ trades }: { trades: Trade[] }) {
  if (!trades.length) {
    return (
      <div className="text-center py-12 rounded-lg border"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        No hay trades registrados
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--surface-2)' }}>
          <tr>
            {['Fecha', 'Estrategia', 'Dir', 'Entrada', 'Salida', 'P&L $', 'P&L %', 'Estado'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(t => <TradeRow key={t.id} trade={t} />)}
        </tbody>
      </table>
    </div>
  );
}
