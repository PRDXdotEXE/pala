import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AiHealthStatus, AiProvider } from '../src/services/ai/provider';

class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async health(): Promise<AiHealthStatus> {
    return { ok: true, model: 'mock-model' };
  }

  async generate(): Promise<string> {
    return 'ok';
  }
}

describe('GET /api/health', () => {
  it('returns status payload', async () => {
    const app = createApp(new MockAiProvider());
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      provider: 'mock',
      ai: 'up',
      model: 'mock-model',
    });
    expect(['up', 'down']).toContain(res.body.db);
  });
});
