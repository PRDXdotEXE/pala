import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.OLLAMA_HOST ??= 'http://localhost:11434';
process.env.OLLAMA_MODEL ??= 'qwen2.5:1.5b';
process.env.AI_PROVIDER ??= 'ollama';
process.env.PORT ??= '3001';
process.env.JWT_SECRET ??= 'test-secret-0123456789abcdef';
