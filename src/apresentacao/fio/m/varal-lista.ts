// A lista de um folheto como o mockup a monta (`listarFolheto`): os fixados no alto primeiro, depois a ordem escolhida, em
// blocos por disciplina se a pessoa pediu. É conta pura: recebe as linhas e a organização e devolve o que desenhar.
import { OUTROS } from '../../../dominios/acervo/vinculos';
import { ORDENS, type Ordem, type Organizacao, type Vista } from './organizar';

/** Uma linha de folheto: o nome e o que o Organizar pode pôr à vista dele. */
export interface LinhaDoFolheto {
  id: string;
  nome: string;
  /** Em ordem alfabética; vazio = sem disciplina. */
  disciplinas: readonly string[];
  /** Quantos artigos caem (o Mapa) ou quantos itens a coleção tem; `undefined` sem o dado. */
  cai: number | undefined;
  /** O texto da vista "O que cai"; `undefined` sem o dado (a linha mostra a data no lugar). */
  textoCai: string | undefined;
  /** Quando foi aberta por último (ms); 0 se nunca. É o que a ordem "Recentes" usa. */
  recencia: number;
  /** O texto da vista "Atualização": "guardada há 3 dias". */
  textoData: string;
  /** O acervo tem versão mais nova. */
  versaoNova: boolean;
  /** É a que a pessoa está lendo agora (a bolinha `marca-vez` do mockup). */
  vez: boolean;
  /** Tem endereço oficial guardado: dá para conferir com o Planalto. */
  oficial: boolean;
  /** Para onde a linha abre. */
  para: string;
}

export interface Bloco {
  /** `null` = lista sem blocos. */
  titulo: string | null;
  linhas: LinhaDoFolheto[];
}

/** A disciplina que põe a linha no bloco dela: a primeira em ordem alfabética, ou "Outros". */
export const disciplinaPrincipal = (l: LinhaDoFolheto): string => l.disciplinas[0] ?? OUTROS;

const porNome = (a: LinhaDoFolheto, b: LinhaDoFolheto) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true });
const porCai = (a: LinhaDoFolheto, b: LinhaDoFolheto) => (b.cai ?? -1) - (a.cai ?? -1);

/** Pela primeira disciplina, em ordem alfabética; quem não tem nenhuma vai para o fim (como o bloco "Outros"). */
function porDisciplina(a: LinhaDoFolheto, b: LinhaDoFolheto): number {
  const da = a.disciplinas[0];
  const db = b.disciplinas[0];
  if (da === undefined || db === undefined)
    return Number(da === undefined) - Number(db === undefined);
  return da.localeCompare(db, 'pt-BR');
}

const COMPARAR: Readonly<Record<Ordem, (a: LinhaDoFolheto, b: LinhaDoFolheto) => number>> = {
  cai: (a, b) => porCai(a, b) || porNome(a, b),
  rec: (a, b) => b.recencia - a.recencia || porNome(a, b),
  nome: porNome,
  disc: (a, b) => porDisciplina(a, b) || porCai(a, b) || porNome(a, b),
};

/** O título do bloco dos fixados (o do mockup). */
export const BLOCO_DOS_FIXADOS = 'Fixados no alto';

/**
 * O que o folheto mostra: sem as que a pessoa tirou (a menos que ela peça), os fixados no alto à frente, o resto na ordem
 * escolhida e, se pediu, em blocos por disciplina (os fixados num bloco só, no começo; "Outros" por último).
 */
export function blocosDoFolheto(
  linhas: readonly LinhaDoFolheto[],
  org: Organizacao,
  folheto: string,
): Bloco[] {
  const fixos = new Set(org.fixos[folheto] ?? []);
  const tirados = new Set(org.tirados[folheto] ?? []);
  const comparar = COMPARAR[org.ordem];
  const ordenadas = linhas
    .filter((l) => org.mostrarTirados || !tirados.has(l.id))
    .sort((a, b) => Number(fixos.has(b.id)) - Number(fixos.has(a.id)) || comparar(a, b));
  if (!org.grupo) return [{ titulo: null, linhas: ordenadas }];

  const blocos: Bloco[] = [];
  const fixas = ordenadas.filter((l) => fixos.has(l.id));
  if (fixas.length > 0) blocos.push({ titulo: BLOCO_DOS_FIXADOS, linhas: fixas });
  const doBloco = new Map<string, LinhaDoFolheto[]>();
  for (const l of ordenadas) {
    if (fixos.has(l.id)) continue;
    const d = disciplinaPrincipal(l);
    const lista = doBloco.get(d);
    if (lista) lista.push(l);
    else doBloco.set(d, [l]);
  }
  const titulos = [...doBloco.keys()].sort((a, b) =>
    a === OUTROS ? 1 : b === OUTROS ? -1 : a.localeCompare(b, 'pt-BR'),
  );
  for (const titulo of titulos) blocos.push({ titulo, linhas: doBloco.get(titulo) ?? [] });
  return blocos;
}

/**
 * A informação miúda da linha, conforme o "à vista em cada linha". Como no mockup, com a lista em blocos por disciplina a
 * vista "Disciplina" não repete o título do bloco: mostra o que cai. Sem o dado de uma vista, a linha mostra a data.
 */
export function textoDaLinha(l: LinhaDoFolheto, vista: Vista, emBlocos: boolean): string {
  const quando = l.textoData;
  const cai = l.textoCai ?? quando;
  if (vista === 'data') return l.versaoNova ? 'há versão nova no acervo' : quando;
  if (vista === 'disc' && !emBlocos) {
    return l.disciplinas.length > 0 ? l.disciplinas.join(', ') : 'sem disciplina';
  }
  return cai;
}

/** O que vai sob o título do folheto: "7 · o que mais cai", ou "2 escolhidos" na hora de escolher vários. */
export function subtituloDoFolheto(total: number, ordem: Ordem, escolhidos: number | null): string {
  if (escolhidos !== null) return `${String(escolhidos)} escolhido${escolhidos === 1 ? '' : 's'}`;
  return `${String(total)} · ${ORDENS[ordem].toLowerCase()}`;
}

const DIA = 86_400_000;

/** "hoje", "ontem", "há 3 dias", "há 2 meses": quanto faz desde `quando`; `undefined` se a data não se lê. */
export function haQuantoTempo(quando: string | undefined, agora: Date): string | undefined {
  if (quando === undefined) return undefined;
  const t = Date.parse(quando);
  if (Number.isNaN(t)) return undefined;
  const dias = Math.max(0, Math.floor((agora.getTime() - t) / DIA));
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${String(dias)} dias`;
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return `há ${String(meses)} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  const anos = Math.floor(dias / 365);
  return `há ${String(anos)} ${anos === 1 ? 'ano' : 'anos'}`;
}

/** Soma de itens em português: "1 súmula", "12 súmulas". */
export const contar = (n: number, um: string, varios: string): string =>
  `${String(n)} ${n === 1 ? um : varios}`;
