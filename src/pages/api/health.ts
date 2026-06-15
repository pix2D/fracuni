import type { APIRoute } from "astro";
import { checkViesHealth } from "@/lib/vies";
import { checkHnbHealth } from "@/lib/hnb";
import { jsonResponse } from "@/lib/api";

// Surfaces external-API reachability so the Invoice form can warn the user
// before they attempt a finalization that depends on VIES / HNB.
export const GET: APIRoute = async () => {
  const [vies, hnb] = await Promise.all([checkViesHealth(), checkHnbHealth()]);
  return jsonResponse({ vies, hnb });
};
