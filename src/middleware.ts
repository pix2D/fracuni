import { defineMiddleware } from "astro:middleware";
import { rejectUntrustedBrowserRequest, secureResponse } from "@/lib/request-security";

export const onRequest = defineMiddleware(async (context, next) => {
  const rejection = rejectUntrustedBrowserRequest(context.request, context.url);
  if (rejection) return rejection;

  return secureResponse(await next());
});
