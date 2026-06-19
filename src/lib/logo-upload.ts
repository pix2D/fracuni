export const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

export const LOGO_TYPES = {
  "image/jpeg": { extension: ".jpg", contentType: "image/jpeg" },
  "image/png": { extension: ".png", contentType: "image/png" },
  "image/webp": { extension: ".webp", contentType: "image/webp" },
} as const;

export const LOGO_ACCEPT = Object.keys(LOGO_TYPES).join(",");

type LogoFileLike = {
  type: string;
  size: number;
};

export function logoTypeForMime(mimeType: string): (typeof LOGO_TYPES)[keyof typeof LOGO_TYPES] | null {
  return LOGO_TYPES[mimeType as keyof typeof LOGO_TYPES] ?? null;
}

export function logoFileError(file: LogoFileLike | null | undefined): string | null {
  if (!file) return "Choose a logo file.";
  if (!logoTypeForMime(file.type)) return "File must be a PNG, JPEG, or WebP image";
  if (file.size > MAX_LOGO_FILE_SIZE) return "File exceeds 5 MB limit";
  return null;
}
