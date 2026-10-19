/** Ícones do menu (traço, 24×24, herdam a cor do texto). Decorativos: o nome acessível está no botão. */
const P = ({ d, fill = false }: { d: string; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" width="1.35em" height="1.35em" aria-hidden="true" focusable="false" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const IcPlay = () => <P fill d="M8 5.5v13l11-6.5z" />;
export const IcRetomar = () => <P d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.2h4.2" />;
export const IcEngrenagem = () => <P d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 13.5l1.6 1.2-1.8 3.1-1.9-.6a7 7 0 0 1-1.7 1l-.4 2h-3.6l-.4-2a7 7 0 0 1-1.7-1l-1.9.6-1.8-3.1 1.6-1.2a7 7 0 0 1 0-2l-1.6-1.2 1.8-3.1 1.9.6a7 7 0 0 1 1.7-1l.4-2h3.6l.4 2a7 7 0 0 1 1.7 1l1.9-.6 1.8 3.1-1.6 1.2a7 7 0 0 1 0 2z" />;
export const IcPerfil = () => <P d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />;
export const IcTrocar = () => <P d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />;
export const IcInfo = () => <P d="M12 11v6M12 7.5v.1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />;
export const IcElenco = () => <P d="M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3 19a6 6 0 0 1 12 0M16 4.8a3.2 3.2 0 0 1 0 6.2M18 13.5a6 6 0 0 1 3 5.5" />;
export const IcSeta = () => <P d="M5 12h14M13 6l6 6-6 6" />;
export const IcAtalho = () => <P d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />;
