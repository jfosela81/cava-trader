/**
 * GET /api/bot/monthly-report
 *
 * Genera y guarda el informe mensual de calibración en cava_monthly_report.
 * Ejecutar el último día de cada mes (o primer día del mes siguiente) via GitHub Actions.
 *
 * Contiene todas las métricas necesarias para revisar y calibrar el sistema:
 * win rate, profit factor, Sharpe ratio, rendimiento por estrategia, parámetros vigentes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { Trade, DailySummary, StrategyName } from '@/types';

export const dynamic = 'force-dynamic';

// ── Helpers de cálculo ────────────────────────────────────────────────────────

function calcStrategyStats(trades: Trade[]) {
  const closed = trades.filter(t => t.status !== 'open');
  if (!closed.length) return { trades: 0, win_rate: 0, pnl: 0, profit_factor: 0, avg_win: 0, avg_loss: 0 };

  const won  = closed.filter(t => (t.pnl_dollars ?? 0) > 0);
  const lost = closed.filter(t => (t.pnl_dollars ?? 0) <= 0);
  const grossWin  = won.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);
  const grossLoss = Math.abs(lost.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0));

  return {
    trades:        closed.length,
    win_rate:      closed.length ? (won.length / closed.length) * 100 : 0,
    pnl:           closed.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0),
    profit_factor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0,
    avg_win:       won.length  ? grossWin  / won.length  : 0,
    avg_loss:      lost.length ? grossLoss / lost.length : 0,
  };
}

function calcSharpe(summaries: DailySummary[]): number | null {
  const returns = summaries
    .filter(s => s.capital_eod !== null && s.pnl_day !== 0)
    .map(s => s.pnl_day / ((s.capital_eod ?? 10000) - s.pnl_day));

  if (returns.length < 5) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);

  if (std === 0) return null;

  // Annualizado asumiendo ~252 días de trading
  return (mean / std) * Math.sqrt(252);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Determinar mes a reportar (mes anterior al día de ejecución)
    const now = new Date();
    const reportDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = `${month}-01T00:00:00Z`;
    const monthEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00Z`;

    // Obtener trades del mes
    const { data: trades } = await supabaseAdmin
      .from('cava_trades')
      .select('*')
      .gte('entry_time', monthStart)
      .lt('entry_time', monthEnd)
      .order('entry_time', { ascending: true });

    // Obtener resúmenes diarios del mes
    const { data: summaries } = await supabaseAdmin
      .from('cava_daily_summary')
      .select('*')
      .gte('date', monthStart.split('T')[0])
      .lt('date', monthEnd.split('T')[0])
      .order('date', { ascending: true });

    // Obtener portfolio actual
    const { data: portfolio } = await supabaseAdmin
      .from('cava_portfolio')
      .select('*')
      .single();

    const allTrades  = (trades    ?? []) as Trade[];
    const allSummaries = (summaries ?? []) as DailySummary[];
    const closed = allTrades.filter(t => t.status !== 'open');
    const won    = closed.filter(t => (t.pnl_dollars ?? 0) > 0);
    const lost   = closed.filter(t => (t.pnl_dollars ?? 0) <= 0);

    const grossWin  = won.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);
    const grossLoss = Math.abs(lost.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0));
    const pnlMonth  = closed.reduce((s, t) => s + (t.pnl_dollars ?? 0), 0);

    const capitalEnd   = portfolio?.current_capital ?? 10000;
    const capitalStart = capitalEnd - pnlMonth;

    // P&L por estrategia
    const strategies: StrategyName[] = ['european_close', 'institutional_push', 'mean_reversion'];
    const byStrategy = Object.fromEntries(
      strategies.map(s => [s, calcStrategyStats(allTrades.filter(t => t.strategy === s))])
    );

    // Sharpe ratio mensual
    const sharpe = calcSharpe(allSummaries);

    // Expectancy: (winRate * avgWin) - (lossRate * avgLoss)
    const winRate  = closed.length ? won.length  / closed.length : 0;
    const lossRate = closed.length ? lost.length / closed.length : 0;
    const avgWin   = won.length    ? grossWin    / won.length    : 0;
    const avgLoss  = lost.length   ? grossLoss   / lost.length   : 0;
    const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

    // Drawdown máximo del mes
    const maxDrawdown = allSummaries.reduce((min, s) => Math.min(min, s.pnl_day), 0);

    // Días con señal pero sin trade (aproximación: días con resumen pero trades_count=0)
    const tradingDays   = allSummaries.filter(s => s.trades_count > 0).length;
    const signalsSkipped = allSummaries.filter(s => s.trades_count === 0 && s.sp500_open !== null).length;

    // Snapshot de parámetros vigentes
    const paramsSnapshot = {
      stop_loss_pct:    parseFloat(process.env.BOT_STOP_LOSS_PCT    ?? '0.3'),
      take_profit_pct:  parseFloat(process.env.BOT_TAKE_PROFIT_PCT  ?? '1.0'),
      max_trades_day:   parseInt(process.env.BOT_MAX_TRADES_PER_DAY ?? '2'),
      ec_threshold_pct: 0.2,
      ip_filter_sma50:  true,
    };

    const report = {
      month,
      capital_start:      capitalStart,
      capital_end:        capitalEnd,
      pnl_month:          pnlMonth,
      pnl_month_pct:      capitalStart > 0 ? (pnlMonth / capitalStart) * 100 : 0,
      trading_days:       tradingDays,
      total_trades:       closed.length,
      signals_skipped:    signalsSkipped,
      winning_trades:     won.length,
      losing_trades:      lost.length,
      win_rate:           winRate * 100,
      closed_tp:          closed.filter(t => t.status === 'closed_tp').length,
      closed_sl:          closed.filter(t => t.status === 'closed_sl').length,
      closed_eod:         closed.filter(t => t.status === 'closed_eod').length,
      best_trade:         won.length  ? Math.max(...won.map(t  => t.pnl_dollars ?? 0)) : 0,
      worst_trade:        lost.length ? Math.min(...lost.map(t => t.pnl_dollars ?? 0)) : 0,
      avg_win:            avgWin,
      avg_loss:           avgLoss,
      profit_factor:      grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0,
      expectancy,
      max_drawdown_month: maxDrawdown,
      sharpe_ratio:       sharpe,
      by_strategy:        byStrategy,
      params_snapshot:    paramsSnapshot,
      calibration_notes:  null,
    };

    // Guardar en Supabase (upsert por mes)
    const { error } = await supabaseAdmin
      .from('cava_monthly_report')
      .upsert(report, { onConflict: 'month' });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, month, report });

  } catch (err) {
    console.error('[monthly-report]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
