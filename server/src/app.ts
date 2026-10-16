import cookieParser from 'cookie-parser';
import express from 'express';
import type { AiProvider } from './services/ai/provider';
import { env } from './config/env';
import { cors } from './middleware/cors';
import { errorHandler } from './middleware/error';
import { createRoutes } from './routes';

export function createApp(ai: AiProvider) {
  const app = express();
  // Matches the largest validated payload (20k-char conversation) with headroom;
  // oversized bodies are rejected with a friendly 413 by middleware/error.ts.
  app.use(express.json({ limit: '128kb' }));
  app.use(cookieParser());
  if (env.CORS_ORIGIN) {
    app.use(cors(env.CORS_ORIGIN));
  }
  app.use('/api', createRoutes(ai));
  app.use(errorHandler);
  return app;
}
