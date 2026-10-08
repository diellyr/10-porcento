import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister, UpdateNotice } from "@/components/pwa";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Brasil Fiscal — para onde vai o dinheiro público", template: "%s · Brasil Fiscal" },
  description: "Entenda quanto o Brasil arrecada e gasta — União, estados e municípios — com dados oficiais, fonte sempre visível e linguagem simples.",
  openGraph: { title: "Brasil Fiscal", description: "Para onde vai o dinheiro público, com dados oficiais.", locale: "pt_BR", type: "website" },
  robots: { index: true, follow: true },
  applicationName: "Brasil Fiscal",
  appleWebApp: { capable: true, title: "Brasil Fiscal", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#fafaf9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}<PwaRegister /><UpdateNotice /></body>
    </html>
  );
}
