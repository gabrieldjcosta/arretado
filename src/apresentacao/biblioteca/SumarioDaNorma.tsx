import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LIMITE_MAXIMO_PAGINA, type Repositorio } from '../../core/persistencia';
import { lerNos, type NormaAberta } from '../../dominios/legislacao/leitor';
import { Dialogo } from '../componentes/Dialogo';
import { ItemDaEstrutura } from './EstruturaDaNorma';
import {
  blocosEmOrdem,
  estadoDoBloco,
  noDoNome,
  nomeDoTexto,
  RAIZ,
  type BlocoDoSumario,
  type IndiceDaEstrutura,
} from './estrutura';
import './estrutura.css';

/** O recuo da lista vai até aqui: parte, livro, título, capítulo e seção já são cinco degraus. */
const NIVEL_MAXIMO = 4;
const SEM_NOMES: ReadonlyMap<number, string> = new Map();

/**
 * Os nomes de todos os blocos, lidos uma vez, na primeira vez que o sumário abre: uma leitura por lote de
 * 200, só dos nós que guardam os nomes. Sem eles o sumário segue útil, só com os rótulos; se a leitura
 * falha, a abertura seguinte tenta de novo.
 */
function useNomesDosBlocos(
  repo: Repositorio,
  aberta: NormaAberta,
  blocos: readonly BlocoDoSumario[],
  ligado: boolean,
): ReadonlyMap<number, string> {
  const [nomes, setNomes] = useState<ReadonlyMap<number, string> | undefined>(undefined);
  useEffect(() => {
    if (!ligado || nomes) return;
    let vivo = true;
    const ler = async () => {
      const lidos = new Map<number, string>();
      for (let i = 0; i < blocos.length; i += LIMITE_MAXIMO_PAGINA) {
        const blocoDoNo = new Map(
          blocos
            .slice(i, i + LIMITE_MAXIMO_PAGINA)
            .map(({ bloco }) => [noDoNome(aberta.nos, bloco), bloco]),
        );
        for (const item of await lerNos(repo, aberta, [...blocoDoNo.keys()])) {
          const bloco = blocoDoNo.get(item.indice);
          if (bloco !== undefined) lidos.set(bloco, nomeDoTexto(item.texto));
        }
      }
      if (vivo) setNomes(lidos);
    };
    ler().catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [ligado, nomes, repo, aberta, blocos]);
  return nomes ?? SEM_NOMES;
}

/**
 * O sumário da norma numa folha (o celular não tem largura para o painel ao lado do texto, e no modo foco o
 * painel sai da tela): todos os blocos, na ordem da lei, cada um com o ponto de luz do que já foi lido e o de
 * agora marcado, no meio da lista e com o foco. Tocar leva o bloco ao alto da tela e fecha a folha. Abre pelo
 * "⋯" do Leitor e pela bandeja do modo foco. Não é o "Sumário da importação" (o resumo do rascunho).
 */
export function SumarioDaNorma({
  aberto,
  aoFechar,
  repo,
  aberta,
  estrutura,
  lidoAte,
  noDaLeitura,
  ir,
}: {
  aberto: boolean;
  aoFechar: () => void;
  repo: Repositorio;
  aberta: NormaAberta;
  estrutura: IndiceDaEstrutura;
  /** Índice do nó do "lido até", se há. */
  lidoAte: number | undefined;
  /** Índice do nó da leitura (ver `EstruturaDaNorma`), se há. */
  noDaLeitura: () => number | undefined;
  /** Leva o bloco ao alto da tela; quem chama fecha a folha. */
  ir: (indice: number) => void;
}) {
  const idDoTitulo = useId();
  const blocos = useMemo(() => blocosEmOrdem(estrutura), [estrutura]);
  const nomes = useNomesDosBlocos(repo, aberta, blocos, aberto);
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      idDoTitulo={idDoTitulo}
      classe="folha-de-baixo dialogo-sumario"
      tocarForaFecha
    >
      <div className="cabeca-da-folha">
        <h2 id={idDoTitulo}>Sumário</h2>
        <button type="button" className="botao-texto" onClick={aoFechar}>
          Fechar
        </button>
      </div>
      <ListaDoSumario
        aberta={aberta}
        estrutura={estrutura}
        blocos={blocos}
        nomes={nomes}
        lidoAte={lidoAte}
        noDaLeitura={noDaLeitura}
        ir={ir}
      />
    </Dialogo>
  );
}

/** A lista do sumário: monta quando a folha abre, e é aí que ela lê onde a leitura está. */
function ListaDoSumario({
  aberta,
  estrutura,
  blocos,
  nomes,
  lidoAte,
  noDaLeitura,
  ir,
}: {
  aberta: NormaAberta;
  estrutura: IndiceDaEstrutura;
  blocos: readonly BlocoDoSumario[];
  nomes: ReadonlyMap<number, string>;
  lidoAte: number | undefined;
  noDaLeitura: () => number | undefined;
  ir: (indice: number) => void;
}) {
  // O bloco de agora é o do instante em que a folha abriu: com ela aberta a página não rola.
  const [aqui] = useState(() => {
    const no = noDaLeitura();
    return no === undefined ? RAIZ : (estrutura.dentroDe[no] ?? RAIZ);
  });
  const lista = useRef<HTMLOListElement>(null);
  // O bloco de agora abre no meio da lista: é dali que a pessoa parte. Rola só a lista, por salto, e de novo
  // quando os nomes chegam, que mudam a altura das linhas.
  useEffect(() => {
    const caixa = lista.current;
    const atual = caixa?.querySelector<HTMLElement>('[data-aqui]');
    if (!caixa || !atual) return;
    const topo =
      atual.getBoundingClientRect().top - caixa.getBoundingClientRect().top + caixa.scrollTop;
    caixa.scrollTop = topo - (caixa.clientHeight - atual.offsetHeight) / 2;
  }, [nomes]);
  // O foco começa no bloco de agora (sem ele, no "Fechar", que é o primeiro controle da folha).
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>('[data-aqui]')?.focus({ preventScroll: true });
  }, []);

  return (
    <ol ref={lista} className="sumario-da-norma">
      {blocos.map(({ bloco, nivel }) => (
        <li key={bloco}>
          <ItemDaEstrutura
            rotulo={aberta.nos[bloco]?.dispositivo.rotulo}
            nome={nomes.get(bloco) ?? ''}
            estado={estadoDoBloco(estrutura, bloco, lidoAte)}
            aqui={bloco === aqui}
            nivel={Math.min(nivel, NIVEL_MAXIMO)}
            aoIr={() => {
              ir(bloco);
            }}
          />
        </li>
      ))}
    </ol>
  );
}
