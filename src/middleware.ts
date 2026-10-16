import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Renova a sessão do Supabase Auth e bloqueia /admin sem sessão (o papel de administrador é verificado no layout/rotas, no servidor). */
/** Códigos inválidos viram 404 de verdade (sem "soft 404"): com streaming, `notFound()` dentro da página já responde 200. */
const BAD_PLACE = [/^\/municipios\/(?!\d{7}\/?$)[^/]+\/?$/, /^\/estados\/(?![a-zA-Z]{2}\/?$)[^/]+\/?$/];
export const isBadPlacePath = (path: string) => BAD_PLACE.some((r) => r.test(path));

export async function middleware(req: NextRequest) {
  if (isBadPlacePath(req.nextUrl.pathname)) return NextResponse.rewrite(new URL("/404", req.url), { status: 404 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (process.env.BRASIL_FISCAL_DEV_FIXTURES === "1" && process.env.NODE_ENV !== "production") return res; // modo dev com fixtures
  if (!url || !key) {
    // Ambiente sem Supabase configurado: /admin e /api/admin ficam inacessíveis (fail-closed).
    if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/api/admin")) return NextResponse.redirect(new URL("/login?setup=1", req.url));
    return res;
  }
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: Array<{ name: string; value: string; options: CookieOptions }>) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && req.nextUrl.pathname.startsWith("/admin")) {
    const to = new URL("/login", req.url);
    to.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/api/game/:path*", "/login", "/login/:path*", "/entrar", "/perfil", "/municipios/:code", "/estados/:uf"] };
