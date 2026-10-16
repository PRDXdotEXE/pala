import type { AiGenerateOptions, AiHealthStatus, AiProvider } from './provider';

interface OllamaGenerateBody {
  model: string;
  prompt: string;
  system?: string;
  stream: false;
  options?: { temperature?: number };
  format?: 'json';
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
    const body: OllamaGenerateBody = {
      model: this.model,
      prompt,
      stream: false,
      ...(options.system ? { system: options.system } : {}),
      ...(options.temperature !== undefined
        ? { options: { temperature: options.temperature } }
        : {}),
      ...(options.format === 'json' ? { format: 'json' as const } : {}),
    };

    const res = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama generate failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    return data.response;
  }
}
