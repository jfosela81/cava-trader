'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MarketPrice } from '@/types';

export function LivePrice() {
  const [data, setData] = useState<MarketPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/market/price');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdate(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000); // refresca cada minuto
    return () => clearInterval(id);
  }, [fetch_]);

  if (loading) {
    return (
      <div className="rounded-lg border p-6 animate-pulse" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="h-8 w-32 rounded" style={{ background: 'var(--surface-2)' }} />
      </div>
    );
  }

  if (!data) return null;

  const positive = data.change >= 0;

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          SPY — S&P 500 ETF
        </p>
        <span className="text-xs px-2 py-0.5 rounded"
          style={{
            background: data.is_market_open ? '#1a3328' : 'var(--surface-2)',
            color: data.is_market_open ? 'var(--green)' : 'var(--text-secondary)',
          }}>
          {data.is_market_open ? '● Mercado abierto' : '○ Mercado cerrado'}
        </span>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-4xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          ${data.price?.toFixed(2) ?? '—'}
        </span>
        <span className="text-lg font-medium mb-0.5 tabular-nums"
          style={{ color: positive ? 'var(--green)' : 'var(--red)' }}>
          {positive ? '+' : ''}{data.change?.toFixed(2)} ({positive ? '+' : ''}{data.change_percent?.toFixed(2)}%)
        </span>
      </div>

      {lastUpdate && (
        <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
          Actualizado: {lastUpdate.toLocaleTimeString('es-ES')} · Refresca cada 60s
        </p>
      )}
    </div>
  );
}
