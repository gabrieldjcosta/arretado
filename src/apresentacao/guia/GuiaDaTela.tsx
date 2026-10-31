import { useEffect, useId, useRef, useState } from 'react';
import { GUIAS, TITULO_DO_GUIA, type TelaComGuia } from './conteudo';
import { aoReabrirGuia, guiaJaVisto, marcarGuiaVisto, registrarGuiaMontado } from './memoria';
import './estilos-guia.css';

/**
 * Dicas de uma área: um cartãozinho recolhido no topo da tela, sempre no mesmo lugar e sem empurrar
 * a ação principal para fora da dobra. Ao abrir, cada dica é um cartão de um carrossel (desliza para
 * o lado, ou "Anterior"/"Próxima"). Abrir uma vez vale como visto: a marca "Novo" some e o cartão
 * segue lá, recolhido, para quando a pessoa quiser reler. Reabre também pelo menu Ajuda.
 * `vazio` escolhe as dicas do estado em que a tela está; cada uma começa pelo rótulo exato de um
 * controle que está à vista.
 */
export function GuiaDaTela({
  tela,
  vazio = false,
  omitir = [],
}: {
  tela: TelaComGuia;
  vazio?: boolean;
  omitir?: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState(() => !guiaJaVisto(tela));
  const [indice, setIndice] = useState(0);
  const [reaberturas, setReaberturas] = useState(0);
  const botao = useRef<HTMLButtonElement>(null);
  const trilho = useRef<HTMLUListElement>(null);
  const painel = useId();

  // Aberto o cartão, a dica já foi vista: a marca "Novo" sai e fica gravado neste Aparelho.
  const abrir = () => {
    marcarGuiaVisto(tela);
    setNovo(false);
    setAberto(true);
  };

  useEffect(() => registrarGuiaMontado(tela), [tela]);

  useEffect(
    () =>
      aoReabrirGuia(tela, () => {
        marcarGuiaVisto(tela);
        setNovo(false);
        setAberto(true);
        setIndice(0);
        setReaberturas((n) => n + 1);
      }),
    [tela],
  );

  // Reaberto pela Ajuda: leva o cartão à vista e o foco ao botão que o recolhe.
  useEffect(() => {
    if (reaberturas === 0) return;
    botao.current?.scrollIntoView({ block: 'nearest' });
    botao.current?.focus({ preventScroll: true });
  }, [reaberturas]);

  const dicas = (vazio ? GUIAS[tela].vazio : GUIAS[tela].uso).filter(
    (d) => !omitir.includes(d.opcao),
  );
  if (dicas.length === 0) return null;
  const ultima = dicas.length - 1;

  const irPara = (i: number) => {
    const el = trilho.current;
    const alvo = Math.max(0, Math.min(ultima, i));
    setIndice(alvo);
    if (!el) return;
    const sem =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const x = alvo * el.clientWidth;
    if (typeof el.scrollTo === 'function')
      el.scrollTo({ left: x, behavior: sem ? 'auto' : 'smooth' });
    else el.scrollLeft = x;
  };

  return (
    <section className="dicas-da-tela" aria-label={TITULO_DO_GUIA}>
      <button
        type="button"
        ref={botao}
        className="dicas-abrir"
        aria-expanded={aberto}
        aria-controls={painel}
        onClick={() => {
          if (aberto) setAberto(false);
          else abrir();
        }}
      >
        <span>{TITULO_DO_GUIA}</span>
        {novo && <span className="marcador">Novo</span>}
        <span className="dica">{aberto ? 'Recolher' : `${String(dicas.length)} dicas`}</span>
      </button>
      <div id={painel} hidden={!aberto}>
        <ul
          className="dicas-trilho"
          ref={trilho}
          tabIndex={0}
          aria-label="Dicas, deslize para o lado"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.clientWidth > 0) setIndice(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {dicas.map((d, i) => (
            <li key={d.opcao} aria-label={`${String(i + 1)} de ${String(dicas.length)}`}>
              <strong>{d.opcao}</strong>
              <span>{d.efeito}</span>
            </li>
          ))}
        </ul>
        <div className="dicas-passos">
          <button
            type="button"
            className="discreto"
            disabled={indice <= 0}
            onClick={() => {
              irPara(indice - 1);
            }}
          >
            Anterior
          </button>
          <span role="status">{`${String(indice + 1)} de ${String(dicas.length)}`}</span>
          <button
            type="button"
            className="discreto"
            disabled={indice >= ultima}
            onClick={() => {
              irPara(indice + 1);
            }}
          >
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}
