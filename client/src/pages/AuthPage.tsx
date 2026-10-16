import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, login, register } from '../api/auth';

const inputClass =
  'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });
  if (me.data?.user) return <Navigate to={from} replace />;

  const authMutation = useMutation({
    mutationFn: () =>
      mode === 'login'
        ? login({ email, password })
        : register({ name, email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], { user: data.user });
      navigate(from, { replace: true });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    authMutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/register">
                Register
              </Link>
            </>
          ) : (
            <>
              Already registered?{' '}
              <Link className="text-blue-600 hover:underline dark:text-blue-400" to="/login">
                Sign in
              </Link>
            </>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {authMutation.isError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {authMutation.error instanceof Error
                ? authMutation.error.message
                : 'Authentication failed'}
            </p>
          )}

          <button
            type="submit"
            disabled={authMutation.isPending}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {authMutation.isPending
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
