import { pool } from '../db/client';
import type { AiProvider } from './ai/provider';

export interface HealthStatus {
  status: 'ok';
  db: 'up' | 'down';
  ai: 'up' | 'down';
  model: string;
  provider: string;
  aiDetail?: string;
}

export async function checkDatabase(): Promise<'up' | 'down'> {
  try {
    await pool.query('SELECT 1');
    return 'up';
  } catch {
    return 'down';
  }
}

export async function getHealthStatus(ai: AiProvider): Promise<HealthStatus> {
  const [db, aiStatus] = await Promise.all([checkDatabase(), ai.health()]);

  return {
    status: 'ok',
    db,
    ai: aiStatus.ok ? 'up' : 'down',
    model: aiStatus.model,
    provider: ai.name,
    ...(aiStatus.detail ? { aiDetail: aiStatus.detail } : {}),
  };
}
