import cookieParser from 'cookie-parser';
import express from 'express';
import type { AiProvider } from './ai/provider';
import { errorHandler } from './middleware/error';
import { createRoutes } from './routes';

export function createApp(ai: AiProvider) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', createRoutes(ai));
  app.use(errorHandler);
  return app;
}
