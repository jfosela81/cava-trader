import { createClient } from '@supabase/supabase-js';
import type { Trade, Portfolio, DailySummary, StrategyName, TradeDirection, TradeStatus } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (dashboard — solo lectura)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (bot — escritura desde API routes server-side)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// ── Lectura ───────────────────────────────────────────────────────────────────

export async function getPortfolio(): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from('cava_portfolio')
    .select('*')
    .single();

  if (error) { console.error('getPortfolio:', error); return null; }
  return data;
}

export async function getOpenTrade(): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .eq('status', 'open')
    .maybeSingle();

  if (error) { console.error('getOpenTrade:', error); return null; }
  return data;
}

export async function getTodayTrades(): Promise<Trade[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .gte('entry_time', `${today}T00:00:00Z`)
    .order('entry_time', { ascending: false });

  if (error) { console.error('getTodayTrades:', error); return []; }
  return data ?? [];
}

export async function getAllTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .order('entry_time', { ascending: false });

  if (error) { console.error('getAllTrades:', error); return []; }
  return data ?? [];
}

export async function getLastClosedTrades(limit: number): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .neq('status', 'open')
    .order('exit_time', { ascending: false })
    .limit(limit);

  if (error) { console.error('getLastClosedTrades:', error); return []; }
  return data ?? [];
}

export async function getDailySummaries(limit = 30): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('cava_daily_summary')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) { console.error('getDailySummaries:', error); return []; }
  return data ?? [];
}

// ── Escritura (solo desde server-side con supabaseAdmin) ──────────────────────

export async function createTrade(params: {
  strategy: StrategyName;
  direction: TradeDirection;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  notes?: string;
}): Promise<Trade> {
  const { data, error } = await supabaseAdmin
    .from('cava_trades')
    .insert({
      ...params,
      entry_time: new Date().toISOString(),
      status: 'open',
    })
    .select()
    .single();

  if (error) throw new Error(`createTrade: ${error.message}`);
  return data;
}

export async function closeTrade(params: {
  id: string;
  exit_price: number;
  status: Exclude<TradeStatus, 'open'>;
  pnl_percent: number;
  pnl_dollars: number;
}): Promise<Trade> {
  const { data, error } = await supabaseAdmin
    .from('cava_trades')
    .update({
      exit_price: params.exit_price,
      exit_time: new Date().toISOString(),
      status: params.status,
      pnl_percent: params.pnl_percent,
      pnl_dollars: params.pnl_dollars,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw new Error(`closeTrade: ${error.message}`);
  return data;
}

export async function updatePortfolio(params: {
  current_capital: number;
  total_trades?: number;
  winning_trades?: number;
  losing_trades?: number;
  total_pnl?: number;
  max_drawdown?: number;
  best_trade?: number;
  worst_trade?: number;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('cava_portfolio')
    .update({ ...params, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // actualiza la única fila existente

  if (error) throw new Error(`updatePortfolio: ${error.message}`);
}

export async function upsertDailySummary(params: Omit<DailySummary, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabaseAdmin
    .from('cava_daily_summary')
    .upsert(params, { onConflict: 'date' });

  if (error) throw new Error(`upsertDailySummary: ${error.message}`);
}
