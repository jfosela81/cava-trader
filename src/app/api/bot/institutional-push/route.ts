/**
 * Cron: 21:00 CEST (19:00 UTC) — Lunes a Viernes
 *
 * 1. Comprueba si la posición abierta tocó SL/TP
 * 2. Evalúa señal Institutional Push
 * 3. Si hay señal y se puede operar, abre LONG
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { canOpenNewTrade, openTrade, checkAndCloseIfHit } from '@/lib/bot';
import { evaluateInstitutionalPush } from '@/lib/strategies/institutional-push';
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
    const signal = await evaluateInstitutionalPush();
    log.push(`Señal: ${signal.reason}`);

    if (!signal.signal) {
      return NextResponse.json({ success: true, action: 'no_signal', log, data: signal.data });
    }

    // 4. Abrir LONG
    const quote = await getFullQuote();
    const trade = await openTrade(
      'institutional_push',
      'long',
      quote.price,
      `IP: precio $${quote.price.toFixed(2)} > media sesión $${signal.data.session_average.toFixed(2)}`
    );

    log.push(`Trade abierto: LONG @ $${trade.entry_price} | SL: $${trade.stop_loss} | TP: $${trade.take_profit}`);

    return NextResponse.json({ success: true, action: 'trade_opened', trade, log });
  } catch (err) {
    console.error('[institutional-push]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
