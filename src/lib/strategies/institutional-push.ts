/**
 * Estrategia 2: Institutional Push (21:00 CEST)
 *
 * Lógica: El dinero institucional empuja el precio hacia el cierre deseado.
 * Señal LONG si el SP500 está por encima de la media de la sesión Y por encima de la SMA50 diaria.
 *
 * Entrada : LONG a las 21:00 CEST
 * Stop    : -0.3% desde entrada
 * TP      : +0.5% desde entrada (o cierre forzado a las 22:00 CEST)
 * Filtro  : Precio > SMA50 diario (no ir en contra de tendencia bajista)
 */

import { getFullQuote, getSessionAverage, getSMA50 } from '@/lib/twelvedata';

export interface InstitutionalPushSignal {
  signal: 'long' | null;
  reason: string;
  data: {
    current_price: number;
    session_average: number;
    sma50: number;
    above_session_avg: boolean;
    above_sma50: boolean;
  };
}

export async function evaluateInstitutionalPush(): Promise<InstitutionalPushSignal> {
  const [quote, sessionAvg, sma50] = await Promise.all([
    getFullQuote(),
    getSessionAverage(),
    getSMA50(),
  ]);

  const aboveSessionAvg = quote.price > sessionAvg;
  const aboveSma50 = quote.price > sma50;

  const data = {
    current_price: quote.price,
    session_average: sessionAvg,
    sma50,
    above_session_avg: aboveSessionAvg,
    above_sma50: aboveSma50,
  };

  if (!quote.is_market_open) {
    return { signal: null, reason: 'Mercado cerrado', data };
  }

  if (!aboveSma50) {
    return {
      signal: null,
      reason: `SPY ($${quote.price.toFixed(2)}) por debajo de SMA50 ($${sma50.toFixed(2)}) → filtro de tendencia activo, no operar`,
      data,
    };
  }

  if (!aboveSessionAvg) {
    return {
      signal: null,
      reason: `SPY ($${quote.price.toFixed(2)}) por debajo de la media de sesión ($${sessionAvg.toFixed(2)}) → no hay impulso institucional`,
      data,
    };
  }

  return {
    signal: 'long',
    reason: `SPY ($${quote.price.toFixed(2)}) por encima de media sesión ($${sessionAvg.toFixed(2)}) y SMA50 ($${sma50.toFixed(2)}) → señal LONG`,
    data,
  };
}
