"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";

/** Recharts só é baixado quando um gráfico aparece (code splitting). */
export const SeriesChart = dynamic(() => import("./series-chart"), { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> });
