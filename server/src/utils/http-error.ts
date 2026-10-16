export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    /** Technical detail for server logs only — never sent to the client. */
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
