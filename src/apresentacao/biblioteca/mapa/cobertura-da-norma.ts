// O que a pessoa já cobriu de uma norma e o próximo trecho do Mapa da norma (AP-04), para a tela do
// mapa e para o Hoje dizerem a mesma coisa. Só lê; a conta pura fica em `mapa-da-norma.ts`.
import type { Repositorio } from '../../../core/persistencia';
import { estrelasDaNorma } from '../../../dominios/legislacao/estrelas';
import type { FonteDeIncidencia } from '../../../dominios/legislacao/incidencia-fonte';
import { abrirNorma, type NormaAberta } from '../../../dominios/legislacao/leitor';
import { obterLeitura } from '../../../dominios/legislacao/leituras';
import {
  cobertura,
  proximoTrecho,
  quadradosDoMapa,
  rotuloDoTrecho,
  type Faixa,
} from '../../../dominios/legislacao/mapa-da-norma';
import { marcacoesDaNorma } from '../../../dominios/legislacao/marcacoes';
import { dispositivosComErro } from '../errosVinculados';
import { artigosFeitos } from './feitos';

export interface CoberturaDaNorma {
  aberta: NormaAberta;
  /** Índice do nó do "lido até", se há. */
  lidoAte: number | undefined;
  /** Índices dos nós com grifo, nota, Estrela direta ou Erro da pessoa. */
  marcados: ReadonlySet<number>;
}

/** Abre a norma e junta o "lido até" e as marcas da pessoa (índices de nós). */
export async function coberturaDaNorma(
  repo: Repositorio,
  normaId: string,
): Promise<CoberturaDaNorma> {
  const aberta = await abrirNorma(repo, normaId);
  const [leitura, marcacoes, estrelas, erros] = await Promise.all([
    // A posição é conveniência: sem ela, o mapa só não tem "lido até".
    obterLeitura(repo, normaId).catch(() => undefined),
    marcacoesDaNorma(repo, normaId, aberta.versao.id),
    estrelasDaNorma(repo, normaId),
    dispositivosComErro(repo, aberta.indiceDe),
  ]);
  const marcados = new Set<number>();
  const marcar = (id: string) => {
    const indice = aberta.indiceDe.get(id);
    if (indice !== undefined) marcados.add(indice);
  };
  for (const id of marcacoes.keys()) marcar(id);
  for (const e of estrelas) if (e.origemTipo === 'direta') marcar(e.alvoId);
  for (const id of erros) marcar(id);
  for (const id of artigosFeitos(normaId)) marcar(id);
  const lidoAte =
    leitura?.lidoAteId === undefined ? undefined : aberta.indiceDe.get(leitura.lidoAteId);
  return { aberta, lidoAte, marcados };
}

/** O próximo trecho do mapa, como o Hoje o chama: "Arts. 61 a 62", a faixa e os minutos. */
export interface TrechoParaLer {
  /** "Art. 157" ou "Arts. 59 a 62". */
  rotulo: string;
  classe: Faixa;
  minutos: number;
  /** Endereço do primeiro artigo (`?ir=` do Leitor). */
  endereco: string;
}

/**
 * O próximo trecho da norma pelo mapa; nada quando a norma não veio do acervo, não tem arquivo de
 * incidência neste aparelho (sem rede e sem cópia guardada), ou tudo o que cai já foi coberto.
 */
export async function trechoParaLer(
  repo: Repositorio,
  fonte: FonteDeIncidencia,
  normaId: string,
): Promise<TrechoParaLer | undefined> {
  const { aberta, lidoAte, marcados } = await coberturaDaNorma(repo, normaId);
  const acervoId = aberta.norma.origemAcervo?.id;
  if (acervoId === undefined) return undefined;
  const carregado = await fonte.mapaDaNorma(acervoId).catch(() => undefined);
  if (carregado === undefined) return undefined;
  const quadrados = quadradosDoMapa(aberta.nos, carregado.dados);
  const trecho = proximoTrecho(quadrados, cobertura(quadrados, lidoAte, marcados).cobertos);
  const primeiro = trecho === undefined ? undefined : quadrados[trecho.de];
  if (trecho === undefined || primeiro === undefined) return undefined;
  return {
    rotulo: rotuloDoTrecho(quadrados, trecho),
    classe: trecho.classe,
    minutos: trecho.minutos,
    endereco: primeiro.endereco,
  };
}
