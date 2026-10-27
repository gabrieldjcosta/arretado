// Um fluxo só de começo (decisão de 27/10/2026): quem escolhe o concurso em "Para começar" ganha, no
// mesmo toque, a Trilha do edital mais recente da carreira, com todas as matérias. É o mesmo caminho
// do onboarding (`prepararPontos` + `aplicar`): prévia, snapshot, log e desfazer em Conta › Dados.
import { aplicar } from '../../core/pacote';
import type { Repositorio } from '../../core/persistencia';
import {
  CatalogoIndisponivel,
  editaisOferecidos,
  rotuloDoEdital,
  type EditalDoCatalogo,
  type FonteDoCatalogo,
} from '../../dominios/catalogo';
import { linhasDoEdital } from '../../integracoes/catalogo/linhas';
import { prepararPontos } from '../../integracoes/pontos/importar';

export interface TrilhaOferecida {
  edital: EditalDoCatalogo;
  /** "baseado no edital X de AAAA". */
  rotulo: string;
  materias: number;
  pontos: number;
}

/**
 * A Trilha que "Para começar" oferece para a carreira: o edital mais recente do catálogo, inteiro.
 * `null` quando a carreira não está no catálogo, quando ele não abre ou quando a Trilha já tem Pontos
 * (aí a pessoa monta pelo onboarding, que mostra a prévia).
 */
export async function trilhaOferecida(
  repo: Repositorio,
  fonte: FonteDoCatalogo,
  carreira: string,
): Promise<TrilhaOferecida | null> {
  const pontosQueJaTem = await repo.colecao('pontos').todosDoUsuario();
  // Pontos na lixeira (excluidoEm) não contam: quem apagou a Trilha ganha a oferta de volta.
  if (pontosQueJaTem.some((p) => !p.excluidoEm)) return null;
  let edital: EditalDoCatalogo | undefined;
  try {
    edital = editaisOferecidos(await fonte.obter(carreira))[0];
  } catch (e) {
    if (e instanceof CatalogoIndisponivel) return null;
    throw e;
  }
  if (!edital) return null;
  const linhas = linhasDoEdital(edital);
  return {
    edital,
    rotulo: rotuloDoEdital(edital),
    materias: new Set(linhas.map((l) => l.disciplina)).size,
    pontos: linhas.length,
  };
}

/** Grava a Trilha oferecida: os Pontos entram como uma importação, que dá para desfazer. */
export async function montarTrilha(repo: Repositorio, oferta: TrilhaOferecida): Promise<void> {
  const linhas = linhasDoEdital(oferta.edital);
  const preparado = await prepararPontos(repo, linhas, JSON.stringify(linhas));
  // Nada novo (Trilha já montada, duplo toque): não grava snapshot nem log vazios.
  if (!preparado.previa.escreve) return;
  await aplicar(repo, preparado.pacote, preparado.previa, new Map(), {
    descricao: `Trilha pelo catálogo (${oferta.rotulo})`,
  });
}
