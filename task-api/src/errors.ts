export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** A Zod error as 400: `fields` maps a field name to its first message. */
export class ValidationError extends ApiError {
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string>) {
    super(400, message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}
