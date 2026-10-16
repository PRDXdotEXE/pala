import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, logout } from '../api/auth';
import { ShortcutHelp, useAppShortcuts } from './Shortcuts';
import { ThemeToggle } from './ThemeToggle';
import { ui } from '../lib/ui';
import { toggleTheme } from '../lib/theme';
import type { User } from '../types';

function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-700" />
      <p className={ui.muted}>Checking your session…</p>
    </div>
  );
}

function Layout({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useAppShortcuts({ navigate, toggleTheme, openHelp });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['leads'] });
      navigate('/login', { replace: true });
    },
  });

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'rounded px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300'
      : 'rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3 sm:gap-2">
          <span className="mr-2 text-sm font-bold text-gray-900 dark:text-gray-100">
            Lead Assistant
          </span>
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/leads" className={linkClass}>
            Leads
          </NavLink>
          <NavLink to="/ai/analyze" className={linkClass}>
            AI Analyze
          </NavLink>
          <NavLink
            to="/leads/new"
            className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Lead
          </NavLink>
          <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
            {user.email}
          </span>
          <button
            type="button"
            onClick={openHelp}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="hidden rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:block"
          >
            ?
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <ShortcutHelp open={helpOpen} onClose={closeHelp} />
    </div>
  );
}

export function Protected() {
  const location = useLocation();
  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });

  if (me.isLoading) return <AuthLoading />;
  if (me.isError || !me.data?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Layout user={me.data.user} />;
}
