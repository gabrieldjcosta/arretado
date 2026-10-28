// Onde o nome se escreve nesta abertura do aplicativo (contrato do Zé, §9): na camada de tela cheia (a
// Abertura) ou no cabeçalho (o `Marca`). Aqui só se decide; quem escreve é que mostra, e o Dia só é
// guardado quando a Abertura de fato toma a escrita (`tomarEscrita`).
import type { Repositorio } from '../../../core/persistencia';
import { obterPreferencias } from '../../../core/preferencias';
import { resumoDoDia } from '../../../dominios/dia/fechar';
import { escritaDaAbertura, tomarEscrita } from '../../componentes/escrita/frequencia';
import type { OndeEscrever } from '../../componentes/escrita/vez-da-escrita';
import { movimentoDoPerfil } from '../../movimento';
import { chegadaPossivel } from '../regras';

/**
 * A tela cheia abre na primeira vez no aparelho e na primeira abertura de cada Dia seguinte. Não abre
 * com movimento reduzido, com o "só estudo" ligado nem com Sessão aberta: nesses casos o cabeçalho
 * escreve (ou não) o nome como antes. Se os dados não leem, o mesmo: a Abertura nunca atrasa nem
 * derruba o uso. Quando abre, guarda o Dia (a escrita acontece uma vez, nunca nos dois lugares).
 *
 * Na primeira vez também diz se a Chegada vem aí (`chegada`): só então a luz espera pelo Zé dela. A
 * Chegada e a Abertura decidem em separado, e uma falha ao ler o aparelho vale "não": a luz vai ao cabeçalho.
 */
export async function decidirOndeEscrever(repo: Repositorio): Promise<OndeEscrever> {
  const agora = repo.ctx.agora();
  const escrita = escritaDaAbertura(agora);
  if (escrita === 'parada') return { onde: 'cabecalho', escrita };
  try {
    const [preferencias, resumo, chegada] = await Promise.all([
      obterPreferencias(repo),
      resumoDoDia(repo),
      escrita === 'completa' ? chegadaPossivel(repo).catch(() => false) : false,
    ]);
    if (preferencias.modoSoEstudo === true || resumo.sessaoAberta) {
      return { onde: 'cabecalho', escrita };
    }
    const movimento = movimentoDoPerfil(preferencias.perfilDeEstudo);
    if (movimento === 'reduzido') return { onde: 'cabecalho', escrita };
    tomarEscrita(agora);
    return { onde: 'tela', escrita, calmo: movimento === 'calmo', chegada };
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
