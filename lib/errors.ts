export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function httpError(error: unknown): { message: string; status: number } {
  if (error instanceof HttpError) return { message: error.message, status: error.status };
  if (error instanceof Error) return { message: error.message, status: 400 };
  return { message: "Something went wrong", status: 400 };
}
