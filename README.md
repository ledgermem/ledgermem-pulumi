# @pulumi/ledgermem

Pulumi provider for [LedgerMem](https://proofly.dev) — manage workspaces,
API keys, and webhooks from your Pulumi program.

## Install

```sh
npm install @pulumi/ledgermem
```

## Quickstart

```ts
import { Workspace, ApiKey } from "@pulumi/ledgermem";

const ws = new Workspace("acme", {
  name: "Acme Corp",
  plan: "enterprise",
});

const ci = new ApiKey("ci", {
  workspaceId: ws.id,
  name: "ci-bot",
  scopes: ["memories:read", "memories:write"],
});

export const workspaceId = ws.id;
export const ciSecret = ci.secret;
```

```sh
export LEDGERMEM_API_KEY=lm_...
pulumi up
```

## Resources

- `Workspace` — tenant workspace (CRUD).
- `ApiKey` — API key. Plaintext `secret` is exposed once on create and
  stored in stack state — protect your stack with a secrets provider.
- `Webhook` — webhook subscription on a workspace.

## Configuration

Each resource accepts optional `apiKey` and `baseUrl` inputs. When omitted,
they fall back to `LEDGERMEM_API_KEY` and `LEDGERMEM_API_URL` (defaults to
`https://api.proofly.dev`).

## Develop

```sh
npm install
npm test
npm run build
```

## License

[Apache 2.0](./LICENSE)
