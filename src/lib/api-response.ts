export async function responseError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}

export async function responseEntityId(response: Response): Promise<number | null> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "id" in body && typeof body.id === "number") {
    return body.id;
  }
  return null;
}
