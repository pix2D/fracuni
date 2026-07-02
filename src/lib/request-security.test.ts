import { describe, expect, it } from "vitest";
import { rejectUntrustedBrowserRequest, secureResponse } from "@/lib/request-security";

function request(url: string, headers: HeadersInit = {}, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: {
      Host: new URL(url).host,
      ...headers,
    },
  });
}

describe("rejectUntrustedBrowserRequest", () => {
  it("allows same-origin local API requests", () => {
    const req = request("http://localhost:4321/api/clients", {
      Origin: "http://localhost:4321",
      "Sec-Fetch-Site": "same-origin",
    });

    expect(rejectUntrustedBrowserRequest(req, new URL(req.url))).toBeNull();
  });

  it("blocks cross-origin local API reads", async () => {
    const req = request("http://localhost:4321/api/clients", {
      Origin: "https://malicious.example",
      "Sec-Fetch-Site": "cross-site",
    });

    const response = rejectUntrustedBrowserRequest(req, new URL(req.url));

    expect(response?.status).toBe(403);
    await expect(response?.text()).resolves.toBe("Cross-origin browser requests are forbidden");
  });

  it("blocks cross-site API requests even when Origin is absent", async () => {
    const req = request("http://localhost:4321/api/clients", {
      "Sec-Fetch-Site": "cross-site",
    });

    const response = rejectUntrustedBrowserRequest(req, new URL(req.url));

    expect(response?.status).toBe(403);
    await expect(response?.text()).resolves.toBe("Cross-site browser requests are forbidden");
  });

  it("blocks DNS-rebinding style hosts", async () => {
    const req = request("http://localhost:4321/api/clients", {
      Host: "malicious.example:4321",
      Origin: "http://malicious.example:4321",
    });

    const response = rejectUntrustedBrowserRequest(req, new URL("http://localhost:4321/api/clients"));

    expect(response?.status).toBe(403);
    await expect(response?.text()).resolves.toBe("Untrusted request host");
  });

  it("allows Tailscale Serve forwarded same-origin requests", () => {
    const req = request("http://localhost:4321/api/company/logo", {
      Host: "localhost:4321",
      Origin: "https://fracuni.pony-puffin.ts.net",
      "Sec-Fetch-Site": "same-origin",
      "X-Forwarded-Host": "fracuni.pony-puffin.ts.net",
      "X-Forwarded-Proto": "https",
    }, { method: "POST" });

    expect(
      rejectUntrustedBrowserRequest(req, new URL("https://fracuni.pony-puffin.ts.net/api/company/logo")),
    ).toBeNull();
  });

  it("rejects untrusted forwarded hosts", async () => {
    const req = request("http://localhost:4321/api/company/logo", {
      Host: "localhost:4321",
      Origin: "https://malicious.example",
      "X-Forwarded-Host": "malicious.example",
      "X-Forwarded-Proto": "https",
    }, { method: "POST" });

    const response = rejectUntrustedBrowserRequest(req, new URL("http://localhost:4321/api/company/logo"));

    expect(response?.status).toBe(403);
    await expect(response?.text()).resolves.toBe("Untrusted request host");
  });
});

describe("secureResponse", () => {
  it("adds browser isolation headers", () => {
    const response = secureResponse(new Response("ok"));

    expect(response.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'self'");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
