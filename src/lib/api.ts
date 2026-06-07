import { z } from "zod/v4";
import { AppError, invalidRequest } from "@/lib/app-errors";

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export function errorResponse(error: string, status: number, extra?: Record<string, unknown>): Response {
  return jsonResponse({ error, ...extra }, { status });
}

function appErrorResponse(error: AppError): Response {
  return errorResponse(error.message, error.status, { code: error.code, ...error.details });
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) return appErrorResponse(error);
  throw error;
}

export function parseIdParam(raw: string | undefined, name: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw invalidRequest(`Invalid ${name} ID`);
  }
  return id;
}

export async function parseJsonRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw invalidRequest("Invalid JSON");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw invalidRequest("Validation failed", { issues: result.error.issues });
  }

  return result.data;
}
