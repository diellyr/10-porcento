import type { FetchContext, IGovernmentSource, ISourceRegistry } from "../core/interfaces";
import type { SourceRecord } from "../core/types";
import { ADAPTERS } from "../sources";
import { createHttpClient } from "../sources/http";

/** Variáveis de ambiente que servem de credencial padrão quando nada foi salvo pelo painel. */
export const ENV_CREDENTIALS: Record<string, string> = {
  "portal-transparencia": "PORTAL_TRANSPARENCIA_API_KEY",
  "dados-gov-br": "DADOS_GOV_BR_TOKEN",
  "elevenlabs-voz": "ELEVENLABS_API_KEY",
  "anthropic-ia": "ANTHROPIC_API_KEY",
};

export interface RuntimeDeps {
  registry: ISourceRegistry;
  adapters?: IGovernmentSource[];
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  env?: Record<string, string | undefined>;
}

/** Monta o contexto de execução (credencial + cliente HTTP com log/rate limit) para uma fonte. */
export class SourceRuntime {
  readonly adapters: IGovernmentSource[];
  constructor(private deps: RuntimeDeps) {
    this.adapters = deps.adapters ?? ADAPTERS;
  }

  now(): Date { return this.deps.now ? this.deps.now() : new Date(); }

  adapterFor(source: SourceRecord): IGovernmentSource | null {
    return this.adapters.find((a) => a.adapterKey === source.adapterKey) ?? null;
  }

  /** Credencial salva (cifrada) tem precedência; senão variável de ambiente. */
  async credential(source: SourceRecord): Promise<{ value: string | null; origin: "database" | "env" | "none" }> {
    const stored = await this.deps.registry.getCredential(source.id).catch(() => null);
    if (stored) return { value: stored.plaintext, origin: "database" };
    const envName = ENV_CREDENTIALS[source.slug];
    const env = envName ? (this.deps.env ?? process.env)[envName] : undefined;
    return env ? { value: env, origin: "env" } : { value: null, origin: "none" };
  }

  async context(source: SourceRecord, opts: { isTest?: boolean } = {}): Promise<FetchContext> {
    const cred = await this.credential(source);
    return {
      source, credential: cred.value, now: this.now(),
      http: createHttpClient({ source, registry: this.deps.registry, isTest: opts.isTest, fetchImpl: this.deps.fetchImpl, sleep: this.deps.sleep }),
    };
  }
}
