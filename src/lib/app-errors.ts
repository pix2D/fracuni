export type AppErrorCode = "not_found" | "conflict" | "invalid_operation" | "unsupported_operation";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message: string): AppError {
  return new AppError("not_found", message, 404);
}

export function conflict(message: string): AppError {
  return new AppError("conflict", message, 409);
}

export function invalidOperation(message: string): AppError {
  return new AppError("invalid_operation", message, 409);
}

export function unsupportedOperation(message: string): AppError {
  return new AppError("unsupported_operation", message, 409);
}
