import { z } from "zod/v4";
import { AppError } from "@/lib/app-errors";

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

export function appErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AppError)) return null;
  return errorResponse(error.message, error.status, { code: error.code });
}

export function parseIdParam(raw: string | undefined, name: string): number | Response {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(`Invalid ${name} ID`, 400);
  }
  return id;
}

export async function parseJsonRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, { issues: result.error.issues });
  }

  return result.data;
}
