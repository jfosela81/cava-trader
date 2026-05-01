interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ label, value, sub, trend }: MetricCardProps) {
  const trendColor =
    trend === 'up' ? 'var(--green)' :
    trend === 'down' ? 'var(--red)' :
    'var(--text-primary)';

  return (
    <div className="rounded-lg p-4 border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: trendColor }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}
