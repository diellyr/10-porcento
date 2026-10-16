import { notFound } from "next/navigation";

/** Galeria de desenvolvimento (usada para conferir arte e gerar imagens): não existe em produção. */
export default function DevOnly({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.GAME_GALLERY !== "1") notFound();
  return children;
}
