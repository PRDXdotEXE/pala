process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.OLLAMA_HOST ??= 'http://localhost:11434';
process.env.OLLAMA_MODEL ??= 'qwen2.5:1.5b';
process.env.AI_PROVIDER ??= 'ollama';
process.env.PORT ??= '3001';
