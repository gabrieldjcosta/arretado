import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { DialogoDoLembrete } from '../hoje/DialogoDoLembrete';

/**
 * O nome e a frase de apoio de uma opção do painel. Os dois entram no nome acessível: o texto visível tem
 * de estar dentro dele (WCAG 2.5.3, regra `label-content-name-mismatch` do axe), e o espaço entre eles
 * vale mesmo sem o CSS, que é quem separa as duas linhas. A tecla de atalho é só dica visual (`aria-hidden`):
 * o link a declara em `aria-keyshortcuts`.
 */
function Textos({ nome, apoio, atalho }: { nome: string; apoio: string; atalho?: string }) {
  return (
    <>
      <span className="mais-item-titulo">
        {nome}
        {atalho && (
          <kbd className="atalho" aria-hidden="true">
            {atalho}
          </kbd>
        )}
      </span>{' '}
      <span className="mais-item-apoio">{apoio}</span>
    </>
  );
}

/**
 * O "+" da casca (D-D23): um botão redondo de 48 px no canto de cima, à direita, de toda tela, no mesmo
 * lugar em qualquer uma: no cabeçalho (que reserva o lugar dele no recuo da direita) e no modo foco,
 * onde o cabeçalho some e ele continua. Por isso mora na casca e não no título de uma tela: a pessoa registra um
 * erro ou anota um lembrete de onde estiver, sem sair da lei, da Trilha ou das configurações.
 *
 * Abre um painel com "Registrar erro" (por onde entra a Frase correta, D25; leva à tela de registro, e a
 * tecla E faz o mesmo de qualquer tela) e "Lembrete" (uma nota rápida, sem hora nem aviso, num diálogo que
 * abre por cima da tela, sem trocar de rota). O painel é um botão que mostra e esconde, como o menu
 * Ajuda: toque fora e Esc fecham, e o Esc devolve o foco ao "+". Mudar de tela também o fecha: o "+"
 * fica montado entre elas, então o painel guarda em que tela foi aberto e só vale nela.
 */
export function MaisGlobal() {
  const { key: chaveDaRota } = useLocation();
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === chaveDaRota;
  const [lembrando, setLembrando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const abriuOLembrete = useRef(false);
  const abertoAgora = useRef(false);
  const itens = useId();

  useEffect(() => {
    abertoAgora.current = aberto;
  }, [aberto]);

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

  // Esc com o painel aberto fecha só o painel. O ouvinte mora desde a montagem, na captura da janela, para
  // chegar antes dos que o Leitor põe no modo foco (a bandeja e o atalho de sair), que tomariam o mesmo Esc
  // para sair do foco: entre ouvintes da mesma fase, quem registrou primeiro é o primeiro a ouvir.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !abertoAgora.current || e.defaultPrevented) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setAbertoEm(null);
      botao.current?.focus();
    };
    window.addEventListener('keydown', tecla, true);
    return () => {
      window.removeEventListener('keydown', tecla, true);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (e.target instanceof Node && !raiz.current?.contains(e.target)) setAbertoEm(null);
    };
    document.addEventListener('pointerdown', fora);
    return () => {
      document.removeEventListener('pointerdown', fora);
    };
  }, [aberto]);

  return (
    <div className="mais-global" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="botao mais"
        aria-expanded={aberto}
        aria-controls={itens}
        aria-label="Novo registro"
        title="Novo registro (atalho: E registra um erro)"
        onClick={() => {
          setAbertoEm(aberto ? null : chaveDaRota);
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
            aria-keyshortcuts="E"
            onClick={() => {
              setAbertoEm(null);
            }}
          >
            <Textos nome="Registrar erro" apoio="A frase certa vira cartão" atalho="E" />
          </Link>
          <button
            type="button"
            className="mais-item"
            onClick={() => {
              setAbertoEm(null);
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
