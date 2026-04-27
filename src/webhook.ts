import * as pulumi from "@pulumi/pulumi";
import { callApi, resolveConfig } from "./provider";

export interface WebhookArgs {
  workspaceId: pulumi.Input<string>;
  url: pulumi.Input<string>;
  events: pulumi.Input<pulumi.Input<string>[]>;
  secret?: pulumi.Input<string>;
  active?: pulumi.Input<boolean>;
  apiKey?: pulumi.Input<string>;
  baseUrl?: pulumi.Input<string>;
}

interface WebhookInputs {
  workspaceId: string;
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
  apiKey?: string;
  baseUrl?: string;
}

interface WebhookOutputs extends WebhookInputs {
  id: string;
}

const webhookProvider: pulumi.dynamic.ResourceProvider = {
  async create(inputs: WebhookInputs) {
    const cfg = resolveConfig({ apiKey: inputs.apiKey, baseUrl: inputs.baseUrl });
    const wh = await callApi<WebhookOutputs>(cfg, {
      method: "POST",
      path: `/v1/admin/workspaces/${inputs.workspaceId}/webhooks`,
      body: {
        url: inputs.url,
        events: inputs.events,
        secret: inputs.secret,
        active: inputs.active ?? true,
      },
    });
    return { id: wh.id, outs: { ...inputs, id: wh.id } };
  },

  async read(id: string, props: WebhookOutputs) {
    const cfg = resolveConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
    const wh = await callApi<WebhookOutputs>(cfg, {
      method: "GET",
      path: `/v1/admin/workspaces/${props.workspaceId}/webhooks/${id}`,
    });
    return { id, props: { ...props, ...wh } };
  },

  async update(id: string, _olds: WebhookOutputs, news: WebhookInputs) {
    const cfg = resolveConfig({ apiKey: news.apiKey, baseUrl: news.baseUrl });
    const wh = await callApi<WebhookOutputs>(cfg, {
      method: "PATCH",
      path: `/v1/admin/workspaces/${news.workspaceId}/webhooks/${id}`,
      body: {
        url: news.url,
        events: news.events,
        secret: news.secret,
        active: news.active,
      },
    });
    return { outs: { ...news, id: wh.id } };
  },

  async delete(id: string, props: WebhookOutputs) {
    const cfg = resolveConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
    await callApi(cfg, {
      method: "DELETE",
      path: `/v1/admin/workspaces/${props.workspaceId}/webhooks/${id}`,
    });
  },

  async diff(_id: string, olds: WebhookOutputs, news: WebhookInputs) {
    const replaces: string[] = [];
    if (olds.workspaceId !== news.workspaceId) replaces.push("workspaceId");
    return { changes: true, replaces };
  },
};

/**
 * A webhook subscription on a LedgerMem workspace.
 */
export class Webhook extends pulumi.dynamic.Resource {
  constructor(name: string, args: WebhookArgs, opts?: pulumi.CustomResourceOptions) {
    super(webhookProvider, name, args, {
      ...opts,
      additionalSecretOutputs: ["secret"],
    });
  }
}
