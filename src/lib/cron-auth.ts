import type { NextRequest } from 'next/server';

/**
 * Verifica que la request lleva el CRON_SECRET correcto en el header Authorization.
 * Usar en todos los endpoints de cron para que no sean accesibles públicamente.
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('CRON_SECRET no configurado en variables de entorno');
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}
