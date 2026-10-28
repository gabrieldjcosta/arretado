// Onde o nome se escreve nesta abertura do aplicativo (contrato do Zé, §9): na camada de tela cheia (a
// Abertura) ou no cabeçalho (o `Marca`). Aqui só se decide; quem escreve é que mostra, e o Dia só é
// guardado quando a Abertura de fato toma a escrita (`tomarEscrita`).
import { dataCivil } from '../../../core/datas';
import type { Repositorio } from '../../../core/persistencia';
import { obterPreferencias } from '../../../core/preferencias';
import { escritaDaAbertura, tomarEscrita } from '../../componentes/escrita/frequencia';
import type { OndeEscrever } from '../../componentes/escrita/vez-da-escrita';
import { movimentoDoPerfil } from '../../movimento';

/**
 * Há Sessão ativa ou pausada hoje? Lê só as Sessões de hoje, pelo índice da data, e não as quatro coleções
 * inteiras do `resumoDoDia`: a tela cheia só abre depois desta leitura, então ela tem de custar o mesmo com
 * um mês ou com três anos de estudo. Mesma regra de antes (inclusive as excluídas, como no `resumoDoDia`).
 */
async function haSessaoAbertaHoje(repo: Repositorio): Promise<boolean> {
  const hoje = [repo.ctx.usuarioId, dataCivil(repo.ctx.agora())];
  const { itens } = await repo.colecao('sessoes').listarPagina({
    indice: '[usuarioId+data]',
    de: hoje,
    ate: hoje,
    limite: 1,
    incluirExcluidos: true,
    filtro: (sessao) => sessao.estado === 'ativa' || sessao.estado === 'pausada',
  });
  return itens.length > 0;
}

/**
 * A tela cheia abre na primeira vez no aparelho e na primeira abertura de cada Dia seguinte. Não abre
 * com movimento reduzido, com o "só estudo" ligado nem com Sessão aberta: nesses casos o cabeçalho
 * escreve (ou não) o nome como antes. Se os dados não leem, o mesmo: a Abertura nunca atrasa nem
 * derruba o uso. Quando abre, guarda o Dia (a escrita acontece uma vez, nunca nos dois lugares).
 */
export async function decidirOndeEscrever(repo: Repositorio): Promise<OndeEscrever> {
  const agora = repo.ctx.agora();
  const escrita = escritaDaAbertura(agora);
  if (escrita === 'parada') return { onde: 'cabecalho', escrita };
  try {
    const [preferencias, sessaoAberta] = await Promise.all([
      obterPreferencias(repo),
      haSessaoAbertaHoje(repo),
    ]);
    if (preferencias.modoSoEstudo === true || sessaoAberta) {
      return { onde: 'cabecalho', escrita };
    }
    const movimento = movimentoDoPerfil(preferencias.perfilDeEstudo);
    if (movimento === 'reduzido') return { onde: 'cabecalho', escrita };
    // Outra aba pode ter escrito o nome enquanto os dados eram lidos: vale o que `tomarEscrita` devolve.
    const tomada = tomarEscrita(agora);
    if (tomada === 'parada') return { onde: 'cabecalho', escrita: tomada };
    return { onde: 'tela', escrita: tomada, calmo: movimento === 'calmo' };
  } catch {
    return { onde: 'cabecalho', escrita };
  }
}

// A decisão é uma por carga do aplicativo (por repositório, como a da Entrada do Dia): o StrictMode roda
// os efeitos duas vezes, e a segunda leitura já veria o Dia guardado pela primeira.
const decididas = new WeakMap<Repositorio, Promise<OndeEscrever>>();

export function decidirNaAberturaDoApp(repo: Repositorio): Promise<OndeEscrever> {
  let decisao = decididas.get(repo);
  if (decisao === undefined) {
    decisao = decidirOndeEscrever(repo);
    decididas.set(repo, decisao);
  }
  return decisao;
}
