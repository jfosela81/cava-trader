'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',            label: 'Resumen',     icon: '◈' },
  { href: '/today',       label: 'Hoy',         icon: '◉' },
  { href: '/trades',      label: 'Trades',      icon: '≡' },
  { href: '/strategies',  label: 'Estrategias', icon: '◎' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 flex flex-col border-r"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Cava Trader</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Paper Trading</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                background: active ? 'var(--surface-2)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        <p>Sistema Cava</p>
        <p>SP500 Intradía</p>
      </div>
    </aside>
  );
}
