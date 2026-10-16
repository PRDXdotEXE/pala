import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, logout } from '../api/auth';
import type { User } from '../types';

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-gray-500">
      Loading…
    </div>
  );
}

function Layout({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      ? 'rounded px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50'
      : 'rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-2 text-sm font-bold text-gray-900">Lead Assistant</span>
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/leads" className={linkClass}>
            Leads
          </NavLink>
          <NavLink
            to="/leads/new"
            className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Lead
          </NavLink>
          <span className="hidden text-xs text-gray-400 sm:inline">{user.email}</span>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export function Protected() {
  const location = useLocation();
  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });

  if (me.isLoading) return <Spinner />;
  if (me.isError || !me.data?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Layout user={me.data.user} />;
}
