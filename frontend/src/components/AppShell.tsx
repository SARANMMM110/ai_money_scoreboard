import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: '◫' },
  { to: '/app/scan', label: 'New Scan', icon: '◎' },
  { to: '/app/history', label: 'History', icon: '◷' },
  { to: '/app/settings', label: 'Settings', icon: '⚙' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-line bg-surface flex flex-col">
        <div className="p-5 border-b border-line">
          <Link to="/app" className="font-display text-lg font-semibold tracking-tight text-text">
            AI Money<span className="text-brand">.</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/app' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? 'bg-surface-2 text-brand' : 'text-text-dim hover:text-text hover:bg-surface-2/50'
                }`}
              >
                <span className="text-base opacity-60">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-line">
          <p className="text-xs text-text-faint truncate mb-2">{user?.email}</p>
          <button
            onClick={logout}
            className="text-xs text-text-dim hover:text-text transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
