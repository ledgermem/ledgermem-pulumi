import * as pulumi from "@pulumi/pulumi";
import { callApi, resolveConfig } from "./provider";

export interface ApiKeyArgs {
  workspaceId: pulumi.Input<string>;
  name: pulumi.Input<string>;
  scopes?: pulumi.Input<pulumi.Input<string>[]>;
  apiKey?: pulumi.Input<string>;
  baseUrl?: pulumi.Input<string>;
}

interface ApiKeyInputs {
  workspaceId: string;
  name: string;
  scopes?: string[];
  apiKey?: string;
  baseUrl?: string;
}

interface ApiKeyOutputs extends ApiKeyInputs {
  id: string;
  secret?: string;
  createdAt?: string;
}

const apiKeyProvider: pulumi.dynamic.ResourceProvider = {
  async create(inputs: ApiKeyInputs) {
    const cfg = resolveConfig({ apiKey: inputs.apiKey, baseUrl: inputs.baseUrl });
    const key = await callApi<ApiKeyOutputs>(cfg, {
      method: "POST",
      path: "/v1/admin/api-keys",
      body: {
        workspaceId: inputs.workspaceId,
        name: inputs.name,
        scopes: inputs.scopes,
      },
    });
    return {
      id: key.id,
      outs: {
        ...inputs,
        id: key.id,
        secret: key.secret,
        createdAt: key.createdAt,
      },
    };
  },

  async read(id: string, props: ApiKeyOutputs) {
    const cfg = resolveConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
    const key = await callApi<ApiKeyOutputs>(cfg, {
      method: "GET",
      path: `/v1/admin/api-keys/${id}`,
    });
    // Preserve secret from previous state — API never returns it again.
    return { id, props: { ...props, ...key, secret: props.secret } };
  },

  async delete(id: string, props: ApiKeyOutputs) {
    const cfg = resolveConfig({ apiKey: props.apiKey, baseUrl: props.baseUrl });
    await callApi(cfg, { method: "DELETE", path: `/v1/admin/api-keys/${id}` });
  },

  async diff(_id: string, olds: ApiKeyOutputs, news: ApiKeyInputs) {
    // API keys are immutable — any change replaces.
    const replaces: string[] = [];
    if (olds.workspaceId !== news.workspaceId) replaces.push("workspaceId");
    if (olds.name !== news.name) replaces.push("name");
    if (JSON.stringify(olds.scopes ?? []) !== JSON.stringify(news.scopes ?? [])) {
      replaces.push("scopes");
    }
    return { changes: replaces.length > 0, replaces };
  },
};

/**
 * An API key for a Mnemo workspace. The plaintext `secret` is exposed
 * once on creation and stored in the Pulumi state — protect your stack.
 */
export class ApiKey extends pulumi.dynamic.Resource {
  public readonly secret!: pulumi.Output<string | undefined>;

  constructor(name: string, args: ApiKeyArgs, opts?: pulumi.CustomResourceOptions) {
    super(
      apiKeyProvider,
      name,
      {
        ...args,
        secret: undefined,
      },
      // The admin `apiKey` used to provision this resource is itself a
      // long-lived credential — keep it out of plain-text state, just like
      // the per-resource `secret` we expose to callers.
      { ...opts, additionalSecretOutputs: ["secret", "apiKey"] },
    );
  }
}
