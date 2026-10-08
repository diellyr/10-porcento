import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DevBanner } from "@/components/dev-banner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DevBanner />
      <SiteHeader />
      <main id="conteudo" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
