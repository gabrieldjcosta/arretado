import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { DialogoDoLembrete } from '../hoje/DialogoDoLembrete';
import { useRegistroDeItens, type ItemDoMais } from './ItensDoMais';
import { teclaForaDosAtalhos } from './teclado';

/**
 * O nome e a frase de apoio de uma opção do painel. Os dois entram no nome acessível: o texto visível tem
 * de estar dentro dele (WCAG 2.5.3, regra `label-content-name-mismatch` do axe), e o espaço entre eles
 * vale mesmo sem o CSS, que é quem separa as duas linhas. A tecla de atalho é só dica visual (`aria-hidden`):
 * o item a declara em `aria-keyshortcuts`.
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

/** O item da tela que toma o lugar do "Registrar erro" genérico (e que a tecla E aciona). */
const REGISTRAR_ERRO = 'registrar-erro';

/**
 * O "+" da casca (D-D23): um botão redondo de 48 px no canto de cima, à direita, de toda tela, no mesmo
 * lugar em qualquer uma: no cabeçalho (que reserva o lugar dele no recuo da direita) e no modo foco,
 * onde o cabeçalho some e ele continua. Por isso mora na casca e não no título de uma tela: a pessoa registra um
 * erro ou anota um lembrete de onde estiver, sem sair da lei, da Trilha ou das configurações.
 *
 * Abre um painel com "Registrar erro" (por onde entra a Frase correta, D25; leva à tela de registro, e a
 * tecla E faz o mesmo de qualquer tela) e "Lembrete" (uma nota rápida, sem hora nem aviso, num diálogo que
 * abre por cima da tela, sem trocar de rota). A tela pode acrescentar itens dela (D-D24): no Leitor, o
 * "Registrar erro" nasce ligado ao dispositivo no alto da tela e abre sem sair da lei, e entra o "Cartão
 * deste trecho". Os itens da tela são lidos uma vez, ao abrir o painel. O painel é um botão que mostra e
 * esconde, como o menu Ajuda: toque fora e Esc fecham, e o Esc devolve o foco ao "+". Mudar de tela também
 * o fecha: o "+" fica montado entre elas, então o painel guarda em que tela foi aberto e só vale nela.
 */
export function MaisGlobal() {
  const { key: chaveDaRota } = useLocation();
  const registro = useRegistroDeItens();
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === chaveDaRota;
  const [daTela, setDaTela] = useState<readonly ItemDoMais[]>([]);
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
    // A tecla E faz o que o "Registrar erro" do painel faz (a casca a ouve): o painel não fica aberto
    // atrás do que ela abre (na lei, o formulário do erro, que não troca de rota).
    const registrar = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && !teclaForaDosAtalhos(e)) setAbertoEm(null);
    };
    document.addEventListener('pointerdown', fora);
    window.addEventListener('keydown', registrar);
    return () => {
      document.removeEventListener('pointerdown', fora);
      window.removeEventListener('keydown', registrar);
    };
  }, [aberto]);

  function alternar() {
    if (aberto) {
      setAbertoEm(null);
      return;
    }
    // A tela entrega os itens agora, com o que está à vista neste instante (o dispositivo no alto da tela).
    setDaTela(registro?.itens() ?? []);
    setAbertoEm(chaveDaRota);
  }

  function escolher(item: ItemDoMais) {
    if (item.indisponivel === true) return;
    // O item sai da tela com o painel. O foco vai antes para o "+", que é para onde o diálogo que a ação
    // abrir o devolve ao fechar.
    botao.current?.focus({ preventScroll: true });
    setAbertoEm(null);
    item.aoEscolher();
  }

  const doErro = daTela.find((item) => item.id === REGISTRAR_ERRO);
  const outros = daTela.filter((item) => item.id !== REGISTRAR_ERRO);

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
        onClick={alternar}
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
          {doErro ? (
            <ItemDaTela item={doErro} escolher={escolher} />
          ) : (
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
          )}
          {outros.map((item) => (
            <ItemDaTela key={item.id} item={item} escolher={escolher} />
          ))}
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

/**
 * Um item que a tela acrescentou. Sem ação possível (`indisponivel`), fica apagado mas continua no
 * caminho do teclado, e o apoio diz por quê.
 */
function ItemDaTela({
  item,
  escolher,
}: {
  item: ItemDoMais;
  escolher: (item: ItemDoMais) => void;
}) {
  return (
    <button
      type="button"
      className="mais-item"
      aria-disabled={item.indisponivel === true ? true : undefined}
      aria-keyshortcuts={item.atalho}
      onClick={() => {
        escolher(item);
      }}
    >
      <Textos
        nome={item.nome}
        apoio={item.apoio}
        {...(item.atalho === undefined ? {} : { atalho: item.atalho })}
      />
    </button>
  );
}
