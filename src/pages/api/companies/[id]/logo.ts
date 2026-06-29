import type { APIRoute } from "astro";
import { getCompany, updateCompany } from "@/lib/companies";
import { errorResponse, handleApiError, jsonResponse, parseIdParam } from "@/lib/api";
import { getDataDir, resolveDataPath, resolveDataRelativePath } from "@/lib/data-dir";
import { LOGO_TYPES, logoFileError, logoTypeForMime } from "@/lib/logo-upload";
import fs from "node:fs/promises";
import path from "node:path";

const LOGOS_SUBDIR = "logos";

async function resolveExistingDataPath(relativePath: string): Promise<string | null> {
  const dataDir = getDataDir();
  const resolved = resolveDataRelativePath(relativePath);
  if (!resolved) return null;

  try {
    const [realDataDir, realFilePath] = await Promise.all([
      fs.realpath(dataDir),
      fs.realpath(resolved),
    ]);
    if (realFilePath !== realDataDir && !realFilePath.startsWith(realDataDir + path.sep)) return null;
    return realFilePath;
  } catch {
    return null;
  }
}

function contentTypeForPath(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const logoType = Object.values(LOGO_TYPES).find((type) => type.extension === ext);
  return logoType?.contentType ?? null;
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "company");
    const company = await getCompany(id);
    if (!company?.logoPath) {
      return errorResponse("Logo not found", 404);
    }

    const filepath = await resolveExistingDataPath(company.logoPath);
    const contentType = filepath ? contentTypeForPath(filepath) : null;
    if (!filepath || !contentType) {
      return errorResponse("Logo not found", 404);
    }

    return new Response(await fs.readFile(filepath), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const id = parseIdParam(params.id, "company");
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

    const logoError = logoFileError(file);
    if (logoError) {
      return errorResponse(logoError, 400);
    }

    const logoType = logoTypeForMime(file.type);
    if (!logoType) return errorResponse("File must be a PNG, JPEG, or WebP image", 400);

    const filename = `${id}${logoType.extension}`;
    const logosDir = resolveDataPath(LOGOS_SUBDIR);
    const filepath = path.join(logosDir, filename);

    await fs.mkdir(logosDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const logoPath = `logos/${filename}`;
    await updateCompany(id, { logoPath });

    return jsonResponse({ logoPath });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
