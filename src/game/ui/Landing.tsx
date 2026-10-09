import Link from "next/link";
import { CHARACTERS } from "../content/characters";
import { HeroStage } from "./HeroStage";
import { Portrait } from "./art/Portrait";

const PASSOS = [
  ["📋", "Receba a situação", "Uma fila, um estoque, um contrato: o problema chega por uma pessoa, não por uma tabela."],
  ["🔍", "Explore e investigue", "Percorra a UPA, toque nos pontos de interesse e junte pistas — algumas incompletas, outras só opinião."],
  ["💬", "Converse", "Joana, Dona Célia, o Guardião do Cofre e os aliados querem coisas diferentes. Ouça todos."],
  ["⚖️", "Confronte os dados", "Cruze duas pistas e descubra o que nenhuma contava sozinha. O que você aprendeu destrava alternativas melhores."],
  ["🖋️", "Decida com a caneta", "Veja custo, prazo e riscos, confirme — e a caneta 3D assina, recusa, pede esclarecimentos ou emite o parecer."],
  ["🌪️", "Veja as consequências", "Parte aparece na hora; parte volta duas semanas depois, na equipe, nos serviços e nas relações."],
  ["📓", "Guarde o aprendizado", "Cada decisão vira um cartão no Caderno de Gestão, com fonte e uma aplicação para a vida real."],
] as const;

export function Landing() {
  return (
    <div>
      <HeroStage />

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="h-dois">
        <h2 id="h-dois" className="text-center text-3xl font-bold sm:text-5xl">Dois mundos. Uma caneta.</h2>
        <p className="mx-auto mt-3 max-w-3xl text-center text-lg text-[color:var(--g-ink2)]">A tela mostra, ao mesmo tempo, quem você vira e o que acontece com quem depende do serviço. Luxo e filas crescem juntos — ou a UPA melhora e as comemorações são dela.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <figure className="g-card overflow-hidden"><img src="/promo/upa.webp" width={1100} height={619} alt="Recepção da UPA com fila grande, painel marcando 94 minutos de espera e Dona Célia sentada com uma família" loading="lazy" className="h-auto w-full" /><figcaption className="p-3"><b>A UPA que você herda.</b> Quase uma hora e meia de espera, remédio faltando e uma bombinha de asma que acabou.</figcaption></figure>
          <figure className="g-card overflow-hidden"><img src="/promo/gabinete-luxo.webp" width={1100} height={619} alt="Gabinete com sofá de couro, quadro dourado e troféus, e o primo Juninho sentado" loading="lazy" className="h-auto w-full" /><figcaption className="p-3"><b>O gabinete do outro caminho.</b> Amigos repentinos, ostentação fictícia — e uma conta que chega no fim.</figcaption></figure>
          <figure className="g-card overflow-hidden"><img src="/promo/upa-melhor.webp" width={1100} height={619} alt="A mesma recepção depois das melhorias: fila curta, plantas, painel com poucos minutos de espera" loading="lazy" className="h-auto w-full" /><figcaption className="p-3"><b>A mesma UPA, depois.</b> Entregas conferidas, equipe organizada, fila que anda — celebradas como se fossem compras de luxo.</figcaption></figure>
          <figure className="g-card overflow-hidden"><img src="/promo/mapa.webp" width={1200} height={757} alt="Mapa ilustrado da UPA com seis locais investigáveis e marcadores de novidades" loading="lazy" className="h-auto w-full" /><figcaption className="p-3"><b>Um mapa para investigar.</b> Farmácia, enfermagem, gabinete, cofre, recepção e pátio: cada caso leva você a um lugar.</figcaption></figure>
        </div>
      </section>

      <section className="bg-[#fff1d6] py-14" aria-labelledby="h-3d">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 md:grid-cols-2">
          <div>
            <h2 id="h-3d" className="text-3xl font-bold sm:text-5xl">A caneta é de verdade.</h2>
            <p className="mt-3 text-lg text-[color:var(--g-ink2)]">Nas decisões importantes, a câmera vai para a mesa: braço, mão e caneta em 3D assinam, recusam, pedem esclarecimentos ou emitem o parecer. Nas conversas de peso, um rosto 3D responde com olhar, piscadas e boca sincronizada com a voz.</p>
            <ul className="mt-4 grid gap-2 text-[color:var(--g-ink2)]"><li>✅ A animação só mostra uma escolha <b>já confirmada</b>: tocar por engano ou cancelar não registra nada.</li><li>✅ Aparelho sem 3D? A cena equivalente em 2D preserva escolhas e resultados.</li><li>🧪 Modelos 3D desta versão são <b>procedurais provisórios</b>, em evolução.</li></ul>
          </div>
          <div className="grid gap-4">
            <figure className="g-card overflow-hidden"><img src="/promo/caneta-3d.webp" width={1100} height={620} alt="Cena 3D: mão de um personagem segurando uma caneta tinteiro azul e assinando um documento sobre a mesa" loading="lazy" className="h-auto w-full" /></figure>
            <figure className="g-card overflow-hidden"><img src="/promo/rosto-3d.webp" width={900} height={600} alt="Busto 3D do Guardião do Cofre, de óculos meia-lua e bigode, com expressão irônica" loading="lazy" className="h-auto w-full" /></figure>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="h-ciclo">
        <h2 id="h-ciclo" className="text-center text-3xl font-bold sm:text-5xl">Como cada caso funciona</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map(([ic, t, d], i) => <li key={t} className="g-card p-4"><p className="flex items-center gap-2 text-xl font-bold"><span className="grid size-10 place-items-center rounded-2xl bg-[color:var(--g-yellow)] text-2xl" aria-hidden>{ic}</span><span><span className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--g-orange-d)]">Passo {i + 1}</span><br />{t}</span></p><p className="mt-2 text-[color:var(--g-ink2)]">{d}</p></li>)}
        </ol>
      </section>

      <section className="bg-[#eaf7ef] py-14" aria-labelledby="h-trajetos">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-2">
          <article className="g-card p-5" style={{ borderColor: "var(--g-red)" }}><h2 id="h-trajetos" className="text-2xl font-bold">🔟 Tentar os 10%</h2><p className="mt-2 text-[color:var(--g-ink2)]">Você pode, ficticiamente, desviar <b>até 10%</b> da base de um evento — com confirmação explícita. Dá vantagens rápidas, mas acumula evidências, dependência de aliados e serviços piores. Nesta campanha, todo desvio deliberado leva à <b>responsabilização</b> no encerramento (uma convenção da ficção, avisada desde o início). Restituir é possível — e muda o epílogo, sem apagar o que aconteceu.</p></article>
          <article className="g-card p-5" style={{ borderColor: "var(--g-green)" }}><h2 className="text-2xl font-bold">🏥 Melhorar a gestão</h2><p className="mt-2 text-[color:var(--g-ink2)]">Reduza desperdício sem fechar portas, compare propostas pelo custo total, confira a entrega antes de pagar, enfrente corte linear e inauguração apressada. Economia legítima <b>não</b> vira dinheiro seu — vira estoque, atendimento e confiança. Ser honesto não garante ser competente: erros acontecem e podem ser corrigidos.</p></article>
        </div>
        <p className="mx-auto mt-5 max-w-3xl px-4 text-center text-sm text-[color:var(--g-ink2)]">O quiz inicial só ajusta atributos e <b>não define seu destino</b>: você pode mudar de caminho durante a campanha.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="h-elenco">
        <h2 id="h-elenco" className="text-center text-3xl font-bold sm:text-5xl">Quem você vai encontrar</h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(["joana", "celia", "guardiao", "toninho", "juninho", "roberto", "ana", "bento", "cornelio"] as const).map((id) => { const c = CHARACTERS[id]; return (
            <li key={id} className="g-card overflow-hidden text-center"><div className="aspect-square" style={{ background: `linear-gradient(#fff, ${c.cor}33)` }}><Portrait look={c.look} enquadramento="rosto" emocao="feliz" title={c.nome} className="h-full w-full" /></div><p className="px-2 pb-2 pt-1 text-sm font-bold leading-tight">{c.nome}<span className="block text-xs font-normal text-[color:var(--g-ink3)]">{c.papel}</span></p></li>
          ); })}
          <li className="g-card grid place-items-center p-3 text-center"><Link href="/elenco" className="g-btn sm">Ver o elenco completo →</Link></li>
        </ul>
      </section>

      <section className="bg-[#eef2fe] py-14" aria-labelledby="h-dados">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="h-dados" className="text-3xl font-bold sm:text-5xl">O orçamento inspira a história. As decisões mudam o final.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="g-card p-4"><h3 className="text-xl font-bold">📊 Dados reais, à vista</h3><p className="mt-1 text-[color:var(--g-ink2)]">O cenário pode usar o gasto oficial de saúde do seu município (via <Link href="/brasil-fiscal">Brasil Fiscal</Link>: Siconfi/Tesouro). Cada valor mostra se é <b>dado oficial</b>, <b>estimativa didática</b> ou <b>resultado simulado</b> — e há o botão “Ver os dados reais”.</p></div>
            <div className="g-card p-4"><h3 className="text-xl font-bold">📓 Caderno de Gestão</h3><p className="mt-1 text-[color:var(--g-ink2)]">Problema, decisão, resultado, conceito, fonte e aplicação prática — pesquisável, com favoritos. Conhecimento <i>aplicado</i> destrava alternativas.</p></div>
            <div className="g-card p-4"><h3 className="text-xl font-bold">📄 Relatório e plano</h3><p className="mt-1 text-[color:var(--g-ink2)]">No fim, o histórico completo vira relatório com decisões, valores, consequências e um plano educativo (responsável, prazo, custo, indicador, fonte). Não é diagnóstico do país.</p></div>
            <div className="g-card p-4"><h3 className="text-xl font-bold">🔊 Vozes e legendas</h3><p className="mt-1 text-[color:var(--g-ink2)]">Todas as falas têm legenda; volumes de voz, música e efeitos são separados; dá para desligar o áudio.</p></div>
            <div className="g-card p-4"><h3 className="text-xl font-bold">♿ Para todo mundo</h3><p className="mt-1 text-[color:var(--g-ink2)]">Toque no celular, mouse e teclado no computador, reduzir movimento, alto contraste, texto maior e a alternativa 2D das cenas 3D.</p></div>
            <div className="g-card p-4"><h3 className="text-xl font-bold">👤 Perfil opcional</h3><p className="mt-1 text-[color:var(--g-ink2)]">Jogue sem cadastro. Com perfil, suas campanhas, caderno e conquistas ficam salvos na conta, em qualquer aparelho.</p><Link href="/entrar" className="g-btn sm mt-2">Entrar / criar perfil</Link></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center" aria-labelledby="h-status">
        <h2 id="h-status" className="text-3xl font-bold">O que já dá para jogar</h2>
        <p className="mt-3 text-[color:var(--g-ink2)]">Esta versão traz a <b>campanha curta da UPA</b> (10 casos, ~15–25 minutos) com os dois encerramentos locais — reconhecimento da comunidade e responsabilização — mais o encerramento de gestão insuficiente. A <b>carreira completa</b> (sete cargos, mapa do Brasil, eleição, Imperador Supremo, Presidência, bens e desafios entre amigos) está <b>em desenvolvimento</b>.</p>
        <div className="mt-6"><Link href="/jogo?acao=novo" className="g-btn orange xl">▶ Jogar a campanha da UPA</Link></div>
      </section>

      <footer className="border-t-2 border-[color:var(--g-line)] bg-white px-4 py-8 text-center text-sm text-[color:var(--g-ink2)]">
        <p><b>MEUS 10%</b> é uma sátira e uma simulação. Personagens, empresas, valores de desvio e finais são fictícios e não representam pessoas, órgãos ou fornecedores reais. Nenhuma pontuação é inferida de rosto, nome ou origem.</p>
        <p className="mt-2 flex flex-wrap justify-center gap-3"><Link href="/brasil-fiscal">Brasil Fiscal</Link><Link href="/elenco">Elenco</Link><Link href="/entrar">Entrar</Link><Link href="/jogo?acao=config">Configurações</Link></p>
      </footer>
    </div>
  );
}
