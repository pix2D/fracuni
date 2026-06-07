import type { APIRoute } from "astro";
import { getCompany, updateCompany } from "@/lib/companies";
import { errorResponse, jsonResponse, parseIdParam } from "@/lib/api";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const LOGOS_DIR = path.resolve("data/logos");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function resolveDataPath(relativePath: string): string | null {
  const resolved = path.resolve(DATA_DIR, relativePath);
  if (resolved !== DATA_DIR && !resolved.startsWith(DATA_DIR + path.sep)) return null;
  return resolved;
}

function contentTypeForPath(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

export const GET: APIRoute = async ({ params }) => {
  const id = parseIdParam(params.id, "company");
  if (id instanceof Response) return id;

  const company = await getCompany(id);
  if (!company?.logoPath) {
    return errorResponse("Logo not found", 404);
  }

  const filepath = resolveDataPath(company.logoPath);
  if (!filepath || !fs.existsSync(filepath)) {
    return errorResponse("Logo not found", 404);
  }

  return new Response(fs.readFileSync(filepath), {
    headers: { "Content-Type": contentTypeForPath(filepath) },
  });
};

export const POST: APIRoute = async ({ params, request }) => {
  const id = parseIdParam(params.id, "company");
  if (id instanceof Response) return id;

  const company = await getCompany(id);
  if (!company) {
    return errorResponse("Company not found", 404);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Invalid form data", 400);
  }

  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return errorResponse("No file provided", 400);
  }

  if (!file.type.startsWith("image/")) {
    return errorResponse("File must be an image", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse("File exceeds 5 MB limit", 400);
  }

  const ext = path.extname(file.name) || ".png";
  const filename = `${id}${ext}`;
  const filepath = path.join(LOGOS_DIR, filename);

  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  const logoPath = `logos/${filename}`;
  await updateCompany(id, { logoPath });

  return jsonResponse({ logoPath });
};
