import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/error';
import { rateLimit } from '../src/middleware/rate-limit';

function buildApp(options: Parameters<typeof rateLimit>[0]) {
  const app = express();
  app.use(express.json());
  app.use(rateLimit(options));
  app.get('/ping', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('rateLimit', () => {
  it('allows requests under the limit, then returns a friendly 429', async () => {
    const app = buildApp({ windowMs: 60_000, max: 3, enabled: true });

    for (let i = 0; i < 3; i++) {
      const ok = await request(app).get('/ping');
      expect(ok.status).toBe(200);
      expect(ok.headers['x-ratelimit-limit']).toBe('3');
    }

    const limited = await request(app).get('/ping');
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe('Too many requests. Please wait a moment and try again.');
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('never blocks when disabled', async () => {
    const app = buildApp({ windowMs: 60_000, max: 1, enabled: false });
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/ping');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
  });

  it('resets after the window passes', async () => {
    const app = buildApp({ windowMs: 250, max: 1, enabled: true });
    expect((await request(app).get('/ping')).status).toBe(200);
    expect((await request(app).get('/ping')).status).toBe(429);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect((await request(app).get('/ping')).status).toBe(200);
  });
});
