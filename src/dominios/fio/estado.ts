// O Fio no aparelho: puxar, abrir, concluir, pular e pousar. Funções puras sobre `EstadoDoFio`; a
// tela guarda o resultado (JSON, sem esquema). Regras 4 (Guardar só depois de erro) e 10 (pular não
// custa nada e não volta na mesma etapa; parar salva o passo aberto) moram aqui.
import { cota, planejarEtapa } from './gerador';
import { fatosDoPouso } from './fatos';
import type {
  EntradaDoFio,
  EstadoDoFio,
  Etapa,
  Fechamento,
  Passo,
  Pouso,
  ResultadoDoPasso,
  TipoDePasso,
} from './tipos';

/** Quantos pousos o estado guarda (a linha de retorno mostra os últimos). */
export const POUSOS_GUARDADOS = 10;

export function estadoInicial(): EstadoDoFio {
  return {
    versao: 1,
    etapasFeitas: 0,
    passosDados: 0,
    etapasPorMateria: {},
    porteirasDoFim: [],
    pousos: [],
  };
}

export type ProximoDoFio =
  | {
      tipo: 'passo';
      passo: Passo;
      /** Índice em `etapa.passos`. */
      indice: number;
      /** Posição na fileira de pontos, a partir de 1 (o Guardar divide o ponto do Lembrar). */
      posicao: number;
      /** Tamanho da fileira (passos da etapa sem o Guardar). */
      de: number;
      /** A pessoa parou neste passo; o puxão o retoma. */
      retomar: boolean;
    }
  | { tipo: 'pouso'; pouso: Pouso }
  /** O app não conhece nenhuma matéria: a tela leva à escolha da prova. */
  | { tipo: 'sem_materia' };

const pendente = (e: Etapa) => e.fechados.findIndex((f) => f === undefined);

function posicaoNaFileira(e: Etapa, indice: number): { posicao: number; de: number } {
  const contam = (ps: readonly Passo[]) => ps.filter((p) => p.tipo !== 'guardar').length;
  const antes = contam(e.passos.slice(0, indice));
  return {
    posicao: e.passos[indice]?.tipo === 'guardar' ? Math.max(1, antes) : antes + 1,
    de: contam(e.passos),
  };
}

/** A leitura fora do Fio já cobriu o Ler planejado: o passo nasce "Já feito". */
function lerJaFeito(p: Passo, entrada: EntradaDoFio): boolean {
  if (p.tipo !== 'ler' || 'adicionarNorma' in p) return false;
  const norma = entrada.materias
    .find((m) => m.id === p.materiaId)
    ?.normas.find((n) => n.id === p.normaId);
  if (!norma) return false;
  const lidos = new Set(norma.artigos.filter((a) => a.lido).map((a) => a.endereco));
  return p.artigos.length > 0 && p.artigos.every((a) => lidos.has(a.endereco));
}

function fechar(estado: EstadoDoFio, e: Etapa, indices: number[], f: Fechamento): EstadoDoFio {
  const fechados = [...e.fechados];
  let dados = 0;
  for (const i of indices) {
    if (i < 0 || i >= fechados.length || fechados[i] !== undefined) continue;
    fechados[i] = f;
    dados += 1;
  }
  const etapa: Etapa = { ...e, fechados };
  delete etapa.aberto;
  return { ...estado, passosDados: estado.passosDados + dados, etapa };
}

/**
 * O puxão: a etapa em curso (ou uma nova, planejada agora) e o próximo passo dela, ou o pouso
 * quando todos fecharam. Devolve também o estado, que muda ao planejar e ao marcar "Já feito".
 */
export function puxar(
  estado: EstadoDoFio,
  entrada: EntradaDoFio,
): { estado: EstadoDoFio; proximo: ProximoDoFio } {
  let atual = estado;
  if (!atual.etapa) {
    const nova = planejarEtapa(entrada, atual);
    if (!nova) return { estado: atual, proximo: { tipo: 'sem_materia' } };
    atual = { ...atual, etapa: nova };
  }
  for (;;) {
    const e = atual.etapa as Etapa;
    const i = pendente(e);
    if (i < 0) {
      return {
        estado: atual,
        proximo: {
          tipo: 'pouso',
          pouso: {
            etapa: e.numero,
            materia: e.materia,
            materiaId: e.materiaId,
            fatos: fatosDoPouso(e),
          },
        },
      };
    }
    const passo = e.passos[i] as Passo;
    if (lerJaFeito(passo, entrada)) {
      atual = fechar(atual, e, [i], { como: 'ja_feito' });
      continue;
    }
    return {
      estado: atual,
      proximo: {
        tipo: 'passo',
        passo,
        indice: i,
        ...posicaoNaFileira(e, i),
        retomar: e.aberto === i,
      },
    };
  }
}

/** A pessoa entrou no passo: se ela parar, o próximo puxão o retoma. */
export function abrirPasso(estado: EstadoDoFio): EstadoDoFio {
  const e = estado.etapa;
  if (!e) return estado;
  const i = pendente(e);
  if (i < 0 || e.aberto === i) return estado;
  return { ...estado, etapa: { ...e, aberto: i } };
}

/** Fecha o passo da vez com o que a pessoa fez. Um resultado de outro tipo é ignorado. */
export function concluirPasso(estado: EstadoDoFio, resultado: ResultadoDoPasso): EstadoDoFio {
  const e = estado.etapa;
  if (!e) return estado;
  const i = pendente(e);
  const passo = e.passos[i];
  if (i < 0 || !passo || passo.tipo !== resultado.tipo) return estado;
  let depois = fechar(estado, e, [i], { como: 'feito', resultado });

  // Regra 4: Lembrar com erro puxa Guardar logo depois, só com os artigos do próprio Lembrar.
  if (passo.tipo === 'lembrar' && resultado.tipo === 'lembrar') {
    const doLembrar = new Set(passo.artigos.map((a) => a.endereco));
    const enderecos = [...new Set(resultado.erros)]
      .filter((x) => doLembrar.has(x))
      .slice(0, cota('frases', e.numero));
    if (enderecos.length > 0) {
      const de = depois.etapa as Etapa;
      const guardar: Passo = {
        tipo: 'guardar',
        materiaId: passo.materiaId,
        normaId: passo.normaId,
        enderecos,
      };
      depois = {
        ...depois,
        etapa: {
          ...de,
          passos: [...de.passos.slice(0, i + 1), guardar, ...de.passos.slice(i + 1)],
          fechados: [...de.fechados.slice(0, i + 1), undefined, ...de.fechados.slice(i + 1)],
        },
      };
    }
  }
  return depois;
}

/** Regra 10: pular não custa nada. Pular um Ler leva junto o Lembrar dele. */
export function pularPasso(estado: EstadoDoFio): EstadoDoFio {
  const e = estado.etapa;
  if (!e) return estado;
  const i = pendente(e);
  if (i < 0) return estado;
  const passo = e.passos[i] as Passo;
  const seguinte = e.passos[i + 1];
  const levaOLembrar =
    passo.tipo === 'ler' &&
    !('adicionarNorma' in passo) &&
    seguinte?.tipo === 'lembrar' &&
    seguinte.normaId === passo.normaId;
  return fechar(estado, e, levaOLembrar ? [i, i + 1] : [i], { como: 'pulado' });
}

/**
 * O pouso fecha a etapa: conta a etapa na matéria, registra a porteira do fim (só se foi feita;
 * pulada, ela volta na próxima etapa da matéria) e guarda os fatos. Com passo pendente, nada muda.
 */
export function pousar(estado: EstadoDoFio): { estado: EstadoDoFio; pouso?: Pouso } {
  const e = estado.etapa;
  if (!e || pendente(e) >= 0) return { estado };
  const pouso: Pouso = {
    etapa: e.numero,
    materia: e.materia,
    materiaId: e.materiaId,
    fatos: fatosDoPouso(e),
  };
  const passouAPorteira =
    e.porteiraDoFim === true &&
    e.passos.some(
      (p, i) => p.tipo === 'praticar' && p.modo === 'porteira' && e.fechados[i]?.como === 'feito',
    );
  const resto: EstadoDoFio = { ...estado };
  delete resto.etapa;
  return {
    pouso,
    estado: {
      ...resto,
      etapasFeitas: estado.etapasFeitas + 1,
      etapasPorMateria: {
        ...estado.etapasPorMateria,
        [e.materiaId]: (estado.etapasPorMateria[e.materiaId] ?? 0) + 1,
      },
      porteirasDoFim:
        passouAPorteira && !estado.porteirasDoFim.includes(e.materiaId)
          ? [...estado.porteirasDoFim, e.materiaId]
          : estado.porteirasDoFim,
      pousos: [pouso, ...estado.pousos].slice(0, POUSOS_GUARDADOS),
    },
  };
}

// ---- Leitura do que o aparelho guardou: qualquer coisa vira um estado válido. ----

const TIPOS: readonly TipoDePasso[] = [
  'ler',
  'lembrar',
  'guardar',
  'revisar',
  'fixar_sumula',
  'praticar',
  'seu_passo',
];
type Obj = Record<string, unknown>;
const ehObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const ehTexto = (x: unknown): x is string => typeof x === 'string';
const ehInteiro = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const ehListaDe = <T>(x: unknown, f: (y: unknown) => y is T): x is T[] =>
  Array.isArray(x) && x.every(f);
const ehArtigo = (x: unknown): boolean => ehObj(x) && ehTexto(x.endereco) && ehTexto(x.rotulo);

function passoValido(x: unknown): x is Passo {
  if (!ehObj(x) || !TIPOS.includes(x.tipo as TipoDePasso) || !ehTexto(x.materiaId)) return false;
  switch (x.tipo) {
    case 'ler':
      return x.adicionarNorma === true
        ? true
        : ehTexto(x.normaId) &&
            ehTexto(x.tituloCurto) &&
            Array.isArray(x.artigos) &&
            x.artigos.every(ehArtigo) &&
            ['mapa', 'codigo', 'pesou'].includes(x.porque as string);
    case 'lembrar':
      return (
        ehTexto(x.normaId) &&
        ehTexto(x.tituloCurto) &&
        Array.isArray(x.artigos) &&
        x.artigos.every(ehArtigo)
      );
    case 'guardar':
      return ehTexto(x.normaId) && ehListaDe(x.enderecos, ehTexto);
    case 'revisar':
      return ehInteiro(x.quantidade);
    case 'fixar_sumula':
      return ehTexto(x.sumulaId) && ehTexto(x.rotulo);
    case 'praticar':
      return (
        (x.modo === 'porteira' || x.modo === 'ache_o_erro') &&
        ehInteiro(x.quantidade) &&
        ['fim_do_mapa', 'quarta_etapa', 'reta_final', 'complemento'].includes(x.porque as string)
      );
    default:
      return ehTexto(x.tarefaId) && ehTexto(x.titulo);
  }
}

function fechamentoValido(x: unknown, p: Passo): boolean {
  if (x === undefined || x === null) return true;
  if (!ehObj(x)) return false;
  if (x.como === 'pulado' || x.como === 'ja_feito') return true;
  return x.como === 'feito' && ehObj(x.resultado) && x.resultado.tipo === p.tipo;
}

function etapaValida(x: unknown): Etapa | undefined {
  if (!ehObj(x) || !ehInteiro(x.numero) || !ehTexto(x.materiaId) || !ehTexto(x.materia)) {
    return undefined;
  }
  if (!ehListaDe(x.passos, passoValido) || x.passos.length === 0) return undefined;
  const passos = x.passos;
  const brutos: unknown[] = Array.isArray(x.fechados) ? x.fechados : [];
  if (brutos.length > passos.length) return undefined;
  if (!passos.every((p, i) => fechamentoValido(brutos[i], p))) return undefined;
  const fechados = passos.map((_, i) => (brutos[i] ?? undefined) as Fechamento | undefined);
  const aberto =
    ehInteiro(x.aberto) && x.aberto < passos.length && fechados[x.aberto] === undefined
      ? x.aberto
      : undefined;
  return {
    numero: x.numero,
    materiaId: x.materiaId,
    materia: x.materia,
    passos,
    fechados,
    ...(aberto !== undefined ? { aberto } : {}),
    ...(x.porteiraDoFim === true ? { porteiraDoFim: true } : {}),
  };
}

/** Lê o estado guardado. Lixo vira o estado inicial; uma etapa estragada some, os contadores ficam. */
export function lerEstadoDoFio(guardado: unknown): EstadoDoFio {
  if (!ehObj(guardado) || guardado.versao !== 1) return estadoInicial();
  const inicial = estadoInicial();
  const contagem = ehObj(guardado.etapasPorMateria)
    ? Object.fromEntries(
        Object.entries(guardado.etapasPorMateria).filter((par): par is [string, number] =>
          ehInteiro(par[1]),
        ),
      )
    : {};
  const pousos = Array.isArray(guardado.pousos)
    ? guardado.pousos
        .filter(
          (p): p is Pouso =>
            ehObj(p) && ehInteiro(p.etapa) && ehTexto(p.materia) && ehListaDe(p.fatos, ehTexto),
        )
        // `materiaId` é opcional (pousos antigos não têm); se vier estragado, some.
        .map((p): Pouso => {
          const { materiaId, ...resto } = p;
          return ehTexto(materiaId) ? { ...resto, materiaId } : resto;
        })
        .slice(0, POUSOS_GUARDADOS)
    : [];
  const etapa = etapaValida(guardado.etapa);
  return {
    versao: 1,
    etapasFeitas: ehInteiro(guardado.etapasFeitas) ? guardado.etapasFeitas : inicial.etapasFeitas,
    passosDados: ehInteiro(guardado.passosDados) ? guardado.passosDados : inicial.passosDados,
    etapasPorMateria: contagem,
    porteirasDoFim: ehListaDe(guardado.porteirasDoFim, ehTexto) ? guardado.porteirasDoFim : [],
    pousos,
    ...(etapa ? { etapa } : {}),
  };
}
