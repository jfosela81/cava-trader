import { createClient } from '@supabase/supabase-js';
import type { Trade, Portfolio, DailySummary } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (para el dashboard — solo lectura)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (para el bot — escritura desde API routes server-side)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// ── Helpers de base de datos ──────────────────────────────────────────────────

export async function getPortfolio(): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from('cava_portfolio')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching portfolio:', error);
    return null;
  }
  return data;
}

export async function getOpenTrade(): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .eq('status', 'open')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching open trade:', error);
    return null;
  }
  return data ?? null;
}

export async function getTodayTrades(): Promise<Trade[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .gte('entry_time', `${today}T00:00:00Z`)
    .order('entry_time', { ascending: false });

  if (error) {
    console.error('Error fetching today trades:', error);
    return [];
  }
  return data ?? [];
}

export async function getAllTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('cava_trades')
    .select('*')
    .order('entry_time', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }
  return data ?? [];
}

export async function getDailySummaries(limit = 30): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('cava_daily_summary')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching daily summaries:', error);
    return [];
  }
  return data ?? [];
}
