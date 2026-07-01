export type AppErrorCode =
  | "invalid_request"
  | "not_found"
  | "conflict"
  | "invalid_operation"
  | "unsupported_operation";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function invalidRequest(message: string, details?: Record<string, unknown>): AppError {
  return new AppError("invalid_request", message, 400, details);
}

export function notFound(message: string): AppError {
  return new AppError("not_found", message, 404);
}

export function conflict(message: string): AppError {
  return new AppError("conflict", message, 409);
}

export function invalidOperation(message: string, details?: Record<string, unknown>): AppError {
  return new AppError("invalid_operation", message, 409, details);
}

export function unsupportedOperation(message: string): AppError {
  return new AppError("unsupported_operation", message, 501);
}
