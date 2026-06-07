import type { APIRoute } from "astro";
import { getHolidays, refreshHolidays } from "@/lib/nager";
import { errorResponse, jsonResponse } from "@/lib/api";

function parseYear(url: URL): number | null {
  const raw = url.searchParams.get("year");
  if (!raw) return null;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1) return null;
  return year;
}

export const GET: APIRoute = async ({ request }) => {
  const year = parseYear(new URL(request.url));
  if (!year) return errorResponse("Missing or invalid year parameter", 400);

  const result = await getHolidays(year);
  if (!result.ok) return errorResponse(result.error, 502);
  return jsonResponse({ holidays: result.holidays });
};

export const POST: APIRoute = async ({ request }) => {
  const year = parseYear(new URL(request.url));
  if (!year) return errorResponse("Missing or invalid year parameter", 400);

  const result = await refreshHolidays(year);
  if (!result.ok) return errorResponse(result.error, 502);
  return jsonResponse({ holidays: result.holidays });
};
