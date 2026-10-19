// A bandeja do modo foco (palco): na tela fica só o "⋯" e o fio de progresso; os controles do
// leitor ficam atrás dele. Fecha sozinha depois de 5 s sem interação, menos com o foco do teclado
// ou o ponteiro dentro dela e com diálogo aberto ou trecho selecionado (`ocupada`). Esc fecha a
// bandeja antes de sair do foco; setas, J/K, deslize, F e S continuam sem abri-la.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { teclaForaDosAtalhos } from '../componentes/teclado';

/** Quanto a bandeja espera, sem interação, antes de fechar. */
export const ESPERA_DA_BANDEJA = 5000;

export type LenteDoFoco = 'cartao' | 'corrido';

export function BandejaDoFoco({
  lente,
  trocarLente,
  podeCartao,
  anterior,
  proximo,
  noPrimeiro,
  noUltimo,
  buscar,
  filtrar,
  filtro,
  acoes,
  estrelar,
  lidoAteAqui,
  sair,
  ocupada,
  botaoRef,
}: {
  lente: LenteDoFoco;
  /** Pede a outra lente (`cartao` ou `corrido`). */
  trocarLente: (nova: LenteDoFoco) => void;
  /** A norma tem artigos: sem eles o cartão não tem o que mostrar. */
  podeCartao: boolean;
  anterior: () => void;
  proximo: () => void;
  noPrimeiro: boolean;
  noUltimo: boolean;
  buscar: () => void;
  filtrar: () => void;
  /** A frase do filtro ligado, se há um. */
  filtro?: string | undefined;
  acoes: () => void;
  estrelar: () => void;
  lidoAteAqui: () => void;
  sair: () => void;
  /** Diálogo aberto ou trecho selecionado: a bandeja não fecha sozinha. */
  ocupada: boolean;
  botaoRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [aberta, setAberta] = useState(false);
  const [dentro, setDentro] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [toques, setToques] = useState(0);
  const caixa = useRef<HTMLDivElement | null>(null);
  const botao = useRef<HTMLButtonElement | null>(null);
  const abertaAgora = useRef(aberta);
  const ocupadaAgora = useRef(ocupada);
  const sairAgora = useRef(sair);
  useEffect(() => {
    abertaAgora.current = aberta;
    ocupadaAgora.current = ocupada;
    sairAgora.current = sair;
  });

  function fechar(devolverFoco: boolean) {
    const comFoco = caixa.current?.contains(document.activeElement) ?? false;
    setAberta(false);
    setDentro(false);
    setSobre(false);
    if (devolverFoco || comFoco) botao.current?.focus({ preventScroll: true });
  }
  const fecharAgora = useRef(fechar);
  useEffect(() => {
    fecharAgora.current = fechar;
  });

  const parada = dentro || sobre || ocupada;
  useEffect(() => {
    if (!aberta || parada) return;
    const espera = setTimeout(() => {
      setAberta(false);
    }, ESPERA_DA_BANDEJA);
    return () => {
      clearTimeout(espera);
    };
  }, [aberta, parada, toques]);

  // Esc: o primeiro fecha a bandeja, o segundo sai do foco. Na captura, antes do ouvinte do leitor,
  // que respeita o `defaultPrevented`.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.repeat) return;
      if (teclaForaDosAtalhos(e) || ocupadaAgora.current) return;
      e.preventDefault();
      if (abertaAgora.current) fecharAgora.current(true);
      else sairAgora.current();
    };
    window.addEventListener('keydown', tecla, true);
    return () => {
      window.removeEventListener('keydown', tecla, true);
    };
  }, []);

  function agir(acao: () => void, fecha = true) {
    return () => {
      setToques((n) => n + 1);
      if (fecha) fechar(false);
      acao();
    };
  }

  return (
    <div
      className="bandeja-do-foco"
      ref={caixa}
      onPointerEnter={() => {
        setSobre(true);
      }}
      onPointerLeave={() => {
        setSobre(false);
      }}
      onPointerMove={() => {
        setToques((n) => n + 1);
      }}
      onKeyDown={() => {
        setToques((n) => n + 1);
      }}
      onFocus={() => {
        setDentro(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDentro(false);
      }}
    >
      {aberta && (
        <div role="group" aria-label="Controles do modo foco" className="bandeja-itens">
          <button type="button" aria-keyshortcuts="/" onClick={agir(buscar)}>
            Buscar
          </button>
          <button
            type="button"
            className={filtro ? 'filtro-ligado' : undefined}
            onClick={agir(filtrar)}
          >
            {filtro ? `Filtrar: ${filtro}` : 'Filtrar'}
          </button>
          <button type="button" onClick={agir(acoes)}>
            Ações
          </button>
          <button type="button" aria-keyshortcuts="S" onClick={agir(estrelar)}>
            Estrelar
          </button>
          <button type="button" onClick={agir(lidoAteAqui)}>
            Lido até aqui
          </button>
          {lente === 'cartao' && (
            <>
              <button
                type="button"
                aria-disabled={noPrimeiro}
                aria-keyshortcuts="ArrowLeft K"
                onClick={agir(anterior, false)}
              >
                Artigo anterior
              </button>
              <button
                type="button"
                className="principal"
                aria-disabled={noUltimo}
                aria-keyshortcuts="ArrowRight J"
                onClick={agir(proximo, false)}
              >
                Próximo artigo
              </button>
            </>
          )}
          <button
            type="button"
            aria-disabled={lente === 'corrido' && !podeCartao}
            onClick={agir(() => {
              if (lente === 'cartao') trocarLente('corrido');
              else if (podeCartao) trocarLente('cartao');
            })}
          >
            {lente === 'cartao' ? 'Texto corrido' : 'Um artigo por vez'}
          </button>
          <button
            type="button"
            className="sair-do-foco"
            aria-keyshortcuts="F Escape"
            onClick={agir(sair)}
          >
            Sair do foco
          </button>
        </div>
      )}
      <button
        ref={(no) => {
          botao.current = no;
          if (botaoRef) botaoRef.current = no;
        }}
        type="button"
        className="bandeja-botao"
        aria-expanded={aberta}
        aria-label="Mais ações do foco"
        title="Mais ações do foco"
        onClick={() => {
          setToques((n) => n + 1);
          setAberta((a) => !a);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="5" cy="12" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="19" cy="12" r="1.9" />
        </svg>
      </button>
    </div>
  );
}

/** As duas setas discretas do pé do cartão: sempre à vista, fora da bandeja. */
export function SetasDoCartao({
  anterior,
  proximo,
  noPrimeiro,
  noUltimo,
  children,
}: {
  anterior: () => void;
  proximo: () => void;
  noPrimeiro: boolean;
  noUltimo: boolean;
  children: React.ReactNode;
}) {
  return (
    <nav className="pe-do-cartao" aria-label="Artigo por artigo">
      <button
        type="button"
        className="seta-do-cartao"
        aria-label="Artigo anterior"
        aria-disabled={noPrimeiro}
        aria-keyshortcuts="ArrowLeft"
        onClick={anterior}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      {children}
      <button
        type="button"
        className="seta-do-cartao"
        aria-label="Próximo artigo"
        aria-disabled={noUltimo}
        aria-keyshortcuts="ArrowRight"
        onClick={proximo}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
