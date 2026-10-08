"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogsTable } from "@/components/admin/logs-table";
import { AdminTitle } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/primitives";
import { useAdminData } from "@/lib/use-admin";
import type { SourceView } from "@/server/services/source-admin";

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { data } = useAdminData<{ sources: SourceView[] }>("/api/admin/sources");
  const slug = sp.get("source") ?? data?.sources[0]?.slug;
  return (
    <>
      <AdminTitle title="Logs das APIs">
        <label className="flex items-center gap-2 text-sm">Fonte
          <select className="h-10 rounded-lg border border-line bg-surface px-3" value={slug ?? ""} onChange={(e) => router.push(`/admin/logs?source=${e.target.value}`)}>
            {data?.sources.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
      </AdminTitle>
      {slug ? <LogsTable key={slug} slug={slug} /> : <Skeleton className="h-64" />}
    </>
  );
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
