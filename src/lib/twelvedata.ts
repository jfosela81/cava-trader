// SPY = ETF del S&P 500, disponible en free tier de Twelve Data
// SPX (índice) requiere plan Pro+. SPY tiene comportamiento idéntico para paper trading.
const SP500_SYMBOL = 'SPY';

const BASE_URL = 'https://api.twelvedata.com';
const API_KEY = process.env.TWELVE_DATA_API_KEY!;

// ── Interfaces internas de Twelve Data ───────────────────────────────────────

interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
  };
}

interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    exchange_timezone: string;
  };
  values: Candle[];
  status: string;
}

interface TwelveDataSMA {
  meta: { symbol: string; indicator: { time_period: number } };
  values: Array<{ datetime: string; sma: string }>;
  status: string;
}

interface TwelveDataError {
  code: number;
  message: string;
  status: 'error';
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface Candle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface SP500Quote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previous_close: number;
  change: number;
  change_percent: number;
  change_from_open: number;
  change_from_open_pct: number;
  timestamp: string;
  is_market_open: boolean;
}

import type { MarketPrice } from '@/types';

// ── Helpers internos ──────────────────────────────────────────────────────────

function assertNoError(data: TwelveDataError | unknown, endpoint: string): void {
  const d = data as TwelveDataError;
  if (d?.status === 'error') {
    throw new Error(`Twelve Data [${endpoint}]: ${d.message}`);
  }
}

// ── Funciones públicas ────────────────────────────────────────────────────────

/**
 * Quote simplificado — precio actual, cambio vs cierre anterior.
 * Usado por la API route /api/market/price.
 */
export async function getSP500Price(): Promise<MarketPrice> {
  const quote = await getFullQuote();
  return {
    symbol: quote.symbol,
    price: quote.price,
    change: quote.change,
    change_percent: quote.change_percent,
    timestamp: quote.timestamp,
    is_market_open: quote.is_market_open,
  };
}

/**
 * Quote completo incluyendo precio de apertura de sesión.
 * Necesario para las estrategias que calculan cambio desde apertura.
 */
export async function getFullQuote(): Promise<SP500Quote> {
  const url = `${BASE_URL}/quote?symbol=${SP500_SYMBOL}&apikey=${API_KEY}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);

  const data = await response.json();
  assertNoError(data, 'quote');

  const q = data as TwelveDataQuote;
  const price = parseFloat(q.close);
  const open = parseFloat(q.open);

  return {
    symbol: q.symbol,
    price,
    open,
    high: parseFloat(q.high),
    low: parseFloat(q.low),
    previous_close: parseFloat(q.previous_close),
    change: parseFloat(q.change),
    change_percent: parseFloat(q.percent_change),
    change_from_open: price - open,
    change_from_open_pct: ((price - open) / open) * 100,
    timestamp: q.datetime,
    is_market_open: q.is_market_open,
  };
}

/**
 * Velas intradía de SPY.
 */
export async function getSP500Candles(
  interval: '1min' | '5min' | '15min' | '1h' = '5min',
  outputsize = 24
): Promise<Candle[]> {
  const url = `${BASE_URL}/time_series?symbol=${SP500_SYMBOL}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);

  const data = await response.json();
  assertNoError(data, 'time_series');

  return (data as TwelveDataTimeSeries).values;
}

/**
 * Media de los precios de cierre de la sesión actual desde la apertura.
 * Pide 78 velas de 5min (6.5h = sesión americana completa).
 */
export async function getSessionAverage(): Promise<number> {
  const candles = await getSP500Candles('5min', 78);
  if (!candles.length) throw new Error('No hay datos de velas');
  const closes = candles.map((c) => parseFloat(c.close));
  return closes.reduce((a, b) => a + b, 0) / closes.length;
}

/**
 * SMA50 diario de SPY — filtro de tendencia para Institutional Push.
 */
export async function getSMA50(): Promise<number> {
  const url = `${BASE_URL}/sma?symbol=${SP500_SYMBOL}&interval=1day&time_period=50&apikey=${API_KEY}`;
  const response = await fetch(url, { next: { revalidate: 3600 } });

  if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);

  const data = await response.json();
  assertNoError(data, 'sma');

  const values = (data as TwelveDataSMA).values;
  if (!values?.length) throw new Error('No hay datos de SMA50');

  return parseFloat(values[0].sma);
}
