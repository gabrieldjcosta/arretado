import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { DialogoDoLembrete } from '../hoje/DialogoDoLembrete';

/**
 * O nome e a frase de apoio de uma opção do painel. Os dois entram no nome acessível: o texto visível tem
 * de estar dentro dele (WCAG 2.5.3, regra `label-content-name-mismatch` do axe), e o espaço entre eles
 * vale mesmo sem o CSS, que é quem separa as duas linhas.
 */
function Textos({ nome, apoio }: { nome: string; apoio: string }) {
  return (
    <>
      <span className="mais-item-titulo">{nome}</span>{' '}
      <span className="mais-item-apoio">{apoio}</span>
    </>
  );
}

/**
 * Título da tela com o "+" redondo, de 48 px e com o contorno do controle, na mesma linha (D-D9, Q2).
 * O "+" abre um painel com duas opções, "Registrar erro" (por onde entra a Frase correta, D25) e
 * "Lembrete" (uma nota rápida, sem hora nem aviso); fica nas telas em que se registra (Hoje e Fixar).
 * Nas outras, o registro de erro segue pela tecla E e, a partir de 900 px, pelo "Registrar erro" do
 * cabeçalho. O painel é um botão que mostra e esconde, como o menu Ajuda: toque fora e Esc fecham, e o
 * Esc devolve o foco ao "+".
 */
export function TituloComMais({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [lembrando, setLembrando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const abriuOLembrete = useRef(false);
  const itens = useId();

  // Ao fechar o diálogo do Lembrete o foco volta ao "+": o item que o abriu já saiu da tela com o painel,
  // então o navegador não tem para onde devolvê-lo. Vem depois do fechamento (o `<dialog>` modal torna o
  // resto da página inerte, e o inerte não recebe foco).
  useEffect(() => {
    if (lembrando) abriuOLembrete.current = true;
    else if (abriuOLembrete.current) {
      abriuOLembrete.current = false;
      botao.current?.focus();
    }
  }, [lembrando]);

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

  return (
    <div className="titulo-com-mais" ref={raiz}>
      <h1>{children}</h1>
      <button
        ref={botao}
        type="button"
        className="botao mais"
        aria-expanded={aberto}
        aria-controls={itens}
        aria-label="Novo registro"
        title="Novo registro (atalho: E registra um erro)"
        onClick={() => {
          setAberto((a) => !a);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {aberto && (
        <div id={itens} className="mais-itens">
          <Link
            to="/recall/registrar"
            className="mais-item"
            onClick={() => {
              setAberto(false);
            }}
          >
            <Textos nome="Registrar erro" apoio="A frase certa vira cartão" />
          </Link>
          <button
            type="button"
            className="mais-item"
            onClick={() => {
              setAberto(false);
              setLembrando(true);
            }}
          >
            <Textos nome="Lembrete" apoio="Uma nota rápida, sem hora nem aviso" />
          </button>
        </div>
      )}
      <DialogoDoLembrete
        aberto={lembrando}
        aoFechar={() => {
          setLembrando(false);
        }}
      />
    </div>
  );
}
