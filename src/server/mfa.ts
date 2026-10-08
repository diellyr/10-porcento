/**
 * MFA (TOTP) para administradores, via Supabase Auth (níveis de garantia AAL1/AAL2).
 * Em produção é OBRIGATÓRIO por padrão (desative explicitamente com ADMIN_REQUIRE_MFA=0); em desenvolvimento é opcional (=1).
 */
export type MfaDecision = "ok" | "verify" | "enroll";

export function mfaRequired(env: Record<string, string | undefined> = process.env): boolean {
  if (env.BRASIL_FISCAL_DEV_FIXTURES === "1" && env.NODE_ENV !== "production") return false;
  if (env.ADMIN_REQUIRE_MFA === "1") return true;
  if (env.ADMIN_REQUIRE_MFA === "0") return false;
  return env.NODE_ENV === "production";
}

/** currentLevel/nextLevel vêm de `auth.mfa.getAuthenticatorAssuranceLevel()`. */
export function decideMfa(a: { required: boolean; currentLevel: string | null; nextLevel: string | null }): MfaDecision {
  if (!a.required) return "ok";
  if (a.currentLevel === "aal2") return "ok";
  return a.nextLevel === "aal2" ? "verify" : "enroll"; // nextLevel aal2 ⇒ já existe fator verificado
}
