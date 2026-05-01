/**
 * Cron: 08:00 CEST (06:00 UTC) — Martes a Sábado (resumen del día anterior)
 *
 * Genera el resumen diario de la sesión anterior y lo guarda en cava_daily_summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { generateDailySummary } from '@/lib/bot';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await generateDailySummary();
    return NextResponse.json({ success: true, message: 'Resumen diario generado' });
  } catch (err) {
    console.error('[daily-summary]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
