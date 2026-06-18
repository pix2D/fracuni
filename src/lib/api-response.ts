export async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  if (typeof body.error === "string") return body.error;
  return fallback;
}
