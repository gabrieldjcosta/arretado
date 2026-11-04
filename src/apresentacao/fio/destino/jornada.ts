// O que o mapa do Destino mostra, a partir do que o Fio sabe (D-D25). Cada matéria do Ciclo é um estado do
// Nordeste, na ordem da jornada. O pouso abre um município no estado da matéria em que pousou; o artigo
// que cai vira um ponto no caminho, aceso quando já foi lido; a porteira do fim do Mapa fica na divisa do
// estado e, aberta, faz o caminho seguir para o estado de ao lado. Puro: nada aqui lê banco nem desenha.
import type { EntradaDoFio } from '../../../dominios/fio';
import { ORDEM_UF, type DadosDoNordeste, type Uf } from './nordeste';
import {
  faixasDosEstados,
  passosDoEstado,
  portasDaTrilha,
  posicaoDoLugar,
  type Posicao,
} from './trilha';

export interface MateriaDoMapa {
  id: string;
  nome: string;
}

/** Um artigo que cai na matéria, na ordem do Mapa (o que mais cai primeiro). */
export interface ArtigoDoMapa {
  normaId: string;
  endereco: string;
  /** Como a pessoa o chama: "LEP, Art. 112". */
  rotulo: string;
  lido: boolean;
}

export interface EntradaDaJornada {
  /** As matérias do mapa, na ordem do Ciclo. Passando de nove, as últimas ficam de fora. */
  materias: readonly MateriaDoMapa[];
  /** A matéria onde a pessoa está: a do último pouso, ou a da vez enquanto não pousou nenhuma. */
  atualId?: string;
  /** Etapas pousadas por matéria. */
  pousosPorMateria: Readonly<Record<string, number>>;
  /** Matérias que já passaram pela porteira do fim do Mapa. */
  portasAbertas: readonly string[];
  /** Os artigos que caem na matéria atual, quando o Fio já os leu. */
  artigos?: readonly ArtigoDoMapa[];
  /** A matéria atual tem Mapa da norma (só então o fim do Mapa existe). */
  comMapa?: boolean;
}

export type SituacaoDoEstado = 'agora' | 'seguinte' | 'visitado' | 'sombra' | 'livre';

export interface EstadoDaJornada {
  uf: Uf;
  nome: string;
  materia?: MateriaDoMapa;
  situacao: SituacaoDoEstado;
  /** Etapas pousadas na matéria. */
  pousos: number;
  /** Quantos lugares do estado já estão abertos. */
  abertos: number;
  /** O primeiro lugar do estado na ordem do caminho e quantos lugares ele tem. */
  inicio: number;
  lugares: number;
}

export type SituacaoDaPorta = 'fechada' | 'pronta' | 'aberta';

export interface PortaDaJornada {
  x: number;
  y: number;
  seg: number;
  t: number;
  de: Uf;
  para: Uf;
  situacao: SituacaoDaPorta;
  /** A matéria que passa por ela (a do estado de onde o caminho sai). */
  materia?: MateriaDoMapa;
}

export interface EstrelaDaJornada {
  x: number;
  y: number;
  /** O diâmetro do ponto: os artigos que mais caem são maiores. */
  tam: 16 | 12 | 9;
  artigo: ArtigoDoMapa;
}

export interface Jornada {
  estados: readonly EstadoDaJornada[];
  /** O estado onde a pessoa está. Sem matéria nenhuma, o primeiro (o caminho começa nele). */
  atual: EstadoDaJornada;
  /** O lugar onde a pessoa está, na ordem do caminho. */
  aqui: number;
  /** Para cada lugar da ordem: está aberto (tem ficha)? */
  abertos: readonly boolean[];
  /** Os trechos do caminho que a pessoa já andou. */
  andado: readonly (readonly [Posicao, Posicao])[];
  /** O último lugar até onde o caminho é nítido: o fim do estado de ao lado. */
  nitidaAte: number;
  portas: readonly PortaDaJornada[];
  estrelas: readonly EstrelaDaJornada[];
  /** Artigos que caem na matéria atual e quantos já foram lidos (todos, não só os que têm ponto). */
  total: number;
  lidos: number;
  /** Matérias que não couberam nos nove estados. */
  foraDoMapa: number;
}

/**
 * As matérias do mapa na ordem do Ciclo: primeiro as dos blocos, sem repetir, depois as outras na ordem
 * em que o app as lista. A ordem é estável, então Maranhão é sempre a mesma matéria.
 */
export function materiasDoMapa(entrada: Pick<EntradaDoFio, 'materias' | 'ciclo'>): MateriaDoMapa[] {
  const porId = new Map(entrada.materias.map((m) => [m.id, m]));
  const vistas = new Set<string>();
  const ordem: MateriaDoMapa[] = [];
  const pegar = (id: string) => {
    const m = porId.get(id);
    if (!m || vistas.has(id)) return;
    vistas.add(id);
    ordem.push({ id: m.id, nome: m.nome });
  };
  for (const id of entrada.ciclo?.blocos ?? []) pegar(id);
  for (const m of entrada.materias) pegar(m.id);
  return ordem;
}

const tamanhoDoPonto = (posicaoNaOrdem: number): 16 | 12 | 9 =>
  posicaoNaOrdem < 2 ? 16 : posicaoNaOrdem < 10 ? 12 : 9;

export function montarJornada(dados: DadosDoNordeste, entrada: EntradaDaJornada): Jornada {
  const ordem = dados.ordem;
  const faixas = faixasDosEstados(ordem);
  const materias = entrada.materias.slice(0, ORDEM_UF.length);
  const indiceAtual = Math.max(
    0,
    materias.findIndex((m) => m.id === entrada.atualId),
  );

  const estados: EstadoDaJornada[] = ORDEM_UF.map((uf, i) => {
    const materia = materias[i];
    const faixa = faixas[uf];
    const pousos = materia ? Math.max(0, entrada.pousosPorMateria[materia.id] ?? 0) : 0;
    const situacao: SituacaoDoEstado = !materia
      ? 'livre'
      : i === indiceAtual
        ? 'agora'
        : i === indiceAtual + 1
          ? 'seguinte'
          : pousos > 0
            ? 'visitado'
            : 'sombra';
    // O primeiro lugar abre com o estado em uso; cada pouso na matéria abre o seguinte.
    const abre = situacao === 'agora' || pousos > 0 ? Math.min(faixa.lugares, pousos + 1) : 0;
    return {
      uf,
      nome: dados.estados[uf].nome,
      ...(materia ? { materia } : {}),
      situacao,
      pousos,
      abertos: abre,
      inicio: faixa.inicio,
      lugares: faixa.lugares,
    };
  });
  const atual = estados[indiceAtual] as EstadoDaJornada;

  const abertos = ordem.map(() => false);
  const andado: [Posicao, Posicao][] = [];
  for (const e of estados) {
    for (let j = 0; j < e.abertos; j += 1) abertos[e.inicio + j] = true;
    if (e.abertos >= 2) {
      andado.push([posicaoDoLugar(e.inicio), posicaoDoLugar(e.inicio + e.abertos - 1)]);
    }
  }

  const portasAbertas = new Set(entrada.portasAbertas);
  const dosArtigos = entrada.artigos ?? [];
  const todosLidos = dosArtigos.length > 0 && dosArtigos.every((a) => a.lido);
  const portas: PortaDaJornada[] = portasDaTrilha(ordem).map((p) => {
    const dono = estados.find((e) => e.uf === p.de);
    const materia = dono?.materia;
    const aberta = materia !== undefined && portasAbertas.has(materia.id);
    const pronta =
      !aberta && materia !== undefined && dono === atual && entrada.comMapa === true && todosLidos;
    if (aberta)
      andado.push([
        { seg: p.seg, t: 0 },
        { seg: p.seg, t: 1 },
      ]);
    return {
      x: p.x,
      y: p.y,
      seg: p.seg,
      t: p.t,
      de: p.de,
      para: p.para,
      situacao: aberta ? 'aberta' : pronta ? 'pronta' : 'fechada',
      ...(materia ? { materia } : {}),
    };
  });

  const artigos = atual.materia ? (entrada.artigos ?? []) : [];
  const passos = passosDoEstado(ordem, atual.uf);
  const estrelas: EstrelaDaJornada[] = passos.slice(0, artigos.length).map((p, k) => ({
    x: p.x,
    y: p.y,
    tam: tamanhoDoPonto(k),
    artigo: artigos[k] as ArtigoDoMapa,
  }));

  // O caminho é nítido até o fim do estado de ao lado; dali em diante, só um pontilhado.
  const seguinte = estados[indiceAtual + 1];
  const nitidaAte = seguinte
    ? seguinte.inicio + Math.max(0, seguinte.lugares - 1)
    : Math.max(0, ordem.length - 1);

  return {
    estados,
    atual,
    aqui: atual.inicio + Math.max(0, atual.abertos - 1),
    abertos,
    andado,
    nitidaAte,
    portas,
    estrelas,
    total: artigos.length,
    lidos: artigos.filter((a) => a.lido).length,
    foraDoMapa: Math.max(0, entrada.materias.length - ORDEM_UF.length),
  };
}
