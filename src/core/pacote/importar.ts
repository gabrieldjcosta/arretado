// Importação com modos, prévia, snapshot e log (atividades 3.4–3.8; Parte 2 §12.2–12.4).
import { lerCarimbo } from '../ids';
import {
  colecoesDoModulo,
  type Snapshot,
  eAppendOnly,
  ENTIDADES,
  NOMES_CAMPOS_COMUNS,
  NOMES_COLECOES,
  type LogDeImportacao,
  type Modulo,
  type NomeColecao,
  versaoDeOrigem,
} from '../modelo';
import { migrarFrasesDosErros, type Repositorio } from '../persistencia';
import { iguais, jsonCanonico } from '../util/json-canonico';
import type { PacoteLido } from './ler';
import { criarSnapshot, podarSnapshots } from './snapshots';

/** Modos que escrevem; o modo 1 (simulação) é `planejar` sem `aplicar`. */
export type ModoEscrita = 2 | 3 | 4 | 5 | 6;

type Registro = Record<string, unknown> & { id: string; usuarioId: string; tsLogico: string };

export interface ResumoColecao {
  criar: number;
  atualizar: number;
  ignorar: number;
  conflitos: number;
  excluir: number;
  duplicatasProvaveis: number;
}

export interface Conflito {
  chave: string;
  colecao: NomeColecao;
  id: string;
  local: Registro;
  pacote: Registro;
}

type Operacao =
  | { tipo: 'gravar'; colecao: NomeColecao; registro: Registro; efeito: 'criar' | 'atualizar' }
  | { tipo: 'excluirLogico'; colecao: NomeColecao; registro: Registro }
  | { tipo: 'remover'; colecao: NomeColecao; id: string }
  /** Registro deste Aparelho passa para a identidade do pacote (modo 6 de outra identidade). */
  | { tipo: 'rehospedar'; colecao: NomeColecao; registro: Registro };

export interface Previa {
  modo: ModoEscrita;
  modulos: Modulo[];
  porColecao: Partial<Record<NomeColecao, ResumoColecao>>;
  conflitos: Conflito[];
  avisos: string[];
  totalExclusoes: number;
  /** Há algo a escrever (se não, a importação só é registrada no log). */
  escreve: boolean;
  /** Modo 6 com pacote de outra identidade: o usuário local passa a ser o do pacote. */
  substituiIdentidade: boolean;
  hashArquivo: string;
  /** Operações calculadas; `aplicar` executa exatamente estas. */
  operacoes: Operacao[];
  /** Último item do log visto no planejamento; alteração posterior invalida a prévia. */
  seqBase: number;
  colecoesAfetadas: NomeColecao[];
}

export class ImportacaoInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ImportacaoInvalida';
  }
}

export interface OpcoesPlanejamento {
  modo: ModoEscrita;
  /** Modos 2–5: subconjunto dos módulos do pacote (padrão: todos). */
  modulos?: Modulo[];
  /** Coleções fora da importação (ex.: identidade do espaço ao mesclar). */
  ignorarColecoes?: NomeColecao[];
  /** Modo 6 exige pacote integral; o espaço separado (modo 7) aceita parcial. */
  exigirIntegral?: boolean;
}

const COLECOES_IDENTIDADE: NomeColecao[] = ['usuarios', 'aparelhos', 'preferencias'];

function conteudo(r: Record<string, unknown>): string {
  const c: Record<string, unknown> = { ...r };
  for (const k of NOMES_CAMPOS_COMUNS) Reflect.deleteProperty(c, k);
  return jsonCanonico(c);
}

function autor(r: Registro): string {
  return lerCarimbo(r.tsLogico).aparelho;
}

function resumoVazio(): ResumoColecao {
  return { criar: 0, atualizar: 0, ignorar: 0, conflitos: 0, excluir: 0, duplicatasProvaveis: 0 };
}

/** Modo 1 (simulação): calcula a prévia de um modo sem escrever nada. */
export async function planejar(
  repo: Repositorio,
  pacote: PacoteLido,
  opcoes: OpcoesPlanejamento,
): Promise<Previa> {
  const { modo } = opcoes;
  const m = pacote.manifesto;
  const outroUsuario = m.usuarioId !== repo.ctx.usuarioId;
  if (outroUsuario && modo !== 6) {
    throw new ImportacaoInvalida(
      'Este pacote é de outra identidade. Use "Restaurar integral" ou "Importar para espaço separado".',
    );
  }
  if (modo === 6 && opcoes.exigirIntegral !== false && m.escopo.tipo !== 'integral') {
    throw new ImportacaoInvalida('"Restaurar integral" exige um pacote integral.');
  }
  const modulos = modo === 6 ? m.modulos : (opcoes.modulos ?? m.modulos);
  for (const mod of modulos) {
    if (!m.modulos.includes(mod))
      throw new ImportacaoInvalida(`O pacote não contém o módulo ${mod}.`);
  }
  const ignoradas = new Set(opcoes.ignorarColecoes ?? []);
  const colecoes = modulos.flatMap((mod) => colecoesDoModulo(mod)).filter((c) => !ignoradas.has(c));
  // Fontes das versões (13.3): com `legislacao` e sem `sistema`, só os anexos que o pacote referencia
  // entram, e nenhum anexo local é apagado por não estar no pacote.
  const idsFontes = new Set<string>();
  const soFontes = (n: string) => n === 'anexos' && !modulos.includes('sistema');
  if (modulos.includes('legislacao') && !modulos.includes('sistema') && !ignoradas.has('anexos')) {
    for (const v of pacote.registros.get('versoesNorma') ?? []) {
      if (typeof v.anexoFonteId === 'string') idsFontes.add(v.anexoFonteId);
    }
    if (pacote.registros.has('anexos')) colecoes.push('anexos');
  }

  // Lido antes dos registros: qualquer escrita depois disto é detectada ao aplicar.
  const seqBase = (await repo.db.alteracoes.orderBy('seq').last())?.seq ?? 0;
  const operacoes: Operacao[] = [];
  const conflitos: Conflito[] = [];
  const porColecao: Previa['porColecao'] = {};
  const avisos: string[] = [];
  let imutaveis = 0;
  let duplicatas = 0;
  /** Erros que a importação exclui (modo 5): as Frases deles saem junto. */
  const errosExcluidos = new Set<string>();

  for (const nome of colecoes) {
    const resumo = resumoVazio();
    porColecao[nome] = resumo;
    const doPacote = ((pacote.registros.get(nome) ?? []) as Registro[]).filter(
      (r) => !soFontes(nome) || idsFontes.has(r.id),
    );
    const locais = (await repo.colecao(nome).todosDoUsuario()) as unknown as Registro[];
    const porId = new Map(locais.map((r) => [r.id, r]));
    const conteudosLocais = new Map(locais.map((r) => [conteudo(r), r.id]));
    const idsPacote = new Set(doPacote.map((r) => r.id));

    const gravar = (registro: Registro, efeito: 'criar' | 'atualizar') => {
      operacoes.push({ tipo: 'gravar', colecao: nome, registro, efeito });
      resumo[efeito] += 1;
      if (efeito === 'criar') {
        const igual = conteudosLocais.get(conteudo(registro));
        if (igual !== undefined && igual !== registro.id) {
          resumo.duplicatasProvaveis += 1;
          duplicatas += 1;
        }
      }
    };

    for (const p of doPacote) {
      const l = porId.get(p.id);
      if (l && iguais(l, p)) {
        resumo.ignorar += 1;
        continue;
      }
      if (l && eAppendOnly(nome) && modo !== 6) {
        resumo.ignorar += 1;
        imutaveis += 1;
        continue;
      }
      switch (modo) {
        case 2:
          if (l) resumo.ignorar += 1;
          else gravar(p, 'criar');
          break;
        case 3:
          if (l && p.tsLogico > l.tsLogico) gravar(p, 'atualizar');
          else resumo.ignorar += 1;
          break;
        case 4:
          if (!l) gravar(p, 'criar');
          else if (autor(l) === autor(p) && p.tsLogico !== l.tsLogico) {
            if (p.tsLogico > l.tsLogico) gravar(p, 'atualizar');
            else resumo.ignorar += 1;
          } else {
            conflitos.push({
              chave: `${nome}/${p.id}`,
              colecao: nome,
              id: p.id,
              local: l,
              pacote: p,
            });
            resumo.conflitos += 1;
          }
          break;
        case 5:
        case 6:
          gravar(p, l ? 'atualizar' : 'criar');
          break;
      }
    }

    // Pacote anterior à v6 nada diz das Frases (nascem dos erros, T22). Substituir módulos não as
    // apaga; só sai a Frase do erro que a importação exclui. Restaurar integral apaga tudo, e
    // `migrarFrasesDosErros` recria as Frases dos erros restaurados.
    // Idem as Tarefas de estudo (v7) e os vínculos de precedente (v8): pacote anterior não os traz
    // e a substituição não os apaga.
    const posteriorAoPacote =
      (nome === 'frases' ||
        nome === 'revisoesFrase' ||
        nome === 'tarefasDeEstudo' ||
        nome === 'vinculosPrecedenteDispositivo' ||
        nome === 'vinculosEntrePrecedentes') &&
      versaoDeOrigem(nome) > m.versaoEsquema;
    if ((modo === 5 || modo === 6) && !soFontes(nome)) {
      for (const l of locais) {
        if (idsPacote.has(l.id)) continue;
        if (modo === 5 && posteriorAoPacote) {
          const erroId = (l as { erroId?: unknown }).erroId;
          const erroSai =
            nome === 'frases' && typeof erroId === 'string' && errosExcluidos.has(erroId);
          if (!erroSai || l.excluidoEm !== null) {
            resumo.ignorar += 1;
            continue;
          }
        }
        // O registro deste Aparelho nunca é apagado nem excluído pela importação.
        if (nome === 'aparelhos' && l.id === repo.ctx.aparelhoId) {
          if (outroUsuario) operacoes.push({ tipo: 'rehospedar', colecao: nome, registro: l });
          resumo.ignorar += 1;
          continue;
        }
        if (modo === 6) {
          operacoes.push({ tipo: 'remover', colecao: nome, id: l.id });
          resumo.excluir += 1;
        } else if (l.excluidoEm === null) {
          if (eAppendOnly(nome)) {
            resumo.ignorar += 1;
            imutaveis += 1;
          } else {
            operacoes.push({ tipo: 'excluirLogico', colecao: nome, registro: l });
            if (nome === 'erros') errosExcluidos.add(l.id);
            resumo.excluir += 1;
          }
        }
      }
    }
  }

  if (outroUsuario) {
    avisos.push(
      'O pacote é de outra identidade: todos os dados deste aparelho serão substituídos pelos do pacote.',
    );
  }
  if (imutaveis > 0) {
    avisos.push(
      `${String(imutaveis)} revisão(ões) mantida(s) como estão: revisões não mudam nem são excluídas.`,
    );
  }
  if (duplicatas > 0) {
    avisos.push(
      `${String(duplicatas)} provável(is) duplicata(s): conteúdo igual a um item existente com outro identificador. Serão criados mesmo assim.`,
    );
  }
  const totalExclusoes = Object.values(porColecao).reduce((s, r) => s + r.excluir, 0);
  return {
    modo,
    modulos,
    porColecao,
    conflitos,
    avisos,
    totalExclusoes,
    escreve: operacoes.length > 0 || conflitos.length > 0 || outroUsuario,
    substituiIdentidade: outroUsuario,
    hashArquivo: pacote.hashArquivo,
    operacoes,
    seqBase,
    colecoesAfetadas: colecoes,
  };
}

export interface ResultadoImportacao {
  /** Repositório a usar daqui em diante (outro, se a identidade mudou). */
  repo: Repositorio;
  log: LogDeImportacao;
  identidadeMudou: boolean;
}

/**
 * Executa a prévia: snapshot antes, tudo numa transação, log da importação e poda
 * de snapshots. `resolucoes` escolhe o lado de cada conflito (padrão: manter local).
 */
export async function aplicar(
  repo: Repositorio,
  pacote: PacoteLido,
  previa: Previa,
  resolucoes: ReadonlyMap<string, 'local' | 'pacote'> = new Map(),
  opcoes: { snapshot?: false | Snapshot['motivo']; descricao?: string } = {},
): Promise<ResultadoImportacao> {
  if (previa.hashArquivo !== pacote.hashArquivo) {
    throw new ImportacaoInvalida('A prévia não corresponde a este pacote.');
  }
  const motivoSnapshot = opcoes.snapshot ?? 'importacao';
  const snapshot =
    previa.escreve && motivoSnapshot !== false ? await criarSnapshot(repo, motivoSnapshot) : null;
  const alvo = previa.substituiIdentidade ? repo.comUsuario(pacote.manifesto.usuarioId) : repo;

  const contagens: LogDeImportacao['contagens'] = {};
  for (const [nome, r] of Object.entries(previa.porColecao)) {
    contagens[nome] = {
      criados: r.criar,
      atualizados: r.atualizar,
      ignorados: r.ignorar,
      conflitos: r.conflitos,
      excluidos: r.excluir,
    };
  }

  const log = await repo.transacao(async () => {
    const afetadas = new Set<string>(previa.colecoesAfetadas);
    const posteriores = await repo.db.alteracoes
      .where('seq')
      .above(previa.seqBase)
      .filter((a) => afetadas.has(a.colecao))
      .count();
    if (posteriores > 0) {
      throw new ImportacaoInvalida('Os dados mudaram depois da prévia. Gere a prévia de novo.');
    }
    const agora = repo.ctx.agora().toISOString();
    const gravacoes = new Map<NomeColecao, Registro[]>();
    const remocoes = new Map<NomeColecao, string[]>();
    const acumular = <T>(mapa: Map<NomeColecao, T[]>, nome: NomeColecao, item: T) => {
      const lista = mapa.get(nome) ?? [];
      lista.push(item);
      mapa.set(nome, lista);
    };

    for (const op of previa.operacoes) {
      switch (op.tipo) {
        case 'gravar':
          acumular(gravacoes, op.colecao, op.registro);
          break;
        case 'remover':
          acumular(remocoes, op.colecao, op.id);
          break;
        case 'excluirLogico':
          acumular(gravacoes, op.colecao, {
            ...op.registro,
            excluidoEm: agora,
            atualizadoEm: agora,
            tsLogico: repo.ctx.relogio.tick(),
          });
          break;
        case 'rehospedar':
          acumular(remocoes, op.colecao, op.registro.id);
          acumular(gravacoes, op.colecao, {
            ...op.registro,
            usuarioId: alvo.ctx.usuarioId,
            atualizadoEm: agora,
            tsLogico: repo.ctx.relogio.tick(),
          });
          break;
      }
    }
    for (const c of previa.conflitos) {
      if (resolucoes.get(c.chave) === 'pacote') acumular(gravacoes, c.colecao, c.pacote);
    }

    // Remoções primeiro (feitas pela identidade antiga), depois gravações pela identidade alvo.
    for (const [nome, ids] of remocoes) {
      await repo.colecao(nome).removerFisico(ids);
      if (nome === 'anexos') await repo.db.anexosConteudo.bulkDelete(ids);
    }
    for (const [nome, registros] of gravacoes) await alvo.colecao(nome).gravarLote(registros);
    // Conteúdo binário só dos anexos cujo registro veio do pacote nesta importação.
    const anexosGravados = new Set((gravacoes.get('anexos') ?? []).map((r) => r.id));
    for (const [id, bytes] of pacote.anexos) {
      if (anexosGravados.has(id)) await repo.db.anexosConteudo.put({ id, bytes });
    }

    if (previa.substituiIdentidade) {
      await migrarRegistrosLocais(repo, alvo);
      await alvo.adotarIdentidade(alvo.ctx.usuarioId);
    }
    // Pacote anterior à v6 traz erros com frase correta e nenhuma Frase: elas nascem aqui (T22).
    // Pacote v6 em diante já traz as Frases como estavam; restaurar devolve exatamente o pacote.
    if (pacote.manifesto.versaoEsquema < 6) await migrarFrasesDosErros(alvo);
    return alvo.colecao('logsImportacao').criar(
      {
        em: agora,
        modo: previa.modo,
        hashPacote: pacote.hashArquivo,
        contagens,
        resultado: 'concluida',
        ...(snapshot ? { snapshotId: snapshot.id } : {}),
        ...(opcoes.descricao ? { descricao: opcoes.descricao } : {}),
      },
      { origem: 'sistema' },
    );
  });

  if (snapshot) await podarSnapshots(alvo);
  return { repo: alvo, log, identidadeMudou: previa.substituiIdentidade };
}

/** Coleções só locais (snapshots, logs de importação, espaços) acompanham a nova identidade. */
async function migrarRegistrosLocais(de: Repositorio, para: Repositorio): Promise<void> {
  for (const nome of NOMES_COLECOES.filter((n) => ENTIDADES[n].modulo === null)) {
    const registros = await de.colecao(nome).todosDoUsuario();
    if (registros.length === 0) continue;
    await de.colecao(nome).removerFisico(registros.map((r) => r.id));
    await para.colecao(nome).gravarLote(
      registros.map((r) => ({
        ...r,
        usuarioId: para.ctx.usuarioId,
        tsLogico: para.ctx.relogio.tick(),
      })),
    );
  }
}

export { COLECOES_IDENTIDADE };
