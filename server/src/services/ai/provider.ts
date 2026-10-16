export interface AiGenerateOptions {
  system?: string;
  temperature?: number;
  seed?: number;
  numCtx?: number;
  numPredict?: number;
  /** `'text'` (default), `'json'`, or a JSON Schema object for constrained decoding. */
  format?: 'text' | 'json' | object;
}

export interface AiHealthStatus {
  ok: boolean;
  model: string;
  detail?: string;
}

export interface AiProvider {
  readonly name: string;
  health(): Promise<AiHealthStatus>;
  generate(prompt: string, options?: AiGenerateOptions): Promise<string>;
}

/** Provider unreachable (Ollama down, connection refused, non-OK response). Maps to 503. */
export class AiUnavailableError extends Error {
  constructor(
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

/** Generation exceeded the provider timeout. Maps to 504. */
export class AiTimeoutError extends Error {
  constructor(
    message = 'AI generation timed out',
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'AiTimeoutError';
  }
}
