import {
  AiTimeoutError,
  AiUnavailableError,
  type AiGenerateOptions,
  type AiHealthStatus,
  type AiProvider,
} from './provider';

interface OllamaGenerateBody {
  model: string;
  prompt: string;
  system?: string;
  stream: false;
  options?: {
    temperature?: number;
    seed?: number;
    num_ctx?: number;
    num_predict?: number;
  };
  format?: 'json' | object;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

interface OllamaTagsResponse {
  models: { name: string }[];
}

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama';

  constructor(
    private readonly host: string,
    private readonly model: string,
  ) {}

  async health(): Promise<AiHealthStatus> {
    try {
      const res = await fetch(`${this.host}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        return { ok: false, model: this.model, detail: `Ollama returned ${res.status}` };
      }
      const data = (await res.json()) as OllamaTagsResponse;
      const installed = data.models.some(
        (m) =>
          m.name === this.model ||
          m.name === `${this.model}:latest` ||
          m.name.startsWith(`${this.model}:`),
      );
      return installed
        ? { ok: true, model: this.model }
        : { ok: false, model: this.model, detail: 'Model not pulled' };
    } catch (err) {
      return {
        ok: false,
        model: this.model,
        detail: err instanceof Error ? err.message : 'Unreachable',
      };
    }
  }

  async generate(prompt: string, options: AiGenerateOptions = {}): Promise<string> {
    const ollamaOptions: OllamaGenerateBody['options'] = {};
    if (options.temperature !== undefined) ollamaOptions.temperature = options.temperature;
    if (options.seed !== undefined) ollamaOptions.seed = options.seed;
    if (options.numCtx !== undefined) ollamaOptions.num_ctx = options.numCtx;
    if (options.numPredict !== undefined) ollamaOptions.num_predict = options.numPredict;

    const body: OllamaGenerateBody = {
      model: this.model,
      prompt,
      stream: false,
      ...(options.system ? { system: options.system } : {}),
      ...(Object.keys(ollamaOptions).length > 0 ? { options: ollamaOptions } : {}),
      ...(options.format === 'json' || typeof options.format === 'object'
        ? { format: options.format }
        : {}),
    };

    let res: Response;
    try {
      res = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new AiTimeoutError('Ollama generate timed out after 120s', err.message);
      }
      const detail = err instanceof Error ? err.message : String(err);
      throw new AiUnavailableError('Ollama unreachable', detail);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new AiUnavailableError(`Ollama generate failed (${res.status})`, text);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    return data.response;
  }
}
