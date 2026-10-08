"use client";
import { useEffect, useState } from "react";
import { AddSourceDialog, type AdapterOption } from "@/components/admin/add-source";
import { AdminTitle } from "@/components/admin/ui";
import { SourceCard } from "@/components/admin/source-card";
import { Button, Notice, Skeleton } from "@/components/ui/primitives";
import { useAdminData } from "@/lib/use-admin";
import type { SourceView } from "@/server/services/source-admin";

export default function Page() {
  const { data, error, loading, reload } = useAdminData<{ sources: SourceView[]; adapters: AdapterOption[] }>("/api/admin/sources");
  const [list, setList] = useState<SourceView[]>([]);
  const [adding, setAdding] = useState(false);
  useEffect(() => { if (data) setList(data.sources); }, [data]);
  return (
    <>
      <AdminTitle title="Fontes de Dados">
        <Button variant="secondary" onClick={() => setAdding(true)}>+ Adicionar fonte</Button>
        <Button variant="secondary" onClick={reload}>Atualizar lista</Button>
      </AdminTitle>
      {adding && data && <AddSourceDialog adapters={data.adapters} onClose={() => setAdding(false)} onCreated={(src) => { setList((l) => [...l, src].sort((a, b) => a.priority - b.priority)); setAdding(false); }} />}
      {error && <Notice tone="bad">{error.message}{error.technical && <span className="mt-1 block font-mono text-xs">{error.technical}</span>}</Notice>}
      {loading && !list.length && <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>}
      <div className="space-y-4">
        {list.map((s) => <SourceCard key={s.slug} source={s} onChange={(n) => setList((l) => l.map((x) => (x.slug === n.slug ? n : x)))} />)}
      </div>
    </>
  );
}
