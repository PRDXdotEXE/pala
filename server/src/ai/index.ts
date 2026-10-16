import { env } from '../config/env';
import type { AiProvider } from './provider';
import { OllamaProvider } from './ollama';

export function createAiProvider(): AiProvider {
  switch (env.AI_PROVIDER) {
    case 'ollama':
      return new OllamaProvider(env.OLLAMA_HOST, env.OLLAMA_MODEL);
    default: {
      const exhaustive: never = env.AI_PROVIDER;
      throw new Error(`Unknown AI provider: ${exhaustive}`);
    }
  }
}

export type { AiProvider, AiGenerateOptions, AiHealthStatus } from './provider';
