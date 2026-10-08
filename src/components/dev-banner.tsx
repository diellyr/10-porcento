import { DEV_FIXTURES_ENABLED } from "@/server/dev/fixtures";

/** Aviso permanente quando o app roda com fixtures sintéticas (nunca aparece em produção). */
export function DevBanner() {
  if (!DEV_FIXTURES_ENABLED()) return null;
  return (
    <div role="alert" className="bg-warn px-4 py-2 text-center text-sm font-semibold text-white">
      MODO DE DESENVOLVIMENTO — dados SINTÉTICOS de teste, não oficiais. Não use estes números.
    </div>
  );
}
