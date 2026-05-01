import { getAllTrades } from '@/lib/supabase';
import { TradeTable } from '@/components/TradeTable';

export const revalidate = 60;

export default async function TradesPage() {
  const trades = await getAllTrades();

  const open   = trades.filter(t => t.status === 'open').length;
  const won    = trades.filter(t => t.status === 'closed_tp').length;
  const lost   = trades.filter(t => t.status === 'closed_sl').length;
  const eod    = trades.filter(t => t.status === 'closed_eod').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Historial de trades</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {trades.length} trades totales
        </p>
      </div>

      {/* Resumen rápido */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Abiertas',  value: open, color: 'var(--blue)' },
          { label: 'TP ✓',      value: won,  color: 'var(--green)' },
          { label: 'SL ✗',      value: lost, color: 'var(--red)' },
          { label: 'EOD',       value: eod,  color: 'var(--yellow)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2 rounded-md px-3 py-1.5 border text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span style={{ color }}>{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>

      <TradeTable trades={trades} />
    </div>
  );
}
