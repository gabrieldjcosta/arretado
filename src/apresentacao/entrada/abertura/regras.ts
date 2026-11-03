// Onde o nome se escreve nesta abertura do aplicativo (contrato do Zé, §9): na camada de tela cheia (a
// Abertura) ou no cabeçalho (o `Marca`). Aqui só se decide; quem escreve é que mostra, e o Dia só é
// guardado quando a Abertura de fato toma a escrita (`tomarEscrita`).
import { dataCivil } from '../../../core/datas';
import type { Repositorio } from '../../../core/persistencia';
import { obterPreferencias } from '../../../core/preferencias';
import {
  escritaDaAbertura,
  escritaNaTela,
  tomarEscrita,
} from '../../componentes/escrita/frequencia';
import type { OndeEscrever } from '../../componentes/escrita/vez-da-escrita';
import { movimentoDoPerfil } from '../../movimento';
import { chegadaPossivel } from '../regras';

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
 * A tela cheia abre em toda abertura do aplicativo (D-D14): inteira na primeira vez no aparelho, em 2,4 s
 * na primeira de cada Dia e em 1,6 s nas demais. Não abre com movimento reduzido, com o "só estudo" ligado,
 * com Sessão aberta nem depois de três aberturas seguidas puladas no Dia: nesses casos o cabeçalho
 * escreve (ou não) o nome como antes, pela frequência dele (uma vez por Dia). Se os dados não leem, o
 * mesmo: a Abertura nunca atrasa nem derruba o uso. Quando abre, guarda o Dia (a escrita acontece uma vez,
 * nunca nos dois lugares).
 *
 * Na primeira vez também diz se a Chegada vem aí (`chegada`): só então a luz espera pelo Zé dela. A
 * Chegada e a Abertura decidem em separado, e uma falha ao ler o aparelho vale "não": a luz vai ao cabeçalho.
 */
export async function decidirOndeEscrever(repo: Repositorio): Promise<OndeEscrever> {
  const agora = repo.ctx.agora();
  const escrita = escritaNaTela(agora);
  if (escrita === 'parada') return { onde: 'cabecalho', escrita };
  // O que o cabeçalho escreve se a tela cheia não abrir (as saídas abaixo): a frequência dele.
  const doCabecalho = escritaDaAbertura(agora);
  try {
    const [preferencias, sessaoAberta, chegada] = await Promise.all([
      obterPreferencias(repo),
      haSessaoAbertaHoje(repo),
      escrita === 'completa' ? chegadaPossivel(repo).catch(() => false) : false,
    ]);
    if (preferencias.modoSoEstudo === true || sessaoAberta) {
      return { onde: 'cabecalho', escrita: doCabecalho };
    }
    const movimento = movimentoDoPerfil(preferencias.perfilDeEstudo);
    if (movimento === 'reduzido') return { onde: 'cabecalho', escrita: doCabecalho };
    // Quem guarda o Dia é a tela cheia, ao tomar a escrita. Outra aba pode ter calado a tela (três pulos)
    // enquanto os dados eram lidos: vale o que `tomarEscrita` devolve.
    const tomada = tomarEscrita(agora);
    if (tomada === 'parada') return { onde: 'cabecalho', escrita: tomada };
    return {
      onde: 'tela',
      escrita: tomada,
      calmo: movimento === 'calmo',
      chegada: tomada === 'completa' && chegada,
    };
  } catch {
    return { onde: 'cabecalho', escrita: doCabecalho };
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
