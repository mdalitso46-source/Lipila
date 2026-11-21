export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const SECRET_KEY = /\bS[A-Z2-7]{55}\b/g;

export function redactSecrets(message: string): string {
  return message.replace(SECRET_KEY, "[redacted-secret]");
}

export function httpError(error: unknown): { message: string; status: number } {
  if (error instanceof HttpError) return { message: redactSecrets(error.message), status: error.status };
  if (error instanceof Error) return { message: redactSecrets(error.message), status: 400 };
  return { message: "Something went wrong", status: 400 };
}
