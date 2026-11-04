// Gerador do Fio: planeja a etapa seguinte a partir do que o app sabe (`EntradaDoFio`) e do estado
// do Fio no aparelho. Função pura: a mesma entrada e o mesmo estado dão sempre a mesma etapa, e o
// plano fica congelado no estado quando a etapa começa (sair e voltar nunca muda o que vem).
//
// As dez regras do plano, na ordem em que valem (o número aparece nos comentários abaixo):
//  1. Vencido vem cedo: com 8 ou mais vencidos o primeiro passo é Revisar; com menos, Revisar entra
//     no meio da etapa.
//  2. Cada etapa fica numa matéria só: o bloco seguinte do Ciclo; sem Ciclo, a última leitura; sem
//     leitura, a prova escolhida.
//  3. O artigo vem do Mapa da norma (o que mais cai primeiro); sem Mapa, a ordem do código; sem
//     norma, o Ler vira "Adicionar a lei desta matéria".
//  4. Ler puxa Lembrar logo depois (só dos artigos com grifo); Lembrar puxa Guardar só quando houve
//     erro (em `estado.ts`, ao concluir o Lembrar).
//  5. A etapa tem 3, 4 e depois 5 passos; o último nunca é Ler; o pouso fecha a etapa.
//  6. O tamanho cresce 25% por etapa até o teto; depois cresce o alcance (a próxima norma, as
//     súmulas e as teses).
//  7. A porteira só aparece no fim do que o Mapa considera relevante, ou a cada 4 etapas da matéria.
//  8. Seu passo é o quarto passo das etapas de cinco, se houver tarefa; senão, o ponto que mais
//     pesou nos erros vira uma leitura curta.
//  9. Com data da prova, nos últimos 30 dias metade das etapas troca o Ler por Revisar e Praticar.
// 10. Pular não custa nada e não volta na mesma etapa; parar salva o passo aberto (`estado.ts`).
import { diferencaEmDias } from '../../core/datas';
import type {
  ArtigoDoFio,
  ArtigoNoPasso,
  EntradaDoFio,
  EstadoDoFio,
  Etapa,
  MateriaDoFio,
  NormaDoFio,
  Passo,
  PorQueLer,
  PorQuePraticar,
} from './tipos';

export const RAZAO_DE_CRESCIMENTO = 1.25;
/** Regra 6: tetos de cada quantidade. */
export const TETO = { ler: 10, frases: 10, revisar: 12, porteira: 3 } as const;
/** Quantidades da primeira etapa. */
const BASE = { ler: 2, frases: 3, revisar: 4, porteira: 3 } as const;
/** Regra 1. */
export const LIMIAR_DE_VENCIDOS = 8;
/** Regra 9. */
export const DIAS_DA_RETA_FINAL = 30;
/** Regra 7. */
export const ETAPAS_ATE_A_PORTEIRA = 4;

export type Quantidade = keyof typeof TETO;

/** Regra 5: 3, 4 e depois 5 passos (sem contar o Guardar, que só nasce de um erro). */
export function tamanhoDaEtapa(numero: number): 3 | 4 | 5 {
  return numero <= 0 ? 3 : numero === 1 ? 4 : 5;
}

/** Regra 6: a quantidade cresce 25% por etapa até o teto. */
export function cota(tipo: Quantidade, numero: number): number {
  const n = Math.max(0, numero);
  return Math.min(TETO[tipo], Math.max(1, Math.round(BASE[tipo] * RAZAO_DE_CRESCIMENTO ** n)));
}

/** Regra 9: a passada final, nos últimos 30 dias antes da prova (o próprio dia conta). */
export function naRetaFinal(entrada: Pick<EntradaDoFio, 'hoje' | 'dataDaProva'>): boolean {
  if (entrada.dataDaProva === undefined) return false;
  const faltam = diferencaEmDias(entrada.hoje, entrada.dataDaProva);
  return Number.isFinite(faltam) && faltam >= 0 && faltam <= DIAS_DA_RETA_FINAL;
}

/** Regra 2: a matéria da etapa. */
export function escolherMateria(entrada: EntradaDoFio): MateriaDoFio | undefined {
  const porId = new Map(entrada.materias.map((m) => [m.id, m]));
  const c = entrada.ciclo;
  if (c && c.blocos.length > 0) {
    // O bloco seguinte; um bloco cuja matéria sumiu cede a vez ao próximo.
    const inicio = ((Math.floor(c.indice) % c.blocos.length) + c.blocos.length) % c.blocos.length;
    for (let k = 0; k < c.blocos.length; k++) {
      const m = porId.get(c.blocos[(inicio + k) % c.blocos.length] ?? '');
      if (m) return m;
    }
  }
  const lida = entrada.ultimaLeitura === undefined ? undefined : porId.get(entrada.ultimaLeitura);
  if (lida) return lida;
  for (const id of entrada.prova ?? []) {
    const m = porId.get(id);
    if (m) return m;
  }
  return entrada.materias[0];
}

const chave = (normaId: string, endereco: string) => `${normaId}\u0000${endereco}`;
/** A norma tem Mapa: algum artigo tem posição nele. */
export const temMapa = (n: NormaDoFio) => n.artigos.some((a) => a.posicaoNoMapa !== undefined);

/** Regra 3: o que a norma considera relevante, na ordem de leitura. Sem Mapa, tudo, na ordem do código. */
export function relevantes(n: NormaDoFio): ArtigoDoFio[] {
  if (!temMapa(n)) return [...n.artigos];
  return n.artigos
    .filter((a) => a.posicaoNoMapa !== undefined)
    .sort((a, b) => (a.posicaoNoMapa ?? 0) - (b.posicaoNoMapa ?? 0));
}

interface Leitura {
  norma: NormaDoFio;
  artigos: ArtigoDoFio[];
  porque: PorQueLer;
}

/**
 * Regras 3 e 6: os próximos artigos a ler, numa norma só. Primeiro o relevante de cada norma, na
 * ordem das normas; com `resto`, depois o que o Mapa deixou de fora, na ordem do código.
 */
function proximaLeitura(
  m: MateriaDoFio,
  quantidade: number,
  lendo: ReadonlySet<string>,
  resto: boolean,
): Leitura | undefined {
  const livre = (n: NormaDoFio) => (a: ArtigoDoFio) =>
    !a.lido && !lendo.has(chave(n.id, a.endereco));
  for (const n of m.normas) {
    const fila = relevantes(n).filter(livre(n));
    if (fila.length > 0) {
      return {
        norma: n,
        artigos: fila.slice(0, quantidade),
        porque: temMapa(n) ? 'mapa' : 'codigo',
      };
    }
  }
  if (!resto) return undefined;
  for (const n of m.normas) {
    const fila = n.artigos.filter((a) => a.posicaoNoMapa === undefined).filter(livre(n));
    if (fila.length > 0) return { norma: n, artigos: fila.slice(0, quantidade), porque: 'codigo' };
  }
  return undefined;
}

/** Regra 7: a matéria tem Mapa e nada relevante ficou sem ler (contando o que a etapa vai ler). */
function chegouAoFimDoMapa(m: MateriaDoFio, lendo: ReadonlySet<string>): boolean {
  if (!m.normas.some(temMapa)) return false;
  return m.normas.every((n) =>
    relevantes(n).every((a) => a.lido || lendo.has(chave(n.id, a.endereco))),
  );
}

const noPasso = (a: ArtigoDoFio): ArtigoNoPasso => ({ endereco: a.endereco, rotulo: a.rotulo });

/** Planeja a etapa seguinte. `undefined` só quando o app não conhece nenhuma matéria. */
export function planejarEtapa(entrada: EntradaDoFio, estado: EstadoDoFio): Etapa | undefined {
  const m = escolherMateria(entrada);
  if (!m) return undefined;
  const numero = estado.etapasFeitas;
  const tamanho = tamanhoDaEtapa(numero);
  const vencidos = Math.max(0, Math.floor(entrada.vencidos) || 0);
  const passos: Passo[] = [];
  const lendo = new Set<string>();

  let revisarUsado = false;
  let acheUsado = false;
  let fixarComoComplemento = false;
  const sumulasUsadas = new Set<string>();

  const revisar = (): Passo | undefined => {
    if (vencidos === 0 || revisarUsado) return undefined;
    revisarUsado = true;
    return {
      tipo: 'revisar',
      materiaId: m.id,
      quantidade: Math.min(cota('revisar', numero), vencidos),
    };
  };
  const fixar = (): Passo | undefined => {
    const s = m.sumulas.find((x) => !x.fixada && !sumulasUsadas.has(x.id));
    if (!s) return undefined;
    sumulasUsadas.add(s.id);
    return { tipo: 'fixar_sumula', materiaId: m.id, sumulaId: s.id, rotulo: s.rotulo };
  };
  const acheOErro = (porque: PorQuePraticar): Passo | undefined => {
    const prontos = Math.max(0, Math.floor(m.acheOErro ?? 0));
    if (prontos === 0 || acheUsado) return undefined;
    acheUsado = true;
    return {
      tipo: 'praticar',
      materiaId: m.id,
      modo: 'ache_o_erro',
      quantidade: Math.min(cota('porteira', numero), prontos),
      porque,
    };
  };
  // A porteira tira certo/errado dos grifos do que a pessoa já leu (ou vai ler nesta etapa).
  const temGrifoLido = () =>
    m.normas.some((n) =>
      n.artigos.some((a) => a.grifos > 0 && (a.lido || lendo.has(chave(n.id, a.endereco)))),
    );
  const porteira = (porque: PorQuePraticar): Passo | undefined =>
    temGrifoLido()
      ? {
          tipo: 'praticar',
          materiaId: m.id,
          modo: 'porteira',
          quantidade: cota('porteira', numero),
          porque,
        }
      : undefined;

  // Regras 3 e 4: um Ler e o Lembrar dos artigos com grifo.
  const ler = (l: Leitura): Passo[] => {
    for (const a of l.artigos) lendo.add(chave(l.norma.id, a.endereco));
    const comGrifo = l.artigos.filter((a) => a.grifos > 0);
    const base = { materiaId: m.id, normaId: l.norma.id, tituloCurto: l.norma.tituloCurto };
    return [
      { tipo: 'ler', ...base, artigos: l.artigos.map(noPasso), porque: l.porque },
      ...(comGrifo.length > 0
        ? [{ tipo: 'lembrar' as const, ...base, artigos: comGrifo.map(noPasso) }]
        : []),
    ];
  };

  // Regras 3 e 6: a leitura principal da etapa; esgotado o Mapa, o alcance cresce.
  const unidadeDeLeitura = (): Passo[] => {
    if (m.normas.length === 0) return [{ tipo: 'ler', materiaId: m.id, adicionarNorma: true }];
    const quantidade = cota('ler', numero);
    const relevante = proximaLeitura(m, quantidade, lendo, false);
    if (relevante) return ler(relevante);
    const sumula = fixar();
    if (sumula) return [sumula];
    const resto = proximaLeitura(m, quantidade, lendo, true);
    return resto ? ler(resto) : [];
  };

  const cabe = (n: number) => passos.length + n <= tamanho;
  const por = (...p: (Passo | undefined)[]) => {
    for (const x of p) if (x && cabe(1)) passos.push(x);
  };

  // Na reta final, a etapa que trocou o Ler não ganha leitura de volta pelo complemento.
  let semLeituraExtra = false;
  // Complemento de um lugar vazio, até `alvo` passos: Revisar, uma súmula, Ache o erro, mais leitura.
  const complemento = (alvo: number): Passo[] => {
    const r = revisar();
    if (r) return [r];
    if (!fixarComoComplemento) {
      const f = fixar();
      if (f) {
        fixarComoComplemento = true;
        return [f];
      }
    }
    const a = acheOErro('complemento');
    if (a) return [a];
    // A leitura extra só entra com lugar para o Lembrar dela (regra 4).
    if (!semLeituraExtra && passos.length + 2 <= alvo && m.normas.length > 0) {
      const l = proximaLeitura(m, cota('ler', numero), lendo, true);
      if (l) return ler(l);
    }
    return [];
  };
  const completarAte = (alvo: number) => {
    while (passos.length < alvo) {
      const c = complemento(alvo);
      if (c.length === 0 || passos.length + c.length > alvo) return;
      passos.push(...c);
    }
  };

  // Regra 1: muitos vencidos abrem a etapa.
  if (vencidos >= LIMIAR_DE_VENCIDOS) por(revisar());

  // Regra 9: na reta final, as etapas ímpares trocam o Ler por Revisar e Praticar.
  if (naRetaFinal(entrada) && numero % 2 === 1) {
    semLeituraExtra = true;
    por(revisar() ?? fixar());
    por(acheOErro('reta_final') ?? porteira('reta_final'));
  } else {
    for (const p of unidadeDeLeitura()) por(p);
  }

  // Regra 1: com poucos vencidos, Revisar entra no meio.
  if (vencidos > 0 && vencidos < LIMIAR_DE_VENCIDOS) por(revisar());

  // Regra 7: a porteira, se devida, fecha a etapa.
  const ordinalNaMateria = (estado.etapasPorMateria[m.id] ?? 0) + 1;
  const doFim = chegouAoFimDoMapa(m, lendo) && !estado.porteirasDoFim.includes(m.id);
  const quarta = ordinalNaMateria % ETAPAS_ATE_A_PORTEIRA === 0;
  const fecho = doFim ? porteira('fim_do_mapa') : quarta ? porteira('quarta_etapa') : undefined;

  // Regra 8: o quarto passo das etapas de cinco.
  if (tamanho === 5) {
    completarAte(3);
    if (passos.length === 3) {
      const t = entrada.tarefas[0];
      if (t) {
        passos.push({ tipo: 'seu_passo', materiaId: m.id, tarefaId: t.id, titulo: t.titulo });
      } else if (!fecho && m.pesou?.artigo && m.pesou.normaId !== undefined) {
        const norma = m.normas.find((n) => n.id === m.pesou?.normaId);
        const a = m.pesou.artigo;
        // Leitura curta com o Lembrar dela (regra 4); sem grifo, o lugar fica para o complemento.
        if (norma && a.grifos > 0 && !lendo.has(chave(norma.id, a.endereco))) {
          passos.push(...ler({ norma, artigos: [a], porque: 'pesou' }));
        }
      }
    }
  }

  completarAte(tamanho - (fecho ? 1 : 0));
  const comFecho = fecho !== undefined && cabe(1);
  if (comFecho) passos.push(fecho);

  // Regra 5: o último passo nunca é Ler. Aqui os complementos já se esgotaram; uma leitura extra
  // sem grifo no fim sai. Só a leitura principal fica: quando ela não tem grifo (sem Lembrar) e não
  // sobra nada para pôr depois dela, é o único caso em que a etapa termina num Ler.
  const leituras = () => passos.filter((p) => p.tipo === 'ler').length;
  while (passos.at(-1)?.tipo === 'ler' && leituras() > 1) passos.pop();

  return {
    numero,
    materiaId: m.id,
    materia: m.nome,
    passos,
    fechados: passos.map(() => undefined),
    ...(comFecho && doFim ? { porteiraDoFim: true } : {}),
  };
}
