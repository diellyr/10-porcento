/**
 * Prepara texto para leitura natural em português do Brasil (voz neural, gravada ou provisória):
 * valores em reais, percentuais, siglas e abreviações viram palavras, para evitar "R$ 1,4 mi" lido como letras.
 */
const UN = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CT = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CT[c]!);
  if (r) parts.push(r < 20 ? UN[r]! : DZ[Math.floor(r / 10)]! + (r % 10 ? ` e ${UN[r % 10]}` : ""));
  return parts.join(" e ");
}

export function porExtenso(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 1000) return n === 0 ? "zero" : ate999(n);
  const out: string[] = [];
  const bi = Math.floor(n / 1e9), mi = Math.floor((n % 1e9) / 1e6), mil = Math.floor((n % 1e6) / 1e3), resto = n % 1000;
  if (bi) out.push(`${ate999(bi)} ${bi === 1 ? "bilhão" : "bilhões"}`);
  if (mi) out.push(`${ate999(mi)} ${mi === 1 ? "milhão" : "milhões"}`);
  if (mil) out.push(mil === 1 ? "mil" : `${ate999(mil)} mil`);
  if (resto) out.push(ate999(resto));
  // "e" antes do último bloco quando ele é "redondo" (centenas exatas ou < 100)
  const ultimo = resto || mil || mi;
  return out.length > 1 && (ultimo < 100 || ultimo % 100 === 0) ? `${out.slice(0, -1).join(" ")} e ${out.at(-1)}` : out.join(" ");
}

const dec = (s: string) => s.replace(/\./g, "").replace(",", ".");
const palavrasDecimais = (s: string) => {
  const [i, f = ""] = s.split(".");
  return `${porExtenso(Number(i))}${f ? ` vírgula ${f.split("").map((d) => UN[Number(d)]).join(" ")}` : ""}`;
};

const SIGLAS: Array<[RegExp, string]> = [
  [/\bUPAs\b/g, "Upas"], [/\bUPA\b/g, "Upa"], [/\bCGU\b/g, "C G U"], [/\bCNPJ\b/g, "C N P J"], [/\bSIOPS\b/gi, "Siops"], [/\bSiconfi\b/g, "Siconfi"],
  [/\bPEPS\b/g, "peps"], [/\bSUS\b/g, "S U S"], [/\bTV\b/g, "T V"], [/\bPC\b/g, "P C"], [/\bIBGE\b/g, "I B G E"], [/\bDCA\b/g, "D C A"],
];

export function speechText(input: string): string {
  let t = input;
  // R$ 1,4 milhão | R$ 24 milhões | R$ 130 mil | R$ 93.600,00 | R$ 0
  t = t.replace(/R\$\s*([\d.]+(?:,\d+)?)\s*(milhões|milhão|mil|bilhões|bilhão)/gi, (_m, v: string, esc: string) => {
    const n = dec(v);
    const plural = /milh[õo]es|bilh[õo]es/i.test(esc) || Number(n) > 1;
    const unidade = esc.toLowerCase().replace("milhões", "milhões").replace("bilhões", "bilhões");
    const de = /milh|bilh/i.test(esc) ? " de reais" : " reais";
    return `${palavrasDecimais(n)} ${unidade}${de}`.replace(/ reais$/, plural ? " reais" : " reais");
  });
  t = t.replace(/R\$\s*([\d.]+)(?:,(\d{2}))?/g, (_m, v: string, c?: string) => {
    const reais = Number(v.replace(/\./g, ""));
    const cent = c ? Number(c) : 0;
    return `${porExtenso(reais)} ${reais === 1 ? "real" : "reais"}${cent ? ` e ${porExtenso(cent)} ${cent === 1 ? "centavo" : "centavos"}` : ""}`;
  });
  t = t.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_m, v: string) => `${palavrasDecimais(dec(v))} por cento`);
  t = t.replace(/(\d+)\s*(?:h|hs)\b/g, (_m, v: string) => `${porExtenso(Number(v))} ${Number(v) === 1 ? "hora" : "horas"}`);
  t = t.replace(/(\d+)\s*min\b/g, (_m, v: string) => `${porExtenso(Number(v))} ${Number(v) === 1 ? "minuto" : "minutos"}`);
  t = t.replace(/(\d+)\s*km\b/g, (_m, v: string) => `${porExtenso(Number(v))} ${Number(v) === 1 ? "quilômetro" : "quilômetros"}`);
  t = t.replace(/(\d+)\s*mg\b/g, (_m, v: string) => `${porExtenso(Number(v))} miligramas`);
  t = t.replace(/\b(\d{1,3}(?:\.\d{3})+|\d+)\b/g, (_m, v: string) => porExtenso(Number(v.replace(/\./g, ""))));
  for (const [re, to] of SIGLAS) t = t.replace(re, to);
  return t.replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}
