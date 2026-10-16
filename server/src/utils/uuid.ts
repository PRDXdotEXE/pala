import { z } from 'zod';
import { HttpError } from './http-error';

const uuidSchema = z.uuid();

export function parseUuidOr404(value: string, message = 'Not found'): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(404, message);
  }
  return result.data;
}
