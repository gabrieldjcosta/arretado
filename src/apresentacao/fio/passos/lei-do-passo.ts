// O texto que o passo Ler mostra no cartão: os dispositivos dos artigos do passo (o caput, os parágrafos e os
// incisos), cada um com os trechos que o app grifa (prazos, condições, termos absolutos, penas). Os grifos são
// os do destaque automático do Leitor (`detectarDestaques`): os mesmos que o Lembrar esconde numa lacuna.
import type { Repositorio } from '../../../core/persistencia';
import type { Passo } from '../../../dominios/fio';
import {
  detectarDestaques,
  type CategoriaDestaque,
  type Destaque,
} from '../../../dominios/legislacao/destaques';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { fontesDoArtigo } from '../../../dominios/legislacao/lembrar';
import { referenciaDe } from './carregar';

export interface ParagrafoDaLei {
  chave: string;
  /** "Art. 112, III": o que vem antes do texto, em destaque. */
  rotulo: string;
  texto: string;
  grifos: readonly Destaque[];
}

type PassoLer = Extract<Passo, { tipo: 'ler'; normaId: string }>;

/** "ECA · Art. 121, § 2º" vira "Art. 121, § 2º": o título da norma já está no alto do cartão. */
export const rotuloSemNorma = (referencia: string): string => {
  const corte = referencia.indexOf(' · ');
  return corte < 0 ? referencia : referencia.slice(corte + 3);
};

/** "LEP · Art. 112, III" vira "LEP, art. 112, III": a citação que fecha a Frase certa do cartão. */
export const citacaoDaFonte = (referencia: string): string =>
  referencia.replace(' · ', ', ').replace(/\bArt\./, 'art.');

export async function leiDoPasso(repo: Repositorio, passo: PassoLer): Promise<ParagrafoDaLei[]> {
  const aberta = await abrirNorma(repo, passo.normaId);
  const saida: ParagrafoDaLei[] = [];
  for (const artigo of passo.artigos) {
    for (const fonte of await fontesDoArtigo(repo, aberta, artigo, referenciaDe)) {
      saida.push({
        chave: fonte.dispositivoId,
        rotulo: rotuloSemNorma(fonte.referencia),
        texto: fonte.texto,
        grifos: detectarDestaques(fonte.texto),
      });
    }
  }
  return saida;
}

/** A frase da legenda enquanto cada categoria de grifo acende (o mockup: "Grifando as frações…"). */
export const LEGENDA_DA_CATEGORIA: Readonly<Record<CategoriaDestaque, string>> = {
  prazo: 'Grifando os prazos…',
  condicao: 'Grifando as condições…',
  absoluto: 'Grifando os termos absolutos…',
  pena: 'Grifando as penas…',
};

const NOME_DA_CATEGORIA: Readonly<Record<CategoriaDestaque, string>> = {
  prazo: 'prazos',
  condicao: 'condições',
  absoluto: 'termos absolutos',
  pena: 'penas',
};

/** O fecho da legenda: o que o app grifou, na ordem da legenda ("prazos, condições e penas"). */
export function legendaFinal(categorias: ReadonlySet<CategoriaDestaque>): string {
  const nomes = (['prazo', 'condicao', 'absoluto', 'pena'] as const)
    .filter((c) => categorias.has(c))
    .map((c) => NOME_DA_CATEGORIA[c]);
  if (nomes.length === 0) return 'Nada aqui costuma ser trocado: leia com calma.';
  const ultimo = nomes.pop();
  const lista = nomes.length > 0 ? `${nomes.join(', ')} e ${ultimo ?? ''}` : (ultimo ?? '');
  return `O app grifou para você: ${lista}.`;
}
