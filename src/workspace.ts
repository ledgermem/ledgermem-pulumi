import * as pulumi from "@pulumi/pulumi";
import { callApi, resolveConfig } from "./provider";

export interface WorkspaceArgs {
  name: pulumi.Input<string>;
  slug?: pulumi.Input<string>;
  plan?: pulumi.Input<string>;
  retentionDays?: pulumi.Input<number>;
  apiKey?: pulumi.Input<string>;
  baseUrl?: pulumi.Input<string>;
}

interface WorkspaceInputs {
  name: string;
  slug?: string;
  plan?: string;
  retentionDays?: number;
  apiKey?: string;
  baseUrl?: string;
}

interface WorkspaceOutputs extends WorkspaceInputs {
  id: string;
  createdAt?: string;
}

const workspaceProvider: pulumi.dynamic.ResourceProvider = {
  async create(inputs: WorkspaceInputs) {
    const cfg = resolveConfig({ apiKey: inputs.apiKey, baseUrl: inputs.baseUrl });
    const body = {
      name: inputs.name,
      slug: inputs.slug,
      plan: inputs.plan,
      retentionDays: inputs.retentionDays,
    };
    const ws = await callApi<WorkspaceOutputs>(cfg, {
      method: "POST",
      path: "/v1/admin/workspaces",
      body,
    });
    return { id: ws.id, outs: { ...inputs, id: ws.id, createdAt: ws.createdAt } };
  },

  async read(id: string, props: WorkspaceOutputs) {
    const cfg = resolveConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
    const ws = await callApi<WorkspaceOutputs>(cfg, {
      method: "GET",
      path: `/v1/admin/workspaces/${id}`,
    });
    return { id, props: { ...props, ...ws } };
  },

  async update(id: string, _olds: WorkspaceOutputs, news: WorkspaceInputs) {
    const cfg = resolveConfig({ apiKey: news.apiKey, baseUrl: news.baseUrl });
    const ws = await callApi<WorkspaceOutputs>(cfg, {
      method: "PATCH",
      path: `/v1/admin/workspaces/${id}`,
      body: {
        name: news.name,
        slug: news.slug,
        plan: news.plan,
        retentionDays: news.retentionDays,
      },
    });
    return { outs: { ...news, id, createdAt: ws.createdAt } };
  },

  async delete(id: string, props: WorkspaceOutputs) {
    const cfg = resolveConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
    await callApi(cfg, { method: "DELETE", path: `/v1/admin/workspaces/${id}` });
  },

  async diff(_id: string, olds: WorkspaceOutputs, news: WorkspaceInputs) {
    const replaces: string[] = [];
    const changed: string[] = [];
    (["name", "slug", "plan", "retentionDays"] as const).forEach((k) => {
      if (olds[k] !== news[k]) changed.push(k);
    });
    // The workspace slug is part of every workspace-scoped URL on the API
    // and is immutable server-side — PATCH silently ignores it. Treating a
    // slug change as an update lets Pulumi report `success` while the
    // server keeps the old slug, so subsequent reads diff forever. Force a
    // replace so the new slug actually takes effect.
    if (olds.slug !== news.slug) {
      replaces.push("slug");
    }
    return { changes: changed.length > 0, replaces };
  },
};

/**
 * A LedgerMem tenant workspace.
 */
export class Workspace extends pulumi.dynamic.Resource {
  public readonly workspaceId!: pulumi.Output<string>;
  public readonly createdAt!: pulumi.Output<string | undefined>;

  constructor(name: string, args: WorkspaceArgs, opts?: pulumi.CustomResourceOptions) {
    super(
      workspaceProvider,
      name,
      {
        ...args,
        workspaceId: undefined,
        createdAt: undefined,
      },
      // Keep the admin apiKey out of plaintext stack state.
      { ...opts, additionalSecretOutputs: ["apiKey"] },
    );
  }
}
