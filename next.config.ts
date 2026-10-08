import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders({ production: process.env.NODE_ENV === "production", supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL }) }];
  },
};

export default nextConfig;
