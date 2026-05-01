import type { TradeDirection } from '@/types';

const SL_PCT = parseFloat(process.env.BOT_STOP_LOSS_PCT ?? '0.3') / 100;
const TP_PCT = parseFloat(process.env.BOT_TAKE_PROFIT_PCT ?? '1.0') / 100;

export function stopLossPrice(entry: number, direction: TradeDirection): number {
  return direction === 'long'
    ? entry * (1 - SL_PCT)
    : entry * (1 + SL_PCT);
}

export function takeProfitPrice(entry: number, direction: TradeDirection): number {
  return direction === 'long'
    ? entry * (1 + TP_PCT)
    : entry * (1 - TP_PCT);
}

export function pnlPercent(entry: number, exit: number, direction: TradeDirection): number {
  return direction === 'long'
    ? ((exit - entry) / entry) * 100
    : ((entry - exit) / entry) * 100;
}

export function pnlDollars(capital: number, pnlPct: number): number {
  return capital * (pnlPct / 100);
}

export function isStopHit(current: number, sl: number, direction: TradeDirection): boolean {
  return direction === 'long' ? current <= sl : current >= sl;
}

export function isTpHit(current: number, tp: number, direction: TradeDirection): boolean {
  return direction === 'long' ? current >= tp : current <= tp;
}
