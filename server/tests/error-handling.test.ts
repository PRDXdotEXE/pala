import type { Request, Response } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { errorHandler } from '../src/middleware/error';
import { HttpError } from '../src/utils/http-error';
import type { AiProvider } from '../src/services/ai/provider';

class NoCallAiProvider implements AiProvider {
  readonly name = 'mock';
  async health() {
    return { ok: true, model: 'mock-model' };
  }
  async generate(): Promise<string> {
    throw new Error('AI must not be called in this suite');
  }
}

function runErrorHandler(err: unknown): { status: number; body: { error: string } } {
  const state: { status: number; body: unknown } = { status: 0, body: undefined };
  const res = {
    status(code: number) {
      state.status = code;
      return res;
    },
    json(payload: unknown) {
      state.body = payload;
      return res;
    },
  } as unknown as Response;

  errorHandler(err, {} as Request, res, () => undefined);
  return { status: state.status, body: state.body as { error: string } };
}

describe('errorHandler sanitizing', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes HttpError through with its message', () => {
    const out = runErrorHandler(new HttpError(404, 'Lead not found'));
    expect(out.status).toBe(404);
    expect(out.body.error).toBe('Lead not found');
  });

  it('never leaks internals from unexpected 5xx errors', () => {
    const out = runErrorHandler(new Error('SELECT * FROM users failed at /secret'));
    expect(out.status).toBe(500);
    expect(out.body.error).toBe('Internal server error');
    expect(out.body.error).not.toContain('SELECT');
  });

  it('maps database connection failures to a friendly 503', () => {
    const conn = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED',
    });
    const out = runErrorHandler(conn);
    expect(out.status).toBe(503);
    expect(out.body.error).toBe('Database unavailable. Please try again shortly.');

    const sqlstate = Object.assign(new Error('connection failure'), { code: '08006' });
    expect(runErrorHandler(sqlstate).status).toBe(503);
  });

  it('maps body-parser failures to precise 4xx messages', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });
    expect(runErrorHandler(tooLarge)).toEqual({
      status: 413,
      body: { error: 'Request body is too large.' },
    });

    const badJson = Object.assign(new Error('Unexpected token } in JSON'), {
      type: 'entity.parse.failed',
      status: 400,
    });
    expect(runErrorHandler(badJson)).toEqual({
      status: 400,
      body: { error: 'Invalid JSON body.' },
    });
  });

  it('sanitizes non-HttpError 5xx with a frozen message even when detail exists', () => {
    const withDetail = Object.assign(new Error('stack trace leak'), { statusCode: 502 });
    const out = runErrorHandler(withDetail);
    expect(out.status).toBe(500);
    expect(out.body.error).toBe('Internal server error');
  });
});

describe('body parsing over HTTP', () => {
  const app = createApp(new NoCallAiProvider());

  it('rejects malformed JSON with a friendly 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON body.');
  });

  it('rejects an oversized body with 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.c', password: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
    expect(res.body.error).toBe('Request body is too large.');
  });
});
