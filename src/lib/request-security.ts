const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const BLOCKED_FETCH_SITES = new Set(["cross-site", "same-site"]);
const TRUSTED_TAILSCALE_SUFFIX = ".pony-puffin.ts.net";

type ParsedHost = {
  host: string;
  hostname: string;
};

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function parseHostHeader(value: string | null): ParsedHost | null {
  const host = firstHeaderValue(value);
  if (!host || /[/\\\s]/.test(host)) return null;

  try {
    const url = new URL(`http://${host}`);
    return {
      host: url.host.toLowerCase(),
      hostname: url.hostname.toLowerCase(),
    };
  } catch {
    return null;
  }
}

function normalizedHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isLocalHostname(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function isTailscaleHostname(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  return normalized.endsWith(TRUSTED_TAILSCALE_SUFFIX) && normalized !== TRUSTED_TAILSCALE_SUFFIX.slice(1);
}

function isAllowedTargetHost(hostname: string): boolean {
  return isLocalHostname(hostname) || isTailscaleHostname(hostname);
}

function originFor(protocol: string, host: string): string | null {
  try {
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return null;
  }
}

function trustedForwardedOrigin(headers: Headers): string | null {
  const forwardedHost = parseHostHeader(headers.get("x-forwarded-host"));
  if (!forwardedHost) return null;

  const forwardedProto = firstHeaderValue(headers.get("x-forwarded-proto"))?.toLowerCase();
  if (forwardedProto !== "https" || !isTailscaleHostname(forwardedHost.hostname)) {
    return null;
  }

  return originFor("https:", forwardedHost.host);
}

function trustedRequestTargetOrigins(request: Request, url: URL): Set<string> {
  const origins = new Set<string>([url.origin]);
  const host = parseHostHeader(request.headers.get("host"));

  if (host && isAllowedTargetHost(host.hostname)) {
    const directOrigin = originFor(url.protocol, host.host);
    if (directOrigin) origins.add(directOrigin);
    if (isTailscaleHostname(host.hostname)) {
      const httpsOrigin = originFor("https:", host.host);
      if (httpsOrigin) origins.add(httpsOrigin);
    }
  }

  const forwardedOrigin = trustedForwardedOrigin(request.headers);
  if (forwardedOrigin) origins.add(forwardedOrigin);

  return origins;
}

function hasTrustedTargetHost(request: Request): boolean {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) return trustedForwardedOrigin(request.headers) !== null;

  const host = parseHostHeader(request.headers.get("host"));
  return Boolean(host && isAllowedTargetHost(host.hostname));
}

function isUnsafeMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function securityHeaders(): HeadersInit {
  return {
    "Content-Security-Policy": "frame-ancestors 'self'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  };
}

export function secureResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders())) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function forbidden(message: string): Response {
  return secureResponse(new Response(message, {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  }));
}

export function rejectUntrustedBrowserRequest(request: Request, url: URL): Response | null {
  if (!hasTrustedTargetHost(request)) {
    return forbidden("Untrusted request host");
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== "null") {
    const targetOrigins = trustedRequestTargetOrigins(request, url);
    if (!targetOrigins.has(origin)) {
      return forbidden("Cross-origin browser requests are forbidden");
    }
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite && BLOCKED_FETCH_SITES.has(secFetchSite)) {
    if (isApiPath(url.pathname) || isUnsafeMethod(request.method)) {
      return forbidden("Cross-site browser requests are forbidden");
    }
  }

  return null;
}
