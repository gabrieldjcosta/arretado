// Reúne as entradas da Próxima ação (Recall e Legislação) e chama a decisão pura do domínio.
// Só lê: nada é gravado aqui (a Sessão nasce quando a pessoa aperta "Começar", pacote A2).
import type { DataCivil, Leitura, Norma } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import type { EscolherProximaAcao } from '../../dominios/hoje/contrato';
import { decidirProximaAcao, type EntradaDaProximaAcao } from '../../dominios/hoje/proxima-acao';
import { carregarFila } from '../../dominios/tarefas';
import { minutosAteOFimDaSecao } from '../../dominios/legislacao/continuar';
import { abrirNorma, normasPublicadas } from '../../dominios/legislacao/leitor';
import { leiturasPorNorma, lidaEm } from '../../dominios/legislacao/leituras';
import { referenciaDoNo } from '../biblioteca/linhas';

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

async function leituraSalva(repo: Repositorio): Promise<EntradaDaProximaAcao['leitura']> {
  const [normas, leituras] = await Promise.all([normasPublicadas(repo), leiturasPorNorma(repo)]);
  const achada = ultimaLida(normas, leituras);
  if (!achada) return undefined;
  const { norma, leitura } = achada;
  const base = { normaId: norma.id, tituloCurto: norma.tituloCurto };
  const posicao = leitura.posicaoId ?? leitura.lidoAteId;
  if (posicao === undefined) return base;
  try {
    const { nos, indiceDe } = await abrirNorma(repo, norma.id);
    const indice = indiceDe.get(posicao);
    if (indice === undefined) return base;
    const onde = referenciaDoNo(nos, indiceDe, indice);
    return onde === '' ? base : { ...base, onde, minutos: minutosAteOFimDaSecao(nos, indice) };
  } catch {
    return base; // norma que não abre: segue sem o ponto
  }
}

export const escolherProximaAcao: EscolherProximaAcao = async (repo, hoje, opcoes) => {
  const [cartoesVencidos, frasesVencidas, leitura, { fila }] = await Promise.all([
    vencidos(repo, 'cartoes', hoje),
    vencidos(repo, 'frases', hoje),
    leituraSalva(repo),
    carregarFila(repo, hoje),
  ]);
  const primeira = fila[0];
  return decidirProximaAcao(
    {
      cartoesVencidos,
      frasesVencidas,
      ...(leitura ? { leitura } : {}),
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
    opcoes?.excluir,
  );
};
