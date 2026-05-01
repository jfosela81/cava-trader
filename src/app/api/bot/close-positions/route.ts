/**
 * Cron: 22:00 CEST (20:00 UTC) — Lunes a Viernes
 *
 * Cierre forzado de todas las posiciones abiertas.
 * NUNCA mantener posiciones overnight.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { forceCloseAll } from '@/lib/bot';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await forceCloseAll();

    return NextResponse.json({
      success: true,
      message: result.closed > 0
        ? `${result.closed} posición(es) cerrada(s) @ $${result.price} (cierre EOD)`
        : 'No había posiciones abiertas',
      ...result,
    });
  } catch (err) {
    console.error('[close-positions]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
