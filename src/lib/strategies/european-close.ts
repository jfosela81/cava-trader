/**
 * Estrategia 1: European Close (17:00 CEST)
 *
 * Lógica: El cierre de las bolsas europeas provoca presión vendedora.
 * Señal SHORT si el SP500 sube >0.2% desde la apertura de la sesión americana.
 *
 * Entrada : SHORT a las 17:00 CEST
 * Stop    : +0.3% desde entrada
 * TP      : -0.5% desde entrada (o cierre forzado a las 18:00 CEST)
 * Filtro  : No operar si tendencia semanal es fuertemente alcista (TODO Fase 4)
 */

import { getFullQuote } from '@/lib/twelvedata';

const SIGNAL_THRESHOLD_PCT = 0.2; // SP500 debe subir al menos este % desde apertura

export interface EuropeanCloseSignal {
  signal: 'short' | null;
  reason: string;
  data: {
    current_price: number;
    open_price: number;
    change_from_open_pct: number;
    threshold_pct: number;
  };
}

export async function evaluateEuropeanClose(): Promise<EuropeanCloseSignal> {
  const quote = await getFullQuote();

  const data = {
    current_price: quote.price,
    open_price: quote.open,
    change_from_open_pct: quote.change_from_open_pct,
    threshold_pct: SIGNAL_THRESHOLD_PCT,
  };

  if (!quote.is_market_open) {
    return { signal: null, reason: 'Mercado cerrado', data };
  }

  if (quote.change_from_open_pct > SIGNAL_THRESHOLD_PCT) {
    return {
      signal: 'short',
      reason: `SPY sube +${quote.change_from_open_pct.toFixed(2)}% desde apertura (umbral: ${SIGNAL_THRESHOLD_PCT}%) → señal SHORT`,
      data,
    };
  }

  return {
    signal: null,
    reason: `SPY solo sube ${quote.change_from_open_pct.toFixed(2)}% desde apertura (necesita >${SIGNAL_THRESHOLD_PCT}%)`,
    data,
  };
}
