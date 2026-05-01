/**
 * Cron: 18:00 CEST (16:00 UTC) — Lunes a Viernes
 *
 * Cierra la posición European Close si sigue abierta a las 18:00.
 * (La EC debe cerrarse antes de la zona muerta 18:00-20:00)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { getOpenTrade } from '@/lib/supabase';
import { checkAndCloseIfHit, closeOpenPosition } from '@/lib/bot';
import { getFullQuote } from '@/lib/twelvedata';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Comprobar primero si SL/TP fue tocado
    const checkResult = await checkAndCloseIfHit();

    if (checkResult.action === 'closed_sl' || checkResult.action === 'closed_tp') {
      return NextResponse.json({
        success: true,
        action: checkResult.action,
        message: `Posición cerrada por ${checkResult.action} @ $${checkResult.price}`,
      });
    }

    // 2. Si sigue abierta, cierre forzado por tiempo (18:00)
    const openTrade = await getOpenTrade();
    if (!openTrade) {
      return NextResponse.json({ success: true, action: 'no_position', message: 'No hay posición abierta' });
    }

    // Solo cerrar si es una European Close (no tocar Institutional Push si por algún motivo está abierta)
    if (openTrade.strategy !== 'european_close') {
      return NextResponse.json({
        success: true,
        action: 'skipped',
        message: `Posición abierta es ${openTrade.strategy}, no European Close — no se cierra aquí`,
      });
    }

    const quote = await getFullQuote();
    const result = await closeOpenPosition({ exitPrice: quote.price, status: 'closed_eod' });

    return NextResponse.json({
      success: true,
      action: 'closed_time',
      message: `European Close cerrada a las 18:00 @ $${quote.price}`,
      trade: result?.trade,
    });
  } catch (err) {
    console.error('[european-close-exit]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
