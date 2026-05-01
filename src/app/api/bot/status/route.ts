/**
 * GET /api/bot/status
 *
 * Devuelve el estado actual del bot: posición abierta, portfolio, precio de mercado.
 * No requiere autenticación (es de solo lectura para el dashboard).
 */

import { NextResponse } from 'next/server';
import { getOpenTrade, getPortfolio, getTodayTrades } from '@/lib/supabase';
import { getSP500Price } from '@/lib/twelvedata';
import { canOpenNewTrade } from '@/lib/bot';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [openTrade, portfolio, todayTrades, price, { can: canTrade, reason: cannotTradeReason }] =
      await Promise.all([
        getOpenTrade(),
        getPortfolio(),
        getTodayTrades(),
        getSP500Price(),
        canOpenNewTrade(),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        market: price,
        portfolio,
        open_trade: openTrade,
        today_trades: todayTrades,
        can_trade: canTrade,
        cannot_trade_reason: cannotTradeReason ?? null,
        next_crons: [
          { name: 'European Close',      time_cest: '17:00', time_utc: '15:00' },
          { name: 'EC Exit',             time_cest: '18:00', time_utc: '16:00' },
          { name: 'Institutional Push',  time_cest: '21:00', time_utc: '19:00' },
          { name: 'Close All Positions', time_cest: '22:00', time_utc: '20:00' },
        ],
      },
    });
  } catch (err) {
    console.error('[bot/status]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
