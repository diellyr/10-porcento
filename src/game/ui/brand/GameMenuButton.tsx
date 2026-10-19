import Link from "next/link";
import type { ReactNode } from "react";
import { IcSeta } from "./icons";

type Variante = "primario" | "azul" | "escuro" | "vidro";
interface Comum { variante?: Variante; icone?: ReactNode; seta?: boolean; compacto?: boolean; atraso?: number; className?: string; children: ReactNode }

/** Botão do menu principal: mesmo acabamento para <button> e <Link>, com estados hover/foco/ativo/desabilitado. */
export function GameMenuButton(props: Comum & ({ href: string; onClick?: () => void; disabled?: never } | { href?: undefined; onClick: () => void; disabled?: boolean })) {
  const { variante = "vidro", icone, seta = false, compacto = false, atraso = 0, className = "", children } = props;
  const cls = `mx-btn ${variante} ${compacto ? "compacto" : ""} ${className}`;
  const style = { "--atraso": `${atraso}ms` } as React.CSSProperties;
  const miolo = (<>{icone && <span className="mx-btn-ic">{icone}</span>}<span className="mx-btn-txt">{children}</span>{seta && <span className="mx-btn-seta"><IcSeta /></span>}</>);
  if (props.href !== undefined) return <Link href={props.href} className={cls} style={style} onClick={props.onClick}>{miolo}</Link>;
  return <button type="button" className={cls} style={style} onClick={props.onClick} disabled={props.disabled}>{miolo}</button>;
}
