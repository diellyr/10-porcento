import type { IGovernmentSource } from "../core/interfaces";
import { dadosGovAdapter } from "./dadosgov";
import { fileTemplateAdapter, receitaAdapter, tesouroAdapter } from "./dataset-download";
import { ibgeAdapter } from "./ibge";
import { siconfiAdapter } from "./siconfi";
import { transparenciaAdapter } from "./transparencia";

/** Todos os adaptadores conhecidos pelo código. Novas fontes: criar adaptador + registrar aqui. */
export const ADAPTERS: IGovernmentSource[] = [siconfiAdapter, transparenciaAdapter, receitaAdapter, tesouroAdapter, dadosGovAdapter, ibgeAdapter, fileTemplateAdapter];

export const adapterByKey = (key: string) => ADAPTERS.find((a) => a.adapterKey === key) ?? null;
export const adaptersForDataset = (dataset: string) => ADAPTERS.filter((a) => a.datasets.includes(dataset));
