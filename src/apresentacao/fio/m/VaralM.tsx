import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { useRepositorio } from '../../dados/contexto';
import { DialogoDoLembrete } from '../../hoje/DialogoDoLembrete';
import { useDadosDoFio } from '../dados/sem-vazio';
import { animar, espera, modoAgora, MOLA, useSinal } from './anima';
import { useOrganizacao, type Organizacao } from './organizar';
import { TelaM } from './TelaM';
import { avisar } from './toast';
import { acharNoVaral, type Achado } from './varal-busca';
import { carregarDadosDoVaral, type DadosDoVaral } from './varal-dados';
import { contar } from './varal-lista';

/**
 * O Varal, a tela `varal` do mockup aprovado: o que a pessoa guardou, pendurado em dois fios, seis folhetos com um número
 * miúdo e uma linha de estado, e uma busca única no alto. Cada folheto abre o seu (`/varal/normas`, `/varal/sumulas`); os que
 * ainda não têm folheto novo abrem a tela de antes, e o Lembrete abre a nota.
 */

type IdDoFolheto = 'normas' | 'sumulas' | 'textos' | 'frases' | 'cartoes' | 'lembretes';

interface Folheto {
  id: IdDoFolheto;
  nome: string;
  /** O desenho de xilogravura: um traço só, numa grade de 48 por 48 (o do mockup). */
  desenho: string;
  /** Para onde abre; sem isso o folheto abre o Lembrete, que é uma nota. */
  para?: string;
}

const LINHAS: readonly { rotulo: string; folhetos: readonly Folheto[] }[] = [
  {
    rotulo: 'O que você estuda',
    folhetos: [
      {
        id: 'normas',
        nome: 'Normas',
        desenho: 'M8 44 V12 h32 v32 M14 20 h20 M14 28 h20 M14 36 h12',
        para: '/varal/normas',
      },
      {
        id: 'sumulas',
        nome: 'Súmulas e teses',
        desenho: 'M24 8 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2 z',
        para: '/varal/sumulas',
      },
      {
        id: 'textos',
        nome: 'Meus textos',
        desenho: 'M12 8 h18 l8 8 v24 h-26 z M30 8 v8 h8',
        para: '/biblioteca/resumos',
      },
    ],
  },
  {
    rotulo: 'O que você guarda',
    folhetos: [
      {
        id: 'frases',
        nome: 'Frases',
        desenho: 'M10 14 h28 M10 24 h28 M10 34 h18 M34 34 l4 4',
        para: '/recall/frases',
      },
      {
        id: 'cartoes',
        nome: 'Cartões',
        desenho: 'M8 14 h26 v22 h-26 z M14 8 h26 v22',
        para: '/recall/cartoes',
      },
      {
        id: 'lembretes',
        nome: 'Lembretes',
        desenho: 'M24 8 a12 12 0 1 0 0.1 0 M24 14 v10 l6 4',
      },
    ],
  },
];

/** A inclinação de cada folheto no fio (a `ROT` do mockup): nenhum é reto, e nenhum se repete ao lado do outro. */
const INCLINACAO = [-1.5, 1.2, -0.8, 1.4, -1.2, 0.9] as const;

/** O número miúdo e a linha de estado de cada folheto, do que o app guarda (o mockup tem números de enfeite). */
function resumoDoFolheto(
  id: IdDoFolheto,
  d: DadosDoVaral | undefined,
  org: Organizacao,
): { quantos: number; estado: string } {
  // O que a pessoa tirou do varal neste aparelho não conta.
  const sem = (ids: readonly string[], folheto: string) => {
    const tirados = new Set(org.tirados[folheto] ?? []);
    return ids.filter((x) => !tirados.has(x)).length;
  };
  switch (id) {
    case 'normas': {
      const quantos = sem(d?.normaIds ?? [], 'normas');
      return {
        quantos,
        estado: d?.retomar
          ? `Retomar: ${d.retomar}`
          : quantos > 0
            ? 'as leis do seu estudo'
            : 'puxe uma do acervo',
      };
    }
    case 'sumulas':
      return { quantos: sem(d?.colecaoIds ?? [], 'sumulas'), estado: 'do acervo' };
    case 'textos': {
      const quantos = d?.textos ?? 0;
      return { quantos, estado: quantos > 0 ? 'resumos e precedentes' : 'cole seu material' };
    }
    case 'frases':
      return {
        quantos: d?.frases ?? 0,
        estado: d?.frasesVencidas
          ? contar(d.frasesVencidas, 'vence hoje', 'vencem hoje')
          : 'as certas, tiradas da lei',
      };
    case 'cartoes':
      return {
        quantos: d?.cartoes ?? 0,
        estado: d?.cartoesVencidos ? `${String(d.cartoesVencidos)} para hoje` : 'sem pressa',
      };
    case 'lembretes':
      return { quantos: d?.lembrete ? 1 : 0, estado: 'uma nota rápida' };
  }
}

/** O fio de uma linha (o `.varal-fio` do mockup): a curva e o brilho dela. */
function FioDaLinha() {
  return (
    <svg className="m-varal-fio" viewBox="0 0 900 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 6 Q450 34 900 6" fill="none" stroke="#c9d4ea" strokeWidth="1.6" />
      <path
        className="m-brilho"
        d="M0 6 Q450 34 900 6"
        fill="none"
        stroke="#39caef"
        strokeWidth="5"
        opacity=".25"
      />
    </svg>
  );
}

/** A busca única do alto do Varal: "112 LEP" abre o artigo, "711" lista a súmula, uma palavra lista as normas. */
function Busca({
  aoAbrir,
  aoBuscar,
}: {
  aoAbrir: (para: string) => void;
  /** Avisa quando há (ou deixa de haver) algo digitado: com ele, a lista de achados toma o lugar dos fios. */
  aoBuscar: (buscando: boolean) => void;
}) {
  const repo = useRepositorio();
  const org = useOrganizacao();
  const [texto, setTexto] = useState('');
  const [achados, setAchados] = useState<readonly Achado[] | null>(null);
  const tirados = useMemo(
    () => new Set(Object.values(org.tirados).flatMap((ids) => ids)),
    [org.tirados],
  );
  const consulta = texto.trim();

  useEffect(() => {
    aoBuscar(consulta !== '');
  }, [consulta, aoBuscar]);

  useEffect(() => {
    if (consulta === '') return;
    let ativo = true;
    const id = window.setTimeout(() => {
      acharNoVaral(repo, consulta, tirados).then(
        (r) => {
          if (ativo) setAchados(r);
        },
        () => {
          if (ativo) setAchados([]);
        },
      );
    }, 250);
    return () => {
      ativo = false;
      window.clearTimeout(id);
    };
  }, [repo, consulta, tirados]);

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const primeiro = consulta === '' ? undefined : achados?.[0];
    if (primeiro) aoAbrir(primeiro.para);
    else if (consulta === '') avisar('Digite um artigo, uma súmula ou uma palavra.');
  };

  return (
    <>
      <label className="m-busca-varal">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          type="search"
          placeholder="Achar artigo, súmula, Frase…"
          aria-label="Buscar no Varal"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            // Mudou o texto: o que se achou para o de antes não vale mais.
            setAchados(null);
          }}
          onKeyDown={aoTeclar}
        />
      </label>
      {consulta !== '' && (
        <div className="m-lista-folheto" aria-label="O que o Varal achou" role="region">
          <p className="m-so-leitor" role="status">
            {achados === null
              ? 'Buscando.'
              : achados.length === 0
                ? 'Nada achado.'
                : contar(achados.length, 'achado', 'achados')}
          </p>
          {achados?.length === 0 && (
            <p className="m-quieto">
              Nada achado para “{consulta}”. Tente o número ou uma palavra do nome.
            </p>
          )}
          {achados?.map((a) => (
            <div className="m-linha-item" key={a.chave}>
              <span className="m-caixa" aria-hidden="true" />
              <button
                type="button"
                className="m-abre"
                onClick={() => {
                  aoAbrir(a.para);
                }}
              >
                <span className="m-nome">{a.nome}</span>
                <span className="m-sec">{a.detalhe}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function VaralM() {
  const navegar = useNavigate();
  const org = useOrganizacao();
  const { dados } = useDadosDoFio('varal', carregarDadosDoVaral);
  const sinal = useSinal();
  const varal = useRef<HTMLDivElement>(null);
  const [lembrando, setLembrando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  // O folheto é um pedaço à parte: pedido já aqui, abre sem esperar quando a pessoa toca num folheto.
  useEffect(() => {
    void import('./FolhetoM').catch(() => undefined);
  }, []);

  // Os folhetos descem do fio um a um, com a mola (só no Vivo, como o mockup).
  useLayoutEffect(() => {
    if (modoAgora() !== 'normal') return;
    varal.current?.querySelectorAll<HTMLElement>('.m-folheto').forEach((b, i) => {
      void animar(
        b,
        [
          { transform: 'translateY(-40px) rotate(0deg)', opacity: 0 },
          { transform: `rotate(${String(INCLINACAO[i] ?? 0)}deg)`, opacity: 1 },
        ],
        { duration: 600, delay: i * 70, easing: MOLA },
      );
    });
  }, []);

  const abrir = async (f: Folheto, botao: HTMLElement, graus: number) => {
    const normal = modoAgora() === 'normal';
    if (normal) {
      void animar(
        botao,
        [
          { transform: `rotate(${String(graus)}deg)` },
          { transform: 'rotate(7deg)' },
          { transform: 'rotate(-4deg)' },
          { transform: `rotate(${String(graus)}deg)` },
        ],
        { duration: 700, easing: 'ease-out' },
      );
    }
    if (f.para === undefined) {
      setLembrando(true);
      return;
    }
    // O folheto balança um instante antes de abrir (o mockup espera 220 ms).
    if (normal) {
      await espera(220, sinal());
      if (sinal().aborted) return;
    }
    void navegar(f.para);
  };

  let posicao = 0;
  return (
    <TelaM nome="varal" className="m-com-nav">
      <h1 className="m-so-leitor">Varal</h1>
      <span className="m-olho">Varal</span>
      <h2 style={{ marginTop: 8 }}>O que você guardou, pendurado no fio.</h2>
      <Busca
        aoAbrir={(para) => {
          void navegar(para);
        }}
        aoBuscar={setBuscando}
      />
      <div className="m-varal" ref={varal} hidden={buscando}>
        {LINHAS.map((linha) => (
          <div className="m-varal-linha" key={linha.rotulo} role="group" aria-label={linha.rotulo}>
            <FioDaLinha />
            <span className="m-varal-rotulo">{linha.rotulo}</span>
            {linha.folhetos.map((f) => {
              const graus = INCLINACAO[posicao++] ?? 0;
              const { quantos, estado } = resumoDoFolheto(f.id, dados, org);
              return (
                <button
                  key={f.id}
                  type="button"
                  className="m-folheto"
                  style={{ transform: `rotate(${String(graus)}deg)` }}
                  onClick={(e) => {
                    void abrir(f, e.currentTarget, graus);
                  }}
                >
                  {/* Sem `aria-label`: o nome vem do texto visível ("2 Normas as leis do seu estudo"), como pede o WCAG 2.5.3
                      (o `aria-label` do mockup, "Normas: 2 · …", não contém o texto que se vê; desvio 38). */}
                  {quantos > 0 && (
                    <span className="m-conta-f">{quantos > 99 ? '99+' : quantos}</span>
                  )}
                  <span className="m-xilo">
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path d={f.desenho} />
                    </svg>
                  </span>
                  <strong>{f.nome}</strong>
                  <span className="m-estado">{estado}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <DialogoDoLembrete
        aberto={lembrando}
        aoFechar={() => {
          setLembrando(false);
        }}
      />
    </TelaM>
  );
}
