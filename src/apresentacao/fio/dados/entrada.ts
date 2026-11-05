// A camada de tela do Fio junta o que o app já sabe do estudo numa `EntradaDoFio` (fatia 3 do plano
// "Arquitetura do Fio"). Só lê: nada aqui grava. As matérias vêm das disciplinas; as normas, dos
// vínculos; o resto, de onde o Hoje já olha (Ciclo, leituras, vencidos, tarefas, data da prova).
//
// Abrir uma norma para contar artigos, grifos e o que já foi lido custa leitura de banco e regex,
// então só abrem as normas da matéria que o gerador vai usar agora e a da etapa que ficou aberta.
import type { Disciplina, Leitura, Norma, VinculoDeDisciplina } from '../../../core/modelo';
import type { Repositorio } from '../../../core/persistencia';
import { cicloAtivo, posicaoDoCiclo } from '../../../dominios/ciclos';
import {
  escolherMateria,
  type ArtigoDoFio,
  type EntradaDoFio,
  type MateriaDoFio,
  type NormaDoFio,
} from '../../../dominios/fio';
import { detectarDestaques } from '../../../dominios/legislacao/destaques';
import type { FonteDeIncidencia } from '../../../dominios/legislacao/incidencia-fonte';
import {
  abrirNorma,
  lerJanela,
  normasPublicadas,
  type NormaAberta,
} from '../../../dominios/legislacao/leitor';
import { leiturasPorNorma, lidaEm, obterLeitura } from '../../../dominios/legislacao/leituras';
import {
  quadradosDoMapa,
  type ClasseDoArtigo,
  type MapaDeIncidencia,
} from '../../../dominios/legislacao/mapa-da-norma';
import { dataDaProvaInformada } from '../../../dominios/recall/prova';
import { contarFrasesVencidas, contarVencidos, hoje } from '../../../dominios/recall/servico';
import { carregarFila } from '../../../dominios/tarefas';
import { textoParaDestacar } from '../../biblioteca/destacar';
import { trechosDoAche } from '../passos/ache';
import { artigosFeitos } from '../../biblioteca/mapa/feitos';
import { paresDaNorma } from './pares-da-norma';

/** Quanto esperar o arquivo do Mapa da norma antes de seguir sem ele (o Hoje espera o mesmo). */
const ESPERA_DO_MAPA_MS = 1500;

/** As classes que o Mapa considera relevantes, da que mais cai para a que menos cai. */
const CLASSES_RELEVANTES: readonly ClasseDoArtigo[] = ['altissima', 'alta', 'media'];

/** O vínculo leva a norma inteira ou um trecho dela (do endereço de início ao de fim). */
type Recorte = 'toda' | { inicio: string; fim: string };

interface NormaDaMateria {
  norma: Norma;
  recortes: readonly Recorte[];
}

export interface OpcoesDaEntrada {
  /** Os arquivos do Mapa da norma. */
  fonte: FonteDeIncidencia;
  /** Etapas já pousadas no Fio: o Ciclo anda uma matéria por etapa sem gravar nada nele. */
  etapasFeitas: number;
  /** Matéria da etapa que ficou aberta: as normas dela também abrem, para o "Já feito". */
  materiaAberta?: string;
}

/** Grifos (Destaques) por nó de uma versão de norma: o texto da versão não muda, então fica em memória. */
const grifosPorVersao = new Map<string, ReadonlyMap<number, number>>();

async function grifosDosNos(
  repo: Repositorio,
  aberta: NormaAberta,
): Promise<ReadonlyMap<number, number>> {
  const guardado = grifosPorVersao.get(aberta.versao.id);
  if (guardado) return guardado;
  const porNo = new Map<number, number>();
  for (let inicio = 0; inicio < aberta.nos.length; inicio += 200) {
    const janela = await lerJanela(repo, aberta, { inicio, quantidade: 200 });
    for (const item of janela) {
      if (!item.texto) continue;
      const n = detectarDestaques(textoParaDestacar(item.texto.trechos)).length;
      if (n > 0) porNo.set(item.indice, n);
    }
  }
  grifosPorVersao.set(aberta.versao.id, porNo);
  return porNo;
}

/** O Mapa da norma, se a norma veio do acervo e o arquivo chega a tempo. */
async function mapaDaNorma(
  fonte: FonteDeIncidencia,
  norma: Norma,
): Promise<MapaDeIncidencia | undefined> {
  const acervoId = norma.origemAcervo?.id;
  if (acervoId === undefined) return undefined;
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const espera = new Promise<undefined>((resolver) => {
    relogio = setTimeout(() => {
      resolver(undefined);
    }, ESPERA_DO_MAPA_MS);
  });
  try {
    const carregado = await Promise.race([
      fonte.mapaDaNorma(acervoId).catch(() => undefined),
      espera,
    ]);
    return carregado?.dados;
  } finally {
    clearTimeout(relogio);
  }
}

/** Quem pertence ao trecho vinculado: o índice do nó cai dentro de algum recorte. */
function dentroDosRecortes(
  aberta: NormaAberta,
  recortes: readonly Recorte[],
): (indice: number) => boolean {
  if (recortes.includes('toda')) return () => true;
  const faixas: [number, number][] = [];
  for (const r of recortes) {
    if (r === 'toda') continue;
    const inicio = aberta.nos.findIndex((no) => no.dispositivo.endereco === r.inicio);
    const ultimo = aberta.nos.findIndex((no) => no.dispositivo.endereco === r.fim);
    if (inicio < 0 || ultimo < 0) continue;
    let fim = ultimo + 1;
    const nivel = aberta.nos[ultimo]?.nivel ?? 0;
    while (fim < aberta.nos.length && (aberta.nos[fim]?.nivel ?? 0) > nivel) fim++;
    faixas.push([inicio, fim]);
  }
  // Endereço que não existe mais: melhor a norma inteira do que nenhum artigo.
  if (faixas.length === 0) return () => true;
  return (indice) => faixas.some(([de, ate]) => indice >= de && indice < ate);
}

/** Os artigos em vigor da norma, na ordem do código, com grifos, "lido" e a posição no Mapa. */
async function artigosDaNorma(
  repo: Repositorio,
  fonte: FonteDeIncidencia,
  item: NormaDaMateria,
): Promise<{ artigos: ArtigoDoFio[]; pares: NormaDoFio['pares'] }> {
  let aberta: NormaAberta;
  try {
    aberta = await abrirNorma(repo, item.norma.id);
  } catch {
    return { artigos: [], pares: [] };
  }
  const [mapa, leitura] = await Promise.all([
    mapaDaNorma(fonte, item.norma),
    // A posição é conveniência: sem ela, só não há "lido até".
    obterLeitura(repo, item.norma.id).catch(() => undefined),
  ]);
  const grifos = await grifosDosNos(repo, aberta).catch(() => new Map<number, number>());
  const lidoAte =
    leitura?.lidoAteId === undefined ? undefined : aberta.indiceDe.get(leitura.lidoAteId);
  const feitos = new Set(artigosFeitos(item.norma.id));
  const noRecorte = dentroDosRecortes(aberta, item.recortes);

  const quadrados = quadradosDoMapa(aberta.nos, mapa).filter(
    (q) => !q.foraDeVigor && noRecorte(q.indice),
  );
  // O Mapa não dá ranking: o que cai (da faixa mais alta à mais baixa) vem na ordem do código; o
  // resto não tem posição, senão a porteira do fim do Mapa nunca chegaria.
  const ranqueados = quadrados
    .filter((q) => CLASSES_RELEVANTES.includes(q.classe))
    .sort(
      (a, b) =>
        CLASSES_RELEVANTES.indexOf(a.classe) - CLASSES_RELEVANTES.indexOf(b.classe) ||
        a.indice - b.indice,
    );
  const posicao = new Map(ranqueados.map((q, i) => [q.id, i] as const));

  const pares = await paresDaNorma(repo, aberta, quadrados).catch(() => []);
  const artigos = quadrados.map((q) => {
    let grifosDoArtigo = 0;
    for (let i = q.indice; i < q.fim; i++) grifosDoArtigo += grifos.get(i) ?? 0;
    const naPosicao = posicao.get(q.id);
    return {
      endereco: q.endereco,
      rotulo: q.rotulo,
      grifos: grifosDoArtigo,
      lido: (lidoAte !== undefined && q.indice <= lidoAte) || feitos.has(q.id),
      ...(naPosicao === undefined ? {} : { posicaoNoMapa: naPosicao }),
    };
  });
  return { artigos, pares };
}

/** As normas publicadas de cada disciplina, pelos vínculos, na ordem das normas (título curto). */
function normasPorDisciplina(
  normas: readonly Norma[],
  vinculos: readonly VinculoDeDisciplina[],
): Map<string, NormaDaMateria[]> {
  const porDisciplina = new Map<string, Map<string, Recorte[]>>();
  for (const v of vinculos) {
    if (v.excluidoEm !== null || v.disciplinaId === undefined) continue;
    const dessa = porDisciplina.get(v.disciplinaId) ?? new Map<string, Recorte[]>();
    const recortes = dessa.get(v.normaId) ?? [];
    recortes.push(
      v.trecho === undefined
        ? 'toda'
        : { inicio: v.trecho.inicioEndereco, fim: v.trecho.fimEndereco },
    );
    dessa.set(v.normaId, recortes);
    porDisciplina.set(v.disciplinaId, dessa);
  }
  const resultado = new Map<string, NormaDaMateria[]>();
  for (const [disciplinaId, dessa] of porDisciplina) {
    resultado.set(
      disciplinaId,
      normas.flatMap((norma) => {
        const recortes = dessa.get(norma.id);
        return recortes ? [{ norma, recortes }] : [];
      }),
    );
  }
  return resultado;
}

/** A matéria da leitura mais recente: o vínculo da última norma lida que cai numa disciplina viva. */
async function materiaDaUltimaLeitura(
  repo: Repositorio,
  vinculos: readonly VinculoDeDisciplina[],
  vivas: ReadonlySet<string>,
): Promise<string | undefined> {
  const leituras = await leiturasPorNorma(repo).catch(() => new Map<string, Leitura>());
  const ordenadas = [...leituras.entries()].sort((a, b) =>
    lidaEm(b[1]).localeCompare(lidaEm(a[1])),
  );
  for (const [normaId] of ordenadas) {
    const v = vinculos.find(
      (x) =>
        x.normaId === normaId &&
        x.excluidoEm === null &&
        x.disciplinaId !== undefined &&
        vivas.has(x.disciplinaId),
    );
    if (v?.disciplinaId !== undefined) return v.disciplinaId;
  }
  return undefined;
}

/** O que o Fio precisa saber agora. Súmulas, Ache o erro e "o que mais pesou" entram nas próximas fatias. */
export async function montarEntradaDoFio(
  repo: Repositorio,
  opcoes: OpcoesDaEntrada,
): Promise<EntradaDoFio> {
  const dia = hoje(repo);
  const [disciplinas, vinculos, publicadas, ciclo, cartoes, frases, dataDaProva, { fila }] =
    await Promise.all([
      repo.colecao('disciplinas').todosDoUsuario(),
      repo.colecao('vinculosDisciplina').todosDoUsuario(),
      normasPublicadas(repo),
      cicloAtivo(repo),
      contarVencidos(repo),
      contarFrasesVencidas(repo),
      dataDaProvaInformada(repo),
      carregarFila(repo, dia),
    ]);
  const vivas: Disciplina[] = disciplinas
    .filter((d) => d.excluidoEm === null)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const idsVivos = new Set(vivas.map((d) => d.id));
  const normas = publicadas.filter((n) => n.especie === undefined || n.especie === 'norma');
  const dasMaterias = normasPorDisciplina(normas, vinculos);

  const leves: MateriaDoFio[] = vivas.map((d) => ({
    id: d.id,
    nome: d.nome,
    normas: (dasMaterias.get(d.id) ?? []).map(({ norma }) => ({
      id: norma.id,
      tituloCurto: norma.tituloCurto,
      artigos: [],
    })),
    sumulas: [],
  }));

  const posicao = ciclo && ciclo.blocos.length > 0 ? await posicaoDoCiclo(repo, ciclo) : undefined;
  const ultimaLeitura = await materiaDaUltimaLeitura(repo, vinculos, idsVivos);
  const base: EntradaDoFio = {
    hoje: dia,
    materias: leves,
    ...(ciclo && posicao
      ? {
          ciclo: {
            blocos: ciclo.blocos.map((b) => b.disciplinaId),
            indice: posicao.indice + Math.max(0, Math.floor(opcoes.etapasFeitas)),
          },
        }
      : {}),
    ...(ultimaLeitura === undefined ? {} : { ultimaLeitura }),
    prova: vivas.map((d) => d.id),
    vencidos: cartoes + frases,
    tarefas: fila.map((t) => ({ id: t.id, titulo: t.titulo })),
    ...(dataDaProva === undefined ? {} : { dataDaProva }),
  };

  // Só a matéria da vez e a da etapa aberta contam artigos.
  const abrir = new Set<string>();
  const daVez = escolherMateria(base);
  if (daVez) abrir.add(daVez.id);
  if (opcoes.materiaAberta !== undefined) abrir.add(opcoes.materiaAberta);
  const materias = await Promise.all(
    leves.map(async (m): Promise<MateriaDoFio> => {
      if (!abrir.has(m.id)) return m;
      const itens = dasMaterias.get(m.id) ?? [];
      const preenchidas: NormaDoFio[] = await Promise.all(
        itens.map(async (item): Promise<NormaDoFio> => {
          const { artigos, pares } = await artigosDaNorma(repo, opcoes.fonte, item);
          return {
            id: item.norma.id,
            tituloCurto: item.norma.tituloCurto,
            artigos,
            ...(pares && pares.length > 0 ? { pares } : {}),
          };
        }),
      );
      // Trechos de "Ache o erro": dos artigos já lidos com grifo, os que têm uma troca segura.
      let acheOErro = 0;
      for (const n of preenchidas) {
        const lidos = n.artigos.filter((a) => a.lido && a.grifos > 0);
        if (lidos.length > 0) acheOErro += await trechosDoAche(repo, n.id, lidos);
      }
      return { ...m, normas: preenchidas, acheOErro };
    }),
  );
  return { ...base, materias };
}
