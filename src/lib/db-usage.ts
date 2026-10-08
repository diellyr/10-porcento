export type DbUsageLevel = "normal" | "atencao" | "alerta" | "critico";

/** <60% normal · 60–75% atenção · 75–85% alerta · >85% crítico */
export function dbUsageLevel(percent: number): DbUsageLevel {
  if (percent > 85) return "critico";
  if (percent >= 75) return "alerta";
  if (percent >= 60) return "atencao";
  return "normal";
}
