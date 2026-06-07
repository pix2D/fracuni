import type { APIRoute } from "astro";
import { getCompany, updateCompany } from "@/lib/companies";
import fs from "node:fs";
import path from "node:path";

const LOGOS_DIR = path.resolve("data/logos");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: "Invalid company ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const company = await getCompany(id);
  if (!company) {
    return new Response(JSON.stringify({ error: "Company not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!file.type.startsWith("image/")) {
    return new Response(JSON.stringify({ error: "File must be an image" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "File exceeds 5 MB limit" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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

  return new Response(JSON.stringify({ logoPath }), {
    headers: { "Content-Type": "application/json" },
  });
};
