import { useEffect, useRef, useState } from 'react';

/**
 * O "Mais" da barra do Leitor no celular (menos de 700 px): Filtrar, Registrar erro e Ações saem da
 * linha das ferramentas para ela caber em uma linha só, e ficam a dois toques (o registro do erro abre
 * direto no formulário, sem passar pelo painel de Ações). Abre para cima, no padrão do
 * `MenuAjuda`: fecha ao tocar fora e no Esc, e devolve o foco ao botão. A bandeja do modo foco dá o
 * visual do painel (`.bandeja-itens`). Cada item leva uma linha de apoio (no celular, o `title` do dock
 * não aparece): ela faz parte do nome do botão, que é o que o axe pede do texto visível.
 */
export function MaisDoLeitor({
  filtro,
  abrirFiltro,
  abrirRegistro,
  abrirAcoes,
}: {
  /** A frase do filtro ligado ("estrelados"), se há um. */
  filtro: string | undefined;
  abrirFiltro: () => void;
  /** Abre o painel de Ações já no formulário do erro. */
  abrirRegistro: () => void;
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

  // O item sai da tela ao fechar o menu: o foco vai antes para o "Mais", que é onde o diálogo o devolve.
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
        className={filtro === undefined ? undefined : 'filtro-ligado'}
        aria-expanded={aberto}
        aria-controls="mais-do-leitor-itens"
        aria-label={filtro === undefined ? 'Mais' : `Mais. Filtrado: ${filtro}`}
        onClick={() => {
          setAberto((a) => !a);
        }}
      >
        Mais
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
              abrir(abrirRegistro);
            }}
          >
            <span>Registrar erro</span>
            <small>Vinculado ao dispositivo no alto da tela</small>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              abrir(abrirAcoes);
            }}
          >
            <span>Ações</span>
            <small>Erro, cartão e referência do dispositivo</small>
          </button>
        </div>
      )}
    </div>
  );
}
