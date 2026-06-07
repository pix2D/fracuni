import type { APIRoute } from "astro";
import { updateCompany } from "@/lib/companies";
import fs from "node:fs";
import path from "node:path";

const LOGOS_DIR = path.resolve("data/logos");

export const POST: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const formData = await request.formData();
  const file = formData.get("logo") as File | null;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
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
