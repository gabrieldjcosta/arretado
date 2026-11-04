// O Caderno de Frases, a folha `folha-caderno` do mockup aprovado: "Suas Frases certas", cada uma com de onde veio, quando volta
// e, se veio da lei, o "Ler na lei" que abre o artigo com os trechos que o app grifa. As Frases são as da pessoa (o mockup tem duas
// de exemplo); a lista vem em páginas de 50 e a de antes (`/recall/frases`, onde a Frase vira cartão com lacuna) fica a um toque.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useRepositorio } from '../../dados/contexto';
import { animarEDeixar, animarEDeixarSo, modoAgora, SAIR } from './anima';
import {
  carregarCaderno,
  carregarPrimeiras,
  FRASES_POR_PAGINA,
  type CargaDoCaderno,
  type FraseDoCaderno,
  type LeiDaFrase,
} from './caderno-dados';
import { CONTORNO } from './contorno';
import { FolhaM } from './FolhaM';
import { avisar } from './toast';
import { contar } from './varal-lista';

/** Quantas Frases descem com atraso, uma a uma: as de baixo (fora da tela) entram sem esperar a vez. */
const ENTRADAS_ESCALONADAS = 12;

/** A folha da Frase achada pela busca é rolada ao centro e focada só depois de o foco inicial da folha passar (60 ms). */
const ESPERA_DO_FOCO_MS = 160;

/** O texto da lei, com os trechos que o app grifa dentro de `m-grifo` (aceso, como no "Ler na lei" do mockup). */
function TextoDaLei({ lei }: { lei: LeiDaFrase }) {
  return (
    <>
      <p>
        <span className="m-art">{lei.citacao}.</span>
      </p>
      <p>
        {lei.pedacos.map((p, i) =>
          p.grifo ? (
            <span key={i} className="m-grifo">
              {p.texto}
            </span>
          ) : (
            p.texto
          ),
        )}
      </p>
    </>
  );
}

/** "Ler na lei": o botão que abre o artigo de onde a Frase veio (o `lerJunto` do mockup; abre com 320 ms, só no Vivo; rola até ele se ficar fora da vista). */
function LerNaLei({ lei, idDoTexto }: { lei: LeiDaFrase; idDoTexto: string }) {
  const [aberta, setAberta] = useState(false);
  const idDaLei = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const jaMontou = useRef(false);

  useLayoutEffect(() => {
    // Só o abrir se anima (o primeiro render não é um abrir).
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    if (!aberta) return;
    const normal = modoAgora() === 'normal';
    // A folha tem altura fixa (desvio 41): o artigo que abre embaixo da Frase pode cair fora da vista, e então a folha rola até ele.
    caixa.current?.scrollIntoView({ block: 'nearest', behavior: normal ? 'smooth' : 'auto' });
    if (!normal) return;
    void animarEDeixar(
      caixa.current,
      [
        { opacity: 0, transform: 'translateY(-6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 320, easing: SAIR },
    );
  }, [aberta]);

  return (
    <>
      <button
        type="button"
        className="m-abrir"
        aria-expanded={aberta}
        aria-controls={idDaLei}
        aria-describedby={idDoTexto}
        onClick={() => {
          setAberta((a) => !a);
        }}
      >
        Ler na lei
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="m-lei" id={idDaLei} ref={caixa} hidden={!aberta}>
        <TextoDaLei lei={lei} />
      </div>
    </>
  );
}

/** Uma Frase do caderno (o `.frase-item` do mockup): o texto, a linha miúda e, se veio da lei, o "Ler na lei". */
function FraseItem({ f }: { f: FraseDoCaderno }) {
  const idDoTexto = useId();
  const meta = [f.origem, f.artigo, f.volta].filter(Boolean).join(' · ');
  return (
    <div
      className={f.nova ? 'm-frase-item m-nova' : 'm-frase-item'}
      role="listitem"
      data-frase={f.id}
      tabIndex={-1}
    >
      <p className="m-texto" id={idDoTexto}>
        {f.texto}
      </p>
      <div className="m-meta">{meta}</div>
      <div className="m-ler-junto">{f.lei && <LerNaLei lei={f.lei} idDoTexto={idDoTexto} />}</div>
    </div>
  );
}

function ConteudoDoCaderno({
  idDoTitulo,
  foco,
  fechar,
}: {
  idDoTitulo: string;
  foco: string | undefined;
  fechar: () => Promise<void>;
}) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const [carga, setCarga] = useState<CargaDoCaderno | 'falhou' | null>(null);
  const [buscando, setBuscando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const jaEntraram = useRef(new Set<string>());

  useEffect(() => {
    let ativo = true;
    carregarPrimeiras(repo, foco).then(
      (c) => {
        if (ativo) setCarga(c);
      },
      () => {
        if (ativo) setCarga('falhou');
      },
    );
    return () => {
      ativo = false;
    };
  }, [repo, foco]);

  const mostrarMais = async () => {
    if (carga === null || carga === 'falhou' || carga.cursor === null || buscando) return;
    setBuscando(true);
    try {
      const pagina = await carregarCaderno(repo, carga.cursor, FRASES_POR_PAGINA);
      setCarga({ frases: [...carga.frases, ...pagina.frases], cursor: pagina.proximoCursor });
    } catch {
      // A lista que já está na tela fica: só o que faltava trazer não veio.
      avisar('Não deu para trazer mais Frases agora.');
    } finally {
      setBuscando(false);
    }
  };

  // As Frases descem uma a uma, com a mola do mockup (420 ms, 120 ms de espera mais 60 por Frase), só no Vivo; as que já
  // entraram não entram de novo quando "Mostrar mais" acrescenta as seguintes.
  const frases = carga !== null && carga !== 'falhou' ? carga.frases : null;
  useLayoutEffect(() => {
    if (frases === null) return;
    let k = 0;
    lista.current?.querySelectorAll<HTMLElement>('.m-frase-item').forEach((el) => {
      const id = el.dataset['frase'] ?? '';
      if (jaEntraram.current.has(id)) return;
      jaEntraram.current.add(id);
      if (modoAgora() !== 'normal' || k >= ENTRADAS_ESCALONADAS) return;
      // Solta só a descida: a Frase achada pela busca ganha o brilho no mesmo elemento, e ele não pode sumir com ela.
      void animarEDeixarSo(
        el,
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, delay: 120 + k * 60, easing: SAIR },
      );
      k += 1;
    });
  }, [frases]);

  // A Frase que a busca achou: rolada ao centro, focada e com um brilho que passa (o de "nova", só que de ida e volta).
  const pronta = frases !== null;
  useEffect(() => {
    if (foco === undefined || !pronta) return;
    const id = window.setTimeout(() => {
      const el = [...(lista.current?.querySelectorAll<HTMLElement>('.m-frase-item') ?? [])].find(
        (x) => x.dataset['frase'] === foco,
      );
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.focus({ preventScroll: true });
      if (modoAgora() === 'reduzido') return;
      void animarEDeixarSo(
        el,
        [
          { boxShadow: '0 0 0 0 rgba(255,197,61,0)' },
          { boxShadow: '0 0 0 4px rgba(255,197,61,.45)', offset: 0.35 },
          { boxShadow: '0 0 0 0 rgba(255,197,61,0)' },
        ],
        { duration: 1400, easing: 'ease-out' },
      );
    }, ESPERA_DO_FOCO_MS);
    return () => {
      window.clearTimeout(id);
    };
    // Só quando a lista pronta chega pela primeira vez: "Mostrar mais" não rola de novo.
  }, [foco, pronta]);

  const ir = (para: string) => {
    void fechar().then(() => {
      void navegar(para);
    });
  };

  const estado =
    carga === null
      ? 'Buscando as Frases.'
      : carga === 'falhou'
        ? 'Não deu para abrir o caderno agora.'
        : `${contar(carga.frases.length, 'Frase', 'Frases')}${carga.cursor === null ? '' : ', e há mais'}.`;

  return (
    <>
      <span className="m-olho">Varal · Frases</span>
      <h2 id={idDoTitulo}>Suas Frases certas</h2>
      <p className="m-quieto">
        {
          'Cada erro vira a frase certa e volta na revisão. Toque em "Ler na lei" para ver o artigo de onde ela veio.'
        }
      </p>
      <p className="m-so-leitor" role="status">
        {estado}
      </p>
      {carga === 'falhou' && (
        <p className="m-quieto">
          Feche o caderno e abra de novo; as suas Frases continuam guardadas.
        </p>
      )}
      {carga !== null && carga !== 'falhou' && carga.frases.length === 0 && (
        <div className="m-vazio-folheto">
          <p className="m-quieto">
            Ainda não há Frases. Elas nascem do erro que você registra, com a frase certa, e do
            trecho da lei que você guarda na leitura.
          </p>
          <button
            type="button"
            className="m-acao"
            onClick={() => {
              ir('/varal/normas');
            }}
          >
            Ler uma norma
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
      <div id="lista-frases" role="list" aria-labelledby={idDoTitulo} ref={lista}>
        {carga !== null &&
          carga !== 'falhou' &&
          carga.frases.map((f) => <FraseItem key={f.id} f={f} />)}
      </div>
      {carga !== null && carga !== 'falhou' && (
        <div className="m-fim-folha m-fim-do-caderno">
          {carga.cursor !== null && (
            <button
              type="button"
              className="m-acao"
              style={CONTORNO}
              disabled={buscando}
              onClick={() => {
                void mostrarMais();
              }}
            >
              Mostrar mais
            </button>
          )}
          <button
            type="button"
            className="m-lista-completa"
            onClick={() => {
              ir('/recall/frases');
            }}
          >
            Abrir a lista completa
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

/**
 * O Caderno de Frases. Existe só enquanto aberto: quem o abre o monta, e ele chama `aoFechar` depois que a folha desceu.
 * `foco` é a Frase que a busca do Varal achou: a folha abre rolada até ela.
 */
export function CadernoM({ aoFechar, foco }: { aoFechar: () => void; foco?: string | undefined }) {
  const idDoTitulo = useId();
  return (
    <FolhaM aberta aoFechar={aoFechar} idDoTitulo={idDoTitulo} classeDoCorpo="m-caderno">
      {(fechar) => <ConteudoDoCaderno idDoTitulo={idDoTitulo} foco={foco} fechar={fechar} />}
    </FolhaM>
  );
}
