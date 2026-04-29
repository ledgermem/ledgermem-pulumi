// Example Pulumi stack — provisions a workspace, an API key for CI, and
// a webhook that fires on memory-write events.

import * as pulumi from "@pulumi/pulumi";
import { Workspace, ApiKey, Webhook } from "@pulumi/getmnemo";

const acme = new Workspace("acme", {
  name: "Acme Corp",
  slug: "acme",
  plan: "enterprise",
  retentionDays: 365,
});

const ciKey = new ApiKey("ci", {
  workspaceId: acme.id,
  name: "ci-bot",
  scopes: ["memories:read", "memories:write"],
});

new Webhook("audit-webhook", {
  workspaceId: acme.id,
  url: "https://hooks.acme.example/getmnemo",
  events: ["memory.created", "memory.updated", "memory.deleted"],
  secret: "change-me",
});

export const workspaceId = acme.id;
export const ciApiKey = pulumi.secret(ciKey.secret);
