import { useEffect, useRef, useState } from 'react';
import { GUIAS, TITULO_DO_GUIA, type TelaComGuia } from './conteudo';
import { aoReabrirGuia, guiaJaVisto, marcarGuiaVisto, registrarGuiaMontado } from './memoria';
import './estilos-guia.css';

/** Tempo com o cartão pelo menos pela metade na tela para valer como visto. */
const MS_PARA_VER = 1000;

/**
 * Guia curto da primeira abertura de uma área, só no estado vazio (quem monta decide): um cartão na
 * própria tela, depois da ação principal, que diz o que cada controle visível faz. Vale como visto
 * no "Entendi" ou quando esteve ao menos pela metade na tela por cerca de 1 s; sair da tela sem ele
 * ter aparecido (a folha de boas-vindas cobre o Hoje) não o gasta. Reabre pelo menu Ajuda.
 */
export function GuiaDaTela({ tela, omitir = [] }: { tela: TelaComGuia; omitir?: string[] }) {
  const [aberto, setAberto] = useState(() => !guiaJaVisto(tela));
  const [reaberturas, setReaberturas] = useState(0);
  const cartao = useRef<HTMLElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => registrarGuiaMontado(tela), [tela]);

  useEffect(
    () =>
      aoReabrirGuia(tela, () => {
        setAberto(true);
        setReaberturas((n) => n + 1);
      }),
    [tela],
  );

  // Visto: metade do cartão na tela por cerca de 1 s. Sem IntersectionObserver, só o "Entendi" vale.
  useEffect(() => {
    const el = cartao.current;
    if (!aberto || !el || typeof IntersectionObserver === 'undefined') return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const obs = new IntersectionObserver(
      ([e]) => {
        clearTimeout(espera);
        if (e?.isIntersecting)
          espera = setTimeout(() => {
            marcarGuiaVisto(tela);
          }, MS_PARA_VER);
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => {
      clearTimeout(espera);
      obs.disconnect();
    };
  }, [aberto, tela]);

  // Reaberto pela Ajuda: leva o cartão à vista e o foco ao título.
  useEffect(() => {
    if (reaberturas === 0) return;
    cartao.current?.scrollIntoView({ block: 'nearest' });
    titulo.current?.focus({ preventScroll: true });
  }, [reaberturas]);

  if (!aberto) return null;
  const linhas = GUIAS[tela].linhas.filter((l) => !omitir.includes(l.opcao));
  return (
    <section className="guia-da-tela" ref={cartao} aria-labelledby={`guia-${tela}`}>
      <div className="guia-cabeca">
        <h2 id={`guia-${tela}`} ref={titulo} tabIndex={-1}>
          {TITULO_DO_GUIA}
        </h2>
        <button
          type="button"
          className="discreto"
          onClick={() => {
            marcarGuiaVisto(tela);
            setAberto(false);
            document.getElementById('conteudo')?.focus({ preventScroll: true });
          }}
        >
          Entendi
        </button>
      </div>
      <dl>
        {linhas.map((l) => (
          <div key={l.opcao}>
            <dt>{l.opcao}</dt>
            <dd>{l.efeito}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
