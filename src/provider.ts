// Shared HTTP client used by every dynamic resource provider in this package.
//
// We deliberately avoid pulumi-tf-bridge — LedgerMem is a SaaS API, so a
// thin fetch-based layer is simpler than running a Go bridge for an HTTP CRUD.

const DEFAULT_BASE_URL = "https://api.proofly.dev";

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Resolve provider config from explicit args or environment.
 * Throws if no API key is available — fail fast at preview time.
 */
export function resolveConfig(cfg: Partial<ProviderConfig> = {}): ProviderConfig {
  const apiKey = cfg.apiKey ?? process.env.LEDGERMEM_API_KEY ?? "";
  const baseUrl = cfg.baseUrl ?? process.env.LEDGERMEM_API_URL ?? DEFAULT_BASE_URL;
  if (!apiKey) {
    throw new Error(
      "ledgermem: no API key — set apiKey on the resource or LEDGERMEM_API_KEY env var",
    );
  }
  return { apiKey, baseUrl };
}

export interface ApiRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
}

export class LedgerMemApiError extends Error {
  constructor(
    public statusCode: number,
    public body: string,
  ) {
    super(`ledgermem api: ${statusCode} ${body}`);
    this.name = "LedgerMemApiError";
  }
}

/**
 * Low-level HTTP — the dynamic providers below call this directly inside
 * create/read/update/delete hooks.
 */
export async function callApi<T>(
  cfg: ProviderConfig,
  req: ApiRequest,
): Promise<T> {
  const url = cfg.baseUrl!.replace(/\/$/, "") + req.path;
  const init: RequestInit = {
    method: req.method,
    headers: {
      Accept: "application/json",
      "User-Agent": "@pulumi/ledgermem",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
  };
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new LedgerMemApiError(res.status, await res.text());
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return (await res.json()) as T;
}
