'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DailySummary } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EquityCurveProps {
  summaries: DailySummary[];
  initialCapital: number;
}

export function EquityCurve({ summaries, initialCapital }: EquityCurveProps) {
  const data = [
    { date: 'Inicio', capital: initialCapital },
    ...summaries
      .slice()
      .reverse()
      .filter(s => s.capital_eod !== null)
      .map(s => ({
        date: format(new Date(s.date), 'dd MMM', { locale: es }),
        capital: s.capital_eod!,
      })),
  ];

  const min = Math.min(...data.map(d => d.capital)) * 0.995;
  const max = Math.max(...data.map(d => d.capital)) * 1.005;
  const isPositive = data[data.length - 1]?.capital >= initialCapital;

  return (
    <div className="rounded-lg border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
        Equity Curve
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? '#3fb950' : '#f85149'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? '#3fb950' : '#f85149'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[min, max]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} width={52} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Capital']}
          />
          <Area
            type="monotone" dataKey="capital"
            stroke={isPositive ? '#3fb950' : '#f85149'} strokeWidth={2}
            fill="url(#colorCapital)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
