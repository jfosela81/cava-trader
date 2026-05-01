import type { MarketPrice } from '@/types';

const BASE_URL = 'https://api.twelvedata.com';
const API_KEY = process.env.TWELVE_DATA_API_KEY!;

// SPY = ETF del S&P 500, disponible en free tier de Twelve Data
// SPX (índice) requiere plan Pro+. SPY tiene comportamiento idéntico para paper trading.
const SP500_SYMBOL = 'SPY';

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
}

interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    exchange: string;
    currency: string;
    exchange_timezone: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

export async function getSP500Price(): Promise<MarketPrice> {
  const url = `${BASE_URL}/quote?symbol=${SP500_SYMBOL}&apikey=${API_KEY}`;
  const response = await fetch(url, { next: { revalidate: 60 } });

  if (!response.ok) {
    throw new Error(`Twelve Data error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(`Twelve Data API: ${data.message}`);
  }

  const quote = data as TwelveDataQuote;

  return {
    symbol: quote.symbol,
    price: parseFloat(quote.close),
    change: parseFloat(quote.change),
    change_percent: parseFloat(quote.percent_change),
    timestamp: quote.datetime,
    is_market_open: quote.is_market_open,
  };
}

export async function getSP500Candles(
  interval: '1min' | '5min' | '15min' | '1h' = '5min',
  outputsize = 24
): Promise<TwelveDataTimeSeries['values']> {
  const url = `${BASE_URL}/time_series?symbol=${SP500_SYMBOL}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`Twelve Data error: ${response.status}`);
  }

  const data: TwelveDataTimeSeries = await response.json();

  if (data.status === 'error') {
    throw new Error(`Twelve Data API error`);
  }

  return data.values;
}

/**
 * Calcula el precio medio del SP500 desde la apertura de la sesión americana
 * (15:30 CET / 09:30 ET) hasta el momento actual.
 */
export async function getSessionAverage(): Promise<number> {
  const candles = await getSP500Candles('5min', 78); // 78 velas de 5min = 6.5h sesión

  if (!candles || candles.length === 0) {
    throw new Error('No candle data available');
  }

  const closes = candles.map((c) => parseFloat(c.close));
  return closes.reduce((a, b) => a + b, 0) / closes.length;
}
