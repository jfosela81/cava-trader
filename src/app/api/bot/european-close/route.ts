/**
 * Cron: 17:00 CEST (15:00 UTC) — Lunes a Viernes
 *
 * 1. Comprueba si la posición abierta tocó SL/TP
 * 2. Evalúa señal European Close
 * 3. Si hay señal y se puede operar, abre SHORT
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { canOpenNewTrade, openTrade, checkAndCloseIfHit } from '@/lib/bot';
import { evaluateEuropeanClose } from '@/lib/strategies/european-close';
import { getFullQuote } from '@/lib/twelvedata';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const log: string[] = [];

    // 1. Cerrar si SL/TP fue alcanzado desde el último cron
    const checkResult = await checkAndCloseIfHit();
    if (checkResult.action !== 'no_position' && checkResult.action !== 'no_hit') {
      log.push(`Posición previa cerrada por ${checkResult.action} @ $${checkResult.price}`);
    }

    // 2. Verificar si podemos operar
    const { can, reason } = await canOpenNewTrade();
    if (!can) {
      log.push(`No se abre trade: ${reason}`);
      return NextResponse.json({ success: true, action: 'skipped', log });
    }

    // 3. Evaluar señal
    const signal = await evaluateEuropeanClose();
    log.push(`Señal: ${signal.reason}`);

    if (!signal.signal) {
      return NextResponse.json({ success: true, action: 'no_signal', log, data: signal.data });
    }

    // 4. Abrir SHORT
    const quote = await getFullQuote();
    const trade = await openTrade(
      'european_close',
      'short',
      quote.price,
      `EC: +${signal.data.change_from_open_pct.toFixed(2)}% desde apertura`
    );

    log.push(`Trade abierto: SHORT @ $${trade.entry_price} | SL: $${trade.stop_loss} | TP: $${trade.take_profit}`);

    return NextResponse.json({ success: true, action: 'trade_opened', trade, log });
  } catch (err) {
    console.error('[european-close]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
