import { NavLink, Outlet } from 'react-router';
import { LayoutDashboard, Map, Trophy, FlaskConical, LogOut } from 'lucide-react';
import { KiroGhost } from './KiroGhost';
import { useAcademyStore } from '../store/academyStore';
import { logout } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/map', label: 'World Map', icon: Map },
  { to: '/progress', label: 'Progress', icon: LayoutDashboard },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/sandbox', label: 'Sandbox', icon: FlaskConical },
];

export function AppLayout() {
  const profile = useAcademyStore((s) => s.profile);
  const reset = useAcademyStore((s) => s.reset);

  async function handleSignOut() {
    await logout();
    reset();
    window.location.assign('/');
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border bg-bg-raised px-4 py-3 sm:px-6">
        <NavLink to="/map" className="flex items-center gap-2" aria-label="KiroCrew Academy home">
          <KiroGhost size={36} mood="idle" label="" />
          <span className="text-lg font-bold tracking-tight">KiroCrew Academy</span>
        </NavLink>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-kiro-600 text-white' : 'text-text-muted hover:bg-bg-panel hover:text-text'
                }`
              }
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {profile && (
            <span className="hidden text-sm text-text-muted sm:inline">
              {profile.displayName} - {profile.xp} XP
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-bg-panel hover:text-text"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <nav className="flex items-center justify-around border-b border-border bg-bg-raised px-2 py-2 sm:hidden" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                isActive ? 'text-kiro-300' : 'text-text-muted'
              }`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
