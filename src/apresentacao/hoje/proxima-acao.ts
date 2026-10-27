// Reúne as entradas da Próxima ação (Recall e Legislação) e chama a decisão pura do domínio.
// Só lê: nada é gravado aqui (a Sessão nasce quando a pessoa aperta "Começar", pacote A2).
import type { DataCivil, Leitura, Norma } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import type { EscolherProximaAcao } from '../../dominios/hoje/contrato';
import { decidirProximaAcao, type EntradaDaProximaAcao } from '../../dominios/hoje/proxima-acao';
import { cotaDiaria, obterPreferencias } from '../../core/preferencias';
import { minutosDoLote } from '../../dominios/recall/ordem-de-valor';
import { carregarFila } from '../../dominios/tarefas';
import { cicloAtivo, posicaoDoCiclo } from '../../dominios/ciclos';
import { minutosAteOFimDaSecao } from '../../dominios/legislacao/continuar';
import { abrirNorma, normasPublicadas } from '../../dominios/legislacao/leitor';
import { leiturasPorNorma, lidaEm } from '../../dominios/legislacao/leituras';
import type { FonteDeIncidencia } from '../../dominios/legislacao/incidencia-fonte';
import { NOME_DA_CLASSE } from '../../dominios/legislacao/mapa-da-norma';
import { referenciaDoNo } from '../biblioteca/linhas';
import { trechoParaLer } from '../biblioteca/mapa/cobertura-da-norma';

function vencidos(repo: Repositorio, colecao: 'cartoes' | 'frases', hoje: DataCivil) {
  const u = repo.ctx.usuarioId;
  const estado = colecao === 'cartoes' ? 'ativo' : 'ativa';
  return repo.colecao(colecao).contar({
    indice: '[usuarioId+estado+proximaRevisao]',
    de: [u, estado, ''],
    ate: [u, estado, hoje],
  });
}

/** A norma publicada lida por último (a mesma regra do "Continuar leitura" da Biblioteca). */
function ultimaLida(normas: readonly Norma[], leituras: ReadonlyMap<string, Leitura>) {
  let ultima: { norma: Norma; leitura: Leitura } | undefined;
  for (const norma of normas) {
    if (norma.especie === 'sumulas' || norma.especie === 'teses') continue;
    const leitura = leituras.get(norma.id);
    if (leitura && (!ultima || lidaEm(leitura) > lidaEm(ultima.leitura))) {
      ultima = { norma, leitura };
    }
  }
  return ultima;
}

/** A leitura salva e quando foi lida (instante), para a linha de parada do Hoje. */
interface LeituraSalva {
  leitura: NonNullable<EntradaDaProximaAcao['leitura']>;
  lidaEm: string;
}

/** Quanto o Hoje espera o mapa: rede fraca não prende o Agora (cai em "Continuar a leitura"). */
const ESPERA_DO_MAPA_MS = 1500;

/** O próximo trecho do mapa como a entrada o quer; nada sem fonte, sem mapa ou com tudo coberto. */
async function trechoDoMapa(
  repo: Repositorio,
  fonte: FonteDeIncidencia | undefined,
  normaId: string,
): Promise<NonNullable<EntradaDaProximaAcao['leitura']>['trecho']> {
  if (!fonte) return undefined;
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const t = await Promise.race([
    trechoParaLer(repo, fonte, normaId).catch(() => undefined),
    new Promise<undefined>((resolve) => {
      relogio = setTimeout(() => {
        resolve(undefined);
      }, ESPERA_DO_MAPA_MS);
    }),
  ]).finally(() => {
    clearTimeout(relogio);
  });
  if (!t) return undefined;
  const rotulo = t.rotulo.startsWith('Art') ? `a${t.rotulo.slice(1)}` : t.rotulo;
  return { endereco: t.endereco, rotulo, faixa: NOME_DA_CLASSE[t.classe], minutos: t.minutos };
}

async function leituraSalva(
  repo: Repositorio,
  fonte?: FonteDeIncidencia,
): Promise<LeituraSalva | undefined> {
  const [normas, leituras] = await Promise.all([normasPublicadas(repo), leiturasPorNorma(repo)]);
  const achada = ultimaLida(normas, leituras);
  if (!achada) return undefined;
  const { norma, leitura } = achada;
  const trecho = await trechoDoMapa(repo, fonte, norma.id);
  const base = { normaId: norma.id, tituloCurto: norma.tituloCurto, ...(trecho ? { trecho } : {}) };
  const quando = lidaEm(leitura);
  const posicao = leitura.posicaoId ?? leitura.lidoAteId;
  if (posicao === undefined) return { leitura: base, lidaEm: quando };
  try {
    const { nos, indiceDe } = await abrirNorma(repo, norma.id);
    const indice = indiceDe.get(posicao);
    if (indice === undefined) return { leitura: base, lidaEm: quando };
    const onde = referenciaDoNo(nos, indiceDe, indice);
    return {
      leitura: onde === '' ? base : { ...base, onde, minutos: minutosAteOFimDaSecao(nos, indice) },
      lidaEm: quando,
    };
  } catch {
    return { leitura: base, lidaEm: quando }; // norma que não abre: segue sem o ponto
  }
}

/** O bloco atual do Ciclo ativo, com o nome da matéria; ausente sem Ciclo ou com matéria apagada. */
async function blocoAtual(repo: Repositorio): Promise<EntradaDaProximaAcao['ciclo']> {
  const ciclo = await cicloAtivo(repo);
  if (!ciclo) return undefined;
  const { indice, volta } = await posicaoDoCiclo(repo, ciclo);
  const bloco = ciclo.blocos[indice];
  if (!bloco) return undefined;
  const disciplina = await repo.colecao('disciplinas').obter(bloco.disciplinaId);
  if (!disciplina || disciplina.excluidoEm !== null) return undefined;
  return {
    id: ciclo.id,
    disciplina: disciplina.nome,
    blocoOrdem: indice,
    total: ciclo.blocos.length,
    volta,
    minutos: bloco.minutos,
  };
}

/** Tudo o que o Hoje sabe do estudo para decidir (e mostrar) a Próxima ação. */
export interface EntradasDoHoje {
  entrada: EntradaDaProximaAcao;
  /** Quando a norma da leitura salva foi lida por último (instante); ausente sem leitura salva. */
  leituraEm?: string;
}

export async function reunirEntradas(
  repo: Repositorio,
  hoje: DataCivil,
  /** Os arquivos do Mapa da norma; sem ela, a leitura salva não traz o trecho. */
  fonte?: FonteDeIncidencia,
): Promise<EntradasDoHoje> {
  const [cartoesVencidos, frasesVencidas, salva, { fila }, ciclo, preferencias] = await Promise.all(
    [
      vencidos(repo, 'cartoes', hoje),
      vencidos(repo, 'frases', hoje),
      leituraSalva(repo, fonte),
      carregarFila(repo, hoje),
      blocoAtual(repo),
      obterPreferencias(repo),
    ],
  );
  const primeira = fila[0];
  return {
    entrada: {
      cartoesVencidos,
      frasesVencidas,
      minutosDaRodada: minutosDoLote(
        Math.min(cartoesVencidos, cotaDiaria(preferencias)) +
          Math.min(frasesVencidas, cotaDiaria(preferencias)),
      ),
      ...(ciclo ? { ciclo } : {}),
      ...(salva ? { leitura: salva.leitura } : {}),
      ...(primeira
        ? {
            tarefa: {
              id: primeira.id,
              titulo: primeira.titulo,
              ...(primeira.estimativaMin !== undefined
                ? { estimativaMin: primeira.estimativaMin }
                : {}),
            },
          }
        : {}),
    },
    ...(salva ? { leituraEm: salva.lidaEm } : {}),
  };
}

export const escolherProximaAcao: EscolherProximaAcao = async (repo, hoje, opcoes) => {
  const { entrada } = await reunirEntradas(repo, hoje);
  return decidirProximaAcao(entrada, opcoes?.excluir);
};
