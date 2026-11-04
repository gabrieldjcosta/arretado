import { useId, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import { listarResumos } from '../../../dominios/notas/resumos';
import { contarFrasesVencidas, contarVencidos } from '../../../dominios/recall/servico';
import { useDados } from '../../dados/contexto';
import { DialogoDoLembrete } from '../../hoje/DialogoDoLembrete';
import './fio-varal.css';

/** O que cada folheto mostra no pé: um número miúdo e uma linha de estado (D-D25, "Dentro do Varal"). */
interface Contagens {
  normas: number;
  textos: number;
  frases: number;
  frasesVencidas: number;
  cartoes: number;
  cartoesVencidos: number;
}

async function carregarContagens(repo: Repositorio): Promise<Contagens> {
  const [normas, resumos, precedentes, frases, frasesVencidas, cartoes, cartoesVencidos] =
    await Promise.all([
      repo.colecao('normas').contar(),
      listarResumos(repo),
      repo.colecao('precedentes').contar(),
      repo.colecao('frases').contar(),
      contarFrasesVencidas(repo),
      repo.colecao('cartoes').contar(),
      contarVencidos(repo),
    ]);
  return {
    normas,
    textos: resumos.length + precedentes,
    frases,
    frasesVencidas,
    cartoes,
    cartoesVencidos,
  };
}

/** A inclinação de cada folheto no fio: nenhum é reto, e nenhum se repete ao lado do outro. */
const INCLINACAO = [-1.5, 1.2, -0.8, 1.4, -1.2, 0.9] as const;

type Folheto = {
  id: string;
  nome: string;
  /** Rota do que abre; sem ela o folheto abre o Lembrete, que é um diálogo. */
  caminho?: string;
  /** O desenho de xilogravura: um traço só, numa grade de 48 por 48. */
  desenho: string;
  quantos?: number;
  estado: string;
};

const DESENHOS = {
  normas: 'M8 44 V12 h32 v32 M14 20 h20 M14 28 h20 M14 36 h12',
  sumulas: 'M24 8 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2 z',
  textos: 'M12 8 h18 l8 8 v24 h-26 z M30 8 v8 h8',
  frases: 'M10 14 h28 M10 24 h28 M10 34 h18 M34 34 l4 4',
  cartoes: 'M8 14 h26 v22 h-26 z M14 8 h26 v22',
  lembretes: 'M24 8 a12 12 0 1 0 0.1 0 M24 14 v10 l6 4',
} as const;

/** Os dois varais: o que a pessoa estuda e o que ela guarda. Cada folheto abre a tela de hoje dele. */
function folhetos(c: Contagens | undefined): {
  rotulo: string;
  itens: readonly Folheto[];
}[] {
  const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;
  return [
    {
      rotulo: 'O que você estuda',
      itens: [
        {
          id: 'normas',
          nome: 'Normas',
          caminho: '/biblioteca',
          desenho: DESENHOS.normas,
          ...(c?.normas ? { quantos: c.normas } : {}),
          estado: 'as leis que você leu',
        },
        {
          id: 'sumulas',
          nome: 'Súmulas e teses',
          caminho: '/biblioteca/sumulas',
          desenho: DESENHOS.sumulas,
          estado: 'do acervo',
        },
        {
          id: 'textos',
          nome: 'Meus textos',
          caminho: '/biblioteca/resumos',
          desenho: DESENHOS.textos,
          ...(c?.textos ? { quantos: c.textos } : {}),
          estado: c?.textos ? 'resumos e precedentes' : 'cole seu material',
        },
      ],
    },
    {
      rotulo: 'O que você guarda',
      itens: [
        {
          id: 'frases',
          nome: 'Frases',
          caminho: '/recall/frases',
          desenho: DESENHOS.frases,
          ...(c?.frases ? { quantos: c.frases } : {}),
          estado: c?.frasesVencidas
            ? plural(c.frasesVencidas, 'vence hoje', 'vencem hoje')
            : 'as certas, tiradas da lei',
        },
        {
          id: 'cartoes',
          nome: 'Cartões',
          caminho: '/recall/cartoes',
          desenho: DESENHOS.cartoes,
          ...(c?.cartoes ? { quantos: c.cartoes } : {}),
          estado: c?.cartoesVencidos
            ? plural(c.cartoesVencidos, 'para hoje', 'para hoje')
            : 'sem pressa',
        },
        {
          id: 'lembretes',
          nome: 'Lembretes',
          desenho: DESENHOS.lembretes,
          estado: 'uma nota rápida',
        },
      ],
    },
  ];
}

function Corpo({
  folheto,
  posicao,
  aoLembrete,
}: {
  folheto: Folheto;
  posicao: number;
  aoLembrete: () => void;
}) {
  const conteudo = (
    <>
      {folheto.quantos !== undefined && (
        <>
          <span className="conta-f">{folheto.quantos > 99 ? '99+' : folheto.quantos}</span>{' '}
        </>
      )}
      <span className="xilo">
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path d={folheto.desenho} />
        </svg>
      </span>
      <strong>{folheto.nome}</strong> <span className="estado">{folheto.estado}</span>
    </>
  );
  const estilo = {
    '--i': posicao,
    '--rot': `${String(INCLINACAO[posicao] ?? 0)}deg`,
  } as CSSProperties;
  return folheto.caminho ? (
    <Link className="folheto" to={folheto.caminho} style={estilo}>
      {conteudo}
    </Link>
  ) : (
    <button type="button" className="folheto" style={estilo} onClick={aoLembrete}>
      {conteudo}
    </button>
  );
}

/**
 * O Varal (D-D25): o que é da pessoa, pendurado no fio. Seis folhetos em duas linhas, cada um com um número
 * miúdo e uma linha de estado. Nesta primeira versão cada folheto abre a tela de hoje dele (o interior novo
 * vem na fatia do Varal); o Lembrete abre o diálogo do "+". A busca única também vem depois.
 */
export function Varal() {
  const { dados } = useDados(carregarContagens);
  const [lembrando, setLembrando] = useState(false);
  const titulo = useId();
  const linhas = folhetos(dados);
  let posicao = 0;
  return (
    <section className="fio-varal" aria-labelledby={titulo}>
      <span className="fio-olho">Varal</span>
      <h1 id={titulo} className="fio-titulo fio-titulo-2">
        O que você guardou, pendurado no fio.
      </h1>
      <div className="varal">
        {linhas.map((linha) => (
          <div className="varal-linha" key={linha.rotulo} role="group" aria-label={linha.rotulo}>
            <svg
              className="varal-fio"
              viewBox="0 0 900 40"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M0 6 Q450 34 900 6" className="varal-fio-linha" />
              <path d="M0 6 Q450 34 900 6" className="varal-fio-brilho" />
            </svg>
            <span className="varal-rotulo">{linha.rotulo}</span>
            {linha.itens.map((f) => (
              <Corpo
                key={f.id}
                folheto={f}
                posicao={posicao++}
                aoLembrete={() => {
                  setLembrando(true);
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <DialogoDoLembrete
        aberto={lembrando}
        aoFechar={() => {
          setLembrando(false);
        }}
      />
    </section>
  );
}
