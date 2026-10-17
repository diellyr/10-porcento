#!/usr/bin/env node
// Pré-carrega os dados oficiais (Siconfi/Tesouro) das 27 capitais no banco, pelo próprio site publicado.
// Cada chamada a /api/game/scenario faz o site consultar a fonte, salvar os fatos (com origem) e congelar o cenário.
// Uso:  node scripts/preload-game-data.mjs https://10-porcento.diellyr.workers.dev [UF,UF...]
// O limite do endpoint é de 12 consultas por minuto por IP: o script espera 6 s entre uma capital e outra.
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Informe o endereço do site. Ex.: node scripts/preload-game-data.mjs https://10-porcento.diellyr.workers.dev"); process.exit(1); }
const only = (process.argv[3] ?? "").toUpperCase().split(",").filter(Boolean);

const CAPITAIS = [
  ["AC", "Rio Branco", "1200401"], ["AL", "Maceió", "2704302"], ["AP", "Macapá", "1600303"], ["AM", "Manaus", "1302603"], ["BA", "Salvador", "2927408"],
  ["CE", "Fortaleza", "2304400"], ["DF", "Brasília", "5300108"], ["ES", "Vitória", "3205309"], ["GO", "Goiânia", "5208707"], ["MA", "São Luís", "2111300"],
  ["MT", "Cuiabá", "5103403"], ["MS", "Campo Grande", "5002704"], ["MG", "Belo Horizonte", "3106200"], ["PA", "Belém", "1501402"], ["PB", "João Pessoa", "2507507"],
  ["PR", "Curitiba", "4106902"], ["PE", "Recife", "2611606"], ["PI", "Teresina", "2211001"], ["RJ", "Rio de Janeiro", "3304557"], ["RN", "Natal", "2408102"],
  ["RS", "Porto Alegre", "4314902"], ["RO", "Porto Velho", "1100205"], ["RR", "Boa Vista", "1400100"], ["SC", "Florianópolis", "4205407"], ["SP", "São Paulo", "3550308"],
  ["SE", "Aracaju", "2800308"], ["TO", "Palmas", "1721000"],
].filter(([uf]) => !only.length || only.includes(uf));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, semDado = 0, falha = 0;
for (const [uf, nome, code] of CAPITAIS) {
  const url = `${base}/api/game/scenario?code=${code}&nome=${encodeURIComponent(nome)}&uf=${uf}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
    if (r.status === 429) { console.log(`${uf} ${nome}: limite de consultas, aguardando 65 s e tentando de novo`); await sleep(65_000); CAPITAIS.push([uf, nome, code]); continue; }
    const j = await r.json();
    const ref = j?.scenario?.reference;
    if (!r.ok || !ref) { falha++; console.log(`${uf} ${nome}: FALHA (${r.status}) ${j?.error ?? ""}`); }
    else if (ref.healthSpending == null) { semDado++; console.log(`${uf} ${nome}: sem dado oficial retornado (${ref.freshness})`); }
    else { ok++; console.log(`${uf} ${nome}: OK — saúde ${ref.year}: R$ ${Number(ref.healthSpending).toLocaleString("pt-BR")} (${ref.freshness})`); }
  } catch (e) { falha++; console.log(`${uf} ${nome}: FALHA de rede — ${e.message}`); }
  await sleep(6_000);
}
console.log(`\nResumo: ${ok} com dado oficial, ${semDado} sem dado, ${falha} com falha.`);
process.exit(falha ? 2 : 0);
