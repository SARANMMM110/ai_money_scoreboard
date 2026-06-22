import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import {
  IconSearch,
  IconGrid,
  IconPlusCircle,
  IconClock,
  IconSettings,
  IconLogOut,
} from './icons';

const navItems = [
  { to: '/app', label: 'Scans', icon: IconGrid, match: (path: string) => path === '/app' || path.startsWith('/app/results') },
  { to: '/app/scan', label: 'New Scan', icon: IconPlusCircle, match: (path: string) => path.startsWith('/app/scan') },
  { to: '/app/history', label: 'History', icon: IconClock, match: (path: string) => path.startsWith('/app/history') },
  { to: '/app/settings', label: 'Settings', icon: IconSettings, match: (path: string) => path.startsWith('/app/settings') },
];

function userInitial(user: { name: string | null; email: string } | null) {
  if (!user) return '?';
  if (user.name) return user.name.charAt(0).toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      <aside className="w-[240px] shrink-0 h-full flex flex-col overflow-hidden bg-sidebar-gradient border-r border-sidebar-line text-sidebar-text">
        <div className="p-5">
          <Link to="/app" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
              <IconSearch size={18} />
            </div>
            <BrandLogo variant="dark" size="md" />
          </Link>
        </div>

        <nav className="flex-1 min-h-0 px-3 space-y-1 overflow-hidden">
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? 'bg-brand text-white font-medium shadow-[0_4px_14px_rgba(14,169,141,0.35)]'
                    : 'text-sidebar-inactive hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-sidebar-inactive group-hover:text-white'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-line">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand/20 text-brand font-semibold text-sm flex items-center justify-center shrink-0">
              {userInitial(user)}
            </div>
            <p className="text-xs text-sidebar-inactive truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-sidebar-inactive hover:text-white transition-colors"
          >
            <IconLogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
