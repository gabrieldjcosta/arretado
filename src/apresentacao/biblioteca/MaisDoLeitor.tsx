import { useEffect, useRef, useState } from 'react';

/**
 * O "⋯" do grupo fixo do Leitor (D-D24), em toda largura: Filtrar e Ações saem da linha das ferramentas e
 * ficam a dois toques, e o grupo fica em Buscar, Modo foco e o "⋯", como a bandeja do modo foco. Criar
 * (registrar um erro, fazer um cartão do trecho) não mora aqui: é com o "+" da casca, em toda tela. O "⋯"
 * lê e organiza; o "+" cria. Abre para cima, no padrão do `MenuAjuda`: fecha ao tocar fora e no Esc, e
 * devolve o foco ao botão. A bandeja do modo foco dá o visual do painel (`.bandeja-itens`). Cada item leva
 * uma linha de apoio (o `title` do dock não aparece no celular): ela faz parte do nome do botão, que é o
 * que o axe pede do texto visível. Com um filtro ligado o botão ganha o anel do filtro e diz qual é.
 */
export function MaisDoLeitor({
  filtro,
  abrirFiltro,
  abrirAcoes,
}: {
  /** A frase do filtro ligado ("estrelados"), se há um. */
  filtro: string | undefined;
  abrirFiltro: () => void;
  abrirAcoes: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (e.target instanceof Node && !raiz.current?.contains(e.target)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  // O item sai da tela ao fechar o menu: o foco vai antes para o "⋯", que é onde o diálogo o devolve.
  function abrir(acao: () => void) {
    botao.current?.focus({ preventScroll: true });
    setAberto(false);
    acao();
  }

  return (
    <div className="mais-do-leitor" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className={
          filtro === undefined ? 'mais-do-leitor-botao' : 'mais-do-leitor-botao filtro-ligado'
        }
        aria-expanded={aberto}
        aria-controls="mais-do-leitor-itens"
        aria-label={filtro === undefined ? 'Mais' : `Mais. Filtrado: ${filtro}`}
        title="Mais da leitura: filtrar e ações do dispositivo no alto da tela"
        onClick={() => {
          setAberto((a) => !a);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="5" cy="12" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="19" cy="12" r="1.9" />
        </svg>
      </button>
      {aberto && (
        <div
          id="mais-do-leitor-itens"
          role="group"
          aria-label="Mais ferramentas da leitura"
          className="bandeja-itens mais-do-leitor-itens"
        >
          <button
            type="button"
            className={filtro === undefined ? undefined : 'filtro-ligado'}
            aria-haspopup="dialog"
            onClick={() => {
              abrir(abrirFiltro);
            }}
          >
            <span>{filtro === undefined ? 'Filtrar' : 'Filtrado'}</span>
            <small>
              {filtro === undefined
                ? 'Estrelados, com grifo, nota ou erro'
                : `Mostrando só: ${filtro}`}
            </small>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              abrir(abrirAcoes);
            }}
          >
            <span>Ações</span>
            <small>Estrela, referência, correção e erros ligados</small>
          </button>
        </div>
      )}
    </div>
  );
}
