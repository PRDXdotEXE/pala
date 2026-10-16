import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Analyze } from './Analyze';
import type { LeadExtraction } from '../types';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const extraction: LeadExtraction = {
  clientName: 'ABC Restaurant',
  company: 'ABC Restaurant',
  project: 'Restaurant Website',
  description: 'A modern website with online ordering.',
  budgetMin: 40000,
  budgetMax: 40000,
  currency: 'NPR',
  deadline: 'Before Dashain',
  status: 'interested',
  priority: 'high',
  nextAction: 'Send a proposal',
};

const createdLead = {
  id: 'lead-1',
  userId: 'u1',
  clientName: 'ABC Restaurant',
  company: 'ABC Restaurant',
  project: 'Restaurant Website',
  description: 'A modern website with online ordering.',
  budgetMin: 40000,
  budgetMax: 40000,
  currency: 'NPR',
  status: 'interested',
  priority: 'high',
  deadline: null,
  nextFollowUp: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type FetchArgs = [RequestInfo | URL, RequestInit | undefined];

function stubFetch(
  handler: (url: string, init: RequestInit | undefined) => Response,
): ReturnType<typeof vi.fn> {
  const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

function renderAnalyze() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/ai/analyze']}>
        <Routes>
          <Route path="/ai/analyze" element={<Analyze />} />
          <Route path="/leads/:id" element={<p>Lead detail page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function paste(text: string) {
  fireEvent.change(screen.getByLabelText('Paste Client Conversation'), {
    target: { value: text },
  });
}

/** Scoped queries for the analysis card, so textarea/paste text never matches. */
async function openSummary() {
  const heading = await screen.findByRole('heading', { name: 'AI Analysis' });
  const section = heading.closest('section');
  if (!section) throw new Error('AI Analysis card not found');
  return within(section);
}

function sentBody(mock: ReturnType<typeof vi.fn>, url: string): Record<string, unknown> {
  const call = (mock.mock.calls as FetchArgs[]).find(([u]) => String(u) === url);
  if (!call || !call[1]?.body) throw new Error(`no request to ${url}`);
  return JSON.parse(String(call[1].body)) as Record<string, unknown>;
}

describe('Analyze page', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('analyzes a conversation, shows the extraction, and creates the lead on request', async () => {
    const fetchMock = stubFetch((url, init) => {
      if (url.endsWith('/api/ai/analyze')) return jsonResponse({ lead: extraction });
      if (url.endsWith('/api/leads') && init?.method === 'POST') {
        return jsonResponse({ lead: createdLead }, 201);
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    renderAnalyze();

    expect(screen.getByRole('button', { name: 'Analyze' })).toHaveProperty('disabled', true);
    paste('Hi, I run ABC Restaurant. I need a website. Budget NPR 40,000, before Dashain.');
    expect(screen.getByRole('button', { name: 'Analyze' })).toHaveProperty('disabled', false);

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    const card = await openSummary();
    expect(card.getAllByText('ABC Restaurant').length).toBeGreaterThan(0);
    expect(card.getByText('Restaurant Website')).toBeTruthy();
    expect(card.getByText(/40,000/)).toBeTruthy();
    expect(card.getByText(/Before Dashain/)).toBeTruthy();
    expect(card.getByText('high')).toBeTruthy();
    expect(card.getByText('Send a proposal')).toBeTruthy();

    fireEvent.click(card.getByRole('button', { name: 'Create Lead' }));

    expect(await screen.findByText('Lead detail page')).toBeTruthy();
    expect(sentBody(fetchMock, '/api/leads')).toMatchObject({
      clientName: 'ABC Restaurant',
      project: 'Restaurant Website',
      budgetMin: 40000,
      currency: 'NPR',
      status: 'interested',
      priority: 'high',
      deadline: null,
      nextFollowUp: null,
    });
  });

  it('blocks creating without a client name and lets the user edit the result first', async () => {
    const sparse: LeadExtraction = {
      clientName: null,
      company: null,
      project: 'Landing page',
      description: null,
      budgetMin: null,
      budgetMax: null,
      currency: null,
      deadline: '2 weeks',
      status: null,
      priority: null,
      nextAction: null,
    };

    const fetchMock = stubFetch((url, init) => {
      if (url.endsWith('/api/ai/analyze')) return jsonResponse({ lead: sparse });
      if (url.endsWith('/api/leads') && init?.method === 'POST') {
        return jsonResponse({ lead: createdLead }, 201);
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    renderAnalyze();
    paste('I need a landing page in 2 weeks.');
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    const card = await openSummary();
    expect(card.getAllByText('not stated').length).toBeGreaterThan(3);

    expect(card.getByRole('button', { name: 'Create Lead' })).toHaveProperty('disabled', true);
    expect(card.getByText(/No client name found/)).toBeTruthy();

    fireEvent.click(card.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText(/AI read the deadline as/)).toBeTruthy();

    const clientInput = screen.getByLabelText(/Client name/);
    fireEvent.change(clientInput, { target: { value: 'Sita Gurung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create lead' }));

    expect(await screen.findByText('Lead detail page')).toBeTruthy();
    expect(sentBody(fetchMock, '/api/leads')).toMatchObject({
      clientName: 'Sita Gurung',
      project: 'Landing page',
      currency: 'USD',
      status: 'new',
      priority: 'medium',
      deadline: null,
    });
  });

  it('shows the AI service error instead of a broken result', async () => {
    stubFetch((url) => {
      if (url.endsWith('/api/ai/analyze')) {
        return jsonResponse(
          { error: 'AI returned data that failed validation: budgetMin: Expected number' },
          502,
        );
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    renderAnalyze();
    paste('garbage in');
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByText(/failed validation/)).toBeTruthy();
    expect(screen.queryByText('AI Analysis')).toBeNull();
  });

  it('replaces the previous result when the conversation is analyzed again', async () => {
    let calls = 0;
    stubFetch((url) => {
      if (url.endsWith('/api/ai/analyze')) {
        calls += 1;
        return jsonResponse({
          lead: { ...extraction, project: calls === 1 ? 'Website' : 'Mobile app' },
        });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    renderAnalyze();
    paste('first conversation');
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    const first = await openSummary();
    expect(first.getByText('Website')).toBeTruthy();

    paste('second conversation');
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    const second = await openSummary();
    expect(second.getByText('Mobile app')).toBeTruthy();
    expect(second.queryByText('Website')).toBeNull();
  });
});
