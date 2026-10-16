export interface AiGenerateOptions {
  system?: string;
  temperature?: number;
  format?: 'text' | 'json';
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
