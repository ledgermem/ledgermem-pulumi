import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { callApi, resolveConfig, LedgerMemApiError } from "../src/provider";

// We exercise the HTTP layer (which every dynamic resource provider sits on
// top of) rather than the dynamic providers themselves — the latter requires
// a Pulumi engine to drive the lifecycle hooks.

describe("resolveConfig", () => {
  const orig = process.env.LEDGERMEM_API_KEY;
  afterEach(() => {
    process.env.LEDGERMEM_API_KEY = orig;
  });

  test("uses explicit apiKey", () => {
    const cfg = resolveConfig({ apiKey: "lm_explicit" });
    expect(cfg.apiKey).toBe("lm_explicit");
    expect(cfg.baseUrl).toBe("https://api.proofly.dev");
  });

  test("falls back to env var", () => {
    process.env.LEDGERMEM_API_KEY = "lm_env";
    const cfg = resolveConfig();
    expect(cfg.apiKey).toBe("lm_env");
  });

  test("throws when no key is available", () => {
    delete process.env.LEDGERMEM_API_KEY;
    expect(() => resolveConfig()).toThrow(/no API key/);
  });
});

describe("callApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("sends auth header and parses JSON", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "ws_42", name: "Acme" }),
    });
    vi.stubGlobal("fetch", fakeFetch);

    const out = await callApi<{ id: string; name: string }>(
      { apiKey: "lm_test", baseUrl: "https://api.example.com" },
      { method: "POST", path: "/v1/admin/workspaces", body: { name: "Acme" } },
    );

    expect(out).toEqual({ id: "ws_42", name: "Acme" });
    const [url, init] = fakeFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/admin/workspaces");
    expect(init.headers.Authorization).toBe("Bearer lm_test");
    expect(init.body).toBe(JSON.stringify({ name: "Acme" }));
  });

  test("throws LedgerMemApiError on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "forbidden",
      }),
    );
    await expect(
      callApi(
        { apiKey: "lm_test", baseUrl: "https://api.example.com" },
        { method: "GET", path: "/v1/admin/workspaces/ws_x" },
      ),
    ).rejects.toBeInstanceOf(LedgerMemApiError);
  });
});
