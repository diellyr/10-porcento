/**
 * Fundo cinematográfico: os dois mundos (serviço público à esquerda, poder e influência à direita) divididos pela caneta.
 * As ilustrações vêm da arte de referência, recortadas só nas laterais; o miolo é gradiente — textos e botões são componentes reais.
 */
export function GameBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-bg ${className}`} aria-hidden="true">
      <div className="mx-bg-base" />
      <picture className="mx-bg-lado esq">
        <source media="(max-width: 640px)" srcSet="/jogo/cena-esq-m.webp" />
        <img src="/jogo/cena-esq.webp" alt="" decoding="async" fetchPriority="high" />
      </picture>
      <picture className="mx-bg-lado dir">
        <source media="(max-width: 640px)" srcSet="/jogo/cena-dir-m.webp" />
        <img src="/jogo/cena-dir.webp" alt="" decoding="async" fetchPriority="high" />
      </picture>
      <div className="mx-bg-fenda" />
      <div className="mx-bg-luz" />
      <div className="mx-bg-vinheta" />
    </div>
  );
}
