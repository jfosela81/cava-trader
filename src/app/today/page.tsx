import { getOpenTrade, getTodayTrades } from '@/lib/supabase';
import { LivePrice } from '@/components/LivePrice';
import { StatusBadge, StrategyBadge } from '@/components/Badges';
import { TradeTable } from '@/components/TradeTable';

export const revalidate = 30;

const CRONS = [
  { name: 'European Close',       time: '17:00', desc: 'Señal SHORT si SPY sube >0.2% desde apertura' },
  { name: 'EC Exit',              time: '18:00', desc: 'Cierre forzado de la posición EC' },
  { name: 'Institutional Push',   time: '21:00', desc: 'Señal LONG si precio > media sesión y SMA50' },
  { name: 'Close All Positions',  time: '22:00', desc: 'Cierre forzado de todas las posiciones' },
];

function getNowCEST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
}

function getNextCron() {
  const now = getNowCEST();
  const hhmm = now.getHours() * 100 + now.getMinutes();
  const times = [1700, 1800, 2100, 2200];
  const next = times.find(t => t > hhmm);
  if (!next) return null;
  const idx = times.indexOf(next);
  return CRONS[idx];
}

export default async function TodayPage() {
  const [openTrade, todayTrades] = await Promise.all([getOpenTrade(), getTodayTrades()]);
  const nextCron = getNextCron();
  const closedToday = todayTrades.filter(t => t.status !== 'open');
  const todayPnl = closedToday.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Sesión de hoy</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Precio live */}
      <LivePrice />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Posición abierta */}
        <div className="rounded-lg border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-3 font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Posición abierta
          </p>
          {openTrade ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StrategyBadge strategy={openTrade.strategy} />
                <StatusBadge status={openTrade.status} />
                <span className="text-xs font-mono font-bold"
                  style={{ color: openTrade.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>
                  {openTrade.direction.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Entrada', value: `$${openTrade.entry_price.toFixed(2)}` },
                  { label: 'Stop Loss', value: `$${openTrade.stop_loss.toFixed(2)}` },
                  { label: 'Take Profit', value: `$${openTrade.take_profit.toFixed(2)}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                    <p className="text-sm font-mono font-semibold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {openTrade.notes && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{openTrade.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sin posición abierta</p>
          )}
        </div>

        {/* Próximo cron + P&L del día */}
        <div className="space-y-4">
          <div className="rounded-lg border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-3 font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              P&L hoy
            </p>
            <p className="text-2xl font-semibold tabular-nums"
              style={{ color: todayPnl >= 0 ? 'var(--green)' : todayPnl < 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
              {todayPnl !== 0 ? `${todayPnl >= 0 ? '+' : ''}$${todayPnl.toFixed(2)}` : '$0.00'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {closedToday.length} trade{closedToday.length !== 1 ? 's' : ''} cerrado{closedToday.length !== 1 ? 's' : ''}
            </p>
          </div>

          {nextCron && (
            <div className="rounded-lg border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-2 font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Próximo cron
              </p>
              <p className="text-lg font-semibold" style={{ color: 'var(--blue)' }}>{nextCron.time} — {nextCron.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{nextCron.desc}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cronograma del día */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Horario de la sesión (CEST)</p>
        <div className="rounded-lg border divide-y" style={{ borderColor: 'var(--border)' }}>
          {CRONS.map(cron => {
            const nowCEST = getNowCEST();
            const [h, m] = cron.time.split(':').map(Number);
            const cronDate = new Date(nowCEST);
            cronDate.setHours(h, m, 0, 0);
            const past = nowCEST > cronDate;

            return (
              <div key={cron.name} className="flex items-center gap-4 px-4 py-3"
                style={{ opacity: past ? 0.5 : 1 }}>
                <span className="text-sm font-mono w-12" style={{ color: 'var(--blue)' }}>{cron.time}</span>
                <div>
                  <p className="text-sm font-medium">{cron.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cron.desc}</p>
                </div>
                {past && <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trades del día */}
      {todayTrades.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Trades de hoy</p>
          <TradeTable trades={todayTrades} />
        </div>
      )}
    </div>
  );
}
