import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the dashboard for an authenticated user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/auth/me')) {
          return Promise.resolve(
            jsonResponse({
              user: {
                id: 'u1',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date().toISOString(),
              },
            }),
          );
        }
        if (url.includes('/api/leads')) {
          return Promise.resolve(jsonResponse({ leads: [] }));
        }
        return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Total Leads')).toBeTruthy();
    expect(await screen.findByText('Create your first lead')).toBeTruthy();
  });

  it('redirects unauthenticated users to login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ error: 'Unauthorized' }, 401))),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leads']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeTruthy();
  });
});
