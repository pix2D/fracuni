import type { APIContext } from "astro";

type ApiContextOverrides = {
  params?: Record<string, string | undefined>;
  request?: Request;
};

export function apiContext(overrides: ApiContextOverrides = {}): APIContext {
  return {
    params: {},
    request: new Request("http://test.local"),
    ...overrides,
  } as unknown as APIContext;
}
