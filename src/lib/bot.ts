/**
 * Motor principal del bot Cava Trader.
 * Orquesta la lógica de apertura/cierre de trades y actualización del portfolio.
 */

import {
  getPortfolio,
  getOpenTrade,
  getTodayTrades,
  getLastClosedTrades,
  createTrade,
  closeTrade,
  updatePortfolio,
  upsertDailySummary,
} from '@/lib/supabase';
import {
  stopLossPrice,
  takeProfitPrice,
  pnlPercent,
  pnlDollars,
  isStopHit,
  isTpHit,
} from '@/lib/risk';
import { getFullQuote } from '@/lib/twelvedata';
import type { Trade, StrategyName, TradeDirection, TradeStatus } from '@/types';

const MAX_TRADES_PER_DAY = parseInt(process.env.BOT_MAX_TRADES_PER_DAY ?? '2');
const CONSECUTIVE_STOPS_PAUSE = 3;

// ── Comprobaciones de estado ──────────────────────────────────────────────────

/**
 * Comprueba si el bot está en pausa por haber encadenado N stops seguidos.
 */
async function isInPauseMode(): Promise<boolean> {
  const lastTrades = await getLastClosedTrades(CONSECUTIVE_STOPS_PAUSE);
  if (lastTrades.length < CONSECUTIVE_STOPS_PAUSE) return false;
  return lastTrades.every((t) => t.status === 'closed_sl');
}

/**
 * Determina si se puede abrir un nuevo trade.
 */
export async function canOpenNewTrade(): Promise<{ can: boolean; reason?: string }> {
  const [openTrade, todayTrades, inPause] = await Promise.all([
    getOpenTrade(),
    getTodayTrades(),
    isInPauseMode(),
  ]);

  if (openTrade) {
    return { can: false, reason: 'Ya hay una posición abierta' };
  }
  if (todayTrades.length >= MAX_TRADES_PER_DAY) {
    return { can: false, reason: `Máximo de ${MAX_TRADES_PER_DAY} trades diarios alcanzado` };
  }
  if (inPause) {
    return { can: false, reason: `Pausa activa: ${CONSECUTIVE_STOPS_PAUSE} stops consecutivos` };
  }

  return { can: true };
}

// ── Apertura de trade ─────────────────────────────────────────────────────────

export async function openTrade(
  strategy: StrategyName,
  direction: TradeDirection,
  entryPrice: number,
  notes?: string
): Promise<Trade> {
  const sl = stopLossPrice(entryPrice, direction);
  const tp = takeProfitPrice(entryPrice, direction);

  const trade = await createTrade({ strategy, direction, entry_price: entryPrice, stop_loss: sl, take_profit: tp, notes });

  console.log(
    `[BOT] Trade abierto: ${direction.toUpperCase()} ${strategy} @ $${entryPrice} | SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)}`
  );

  return trade;
}

// ── Cierre de trade ───────────────────────────────────────────────────────────

export async function closeOpenPosition(params: {
  exitPrice: number;
  status: Exclude<TradeStatus, 'open'>;
}): Promise<{ trade: Trade; portfolio: ReturnType<typeof getPortfolio> } | null> {
  const [openTrade, portfolio] = await Promise.all([getOpenTrade(), getPortfolio()]);

  if (!openTrade || !portfolio) return null;

  const pnlPct = pnlPercent(openTrade.entry_price, params.exitPrice, openTrade.direction);
  const pnlDol = pnlDollars(portfolio.current_capital, pnlPct);
  const newCapital = portfolio.current_capital + pnlDol;

  const closedTrade = await closeTrade({
    id: openTrade.id,
    exit_price: params.exitPrice,
    status: params.status,
    pnl_percent: pnlPct,
    pnl_dollars: pnlDol,
  });

  const isWin = pnlDol > 0;

  await updatePortfolio({
    current_capital: newCapital,
    total_trades: portfolio.total_trades + 1,
    winning_trades: portfolio.winning_trades + (isWin ? 1 : 0),
    losing_trades: portfolio.losing_trades + (isWin ? 0 : 1),
    total_pnl: portfolio.total_pnl + pnlDol,
    max_drawdown: Math.min(portfolio.max_drawdown, pnlPct),
    best_trade: Math.max(portfolio.best_trade, pnlDol),
    worst_trade: Math.min(portfolio.worst_trade, pnlDol),
  });

  console.log(
    `[BOT] Trade cerrado: ${params.status} @ $${params.exitPrice} | PnL: ${pnlPct.toFixed(2)}% ($${pnlDol.toFixed(2)}) | Capital: $${newCapital.toFixed(2)}`
  );

  return { trade: closedTrade, portfolio: getPortfolio() };
}

/**
 * Comprueba la posición abierta contra SL/TP. Si fue alcanzado, la cierra.
 * Nota: solo verifica el precio actual del momento del cron, no la historia de velas.
 */
export async function checkAndCloseIfHit(): Promise<{
  action: 'closed_sl' | 'closed_tp' | 'no_position' | 'no_hit';
  trade?: Trade;
  price?: number;
}> {
  const openTrade = await getOpenTrade();
  if (!openTrade) return { action: 'no_position' };

  const quote = await getFullQuote();
  const currentPrice = quote.price;

  if (isStopHit(currentPrice, openTrade.stop_loss, openTrade.direction)) {
    const result = await closeOpenPosition({ exitPrice: openTrade.stop_loss, status: 'closed_sl' });
    return { action: 'closed_sl', trade: result?.trade, price: openTrade.stop_loss };
  }

  if (isTpHit(currentPrice, openTrade.take_profit, openTrade.direction)) {
    const result = await closeOpenPosition({ exitPrice: openTrade.take_profit, status: 'closed_tp' });
    return { action: 'closed_tp', trade: result?.trade, price: openTrade.take_profit };
  }

  return { action: 'no_hit' };
}

/**
 * Cierra forzosamente todas las posiciones abiertas (22:00 CEST, nunca overnight).
 */
export async function forceCloseAll(): Promise<{ closed: number; price: number }> {
  const quote = await getFullQuote();
  const openTrade = await getOpenTrade();

  if (!openTrade) return { closed: 0, price: quote.price };

  await closeOpenPosition({ exitPrice: quote.price, status: 'closed_eod' });

  return { closed: 1, price: quote.price };
}

// ── Resumen diario ────────────────────────────────────────────────────────────

export async function generateDailySummary(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const [todayTrades, portfolio, quote] = await Promise.all([
    getTodayTrades(),
    getPortfolio(),
    getFullQuote().catch(() => null),
  ]);

  const closedTrades = todayTrades.filter((t) => t.status !== 'open');
  const wonTrades = closedTrades.filter((t) => (t.pnl_dollars ?? 0) > 0);
  const dayPnl = closedTrades.reduce((sum, t) => sum + (t.pnl_dollars ?? 0), 0);

  await upsertDailySummary({
    date: today,
    sp500_open: quote?.open ?? null,
    sp500_close: quote?.price ?? null,
    sp500_change_pct: quote?.change_percent ?? null,
    trades_count: closedTrades.length,
    trades_won: wonTrades.length,
    pnl_day: dayPnl,
    capital_eod: portfolio?.current_capital ?? null,
    notes: null,
  });
}
