// "Guardar um erro" no Fio (a `folha-erro` do mockup): a Frase certa, de onde veio e, se a pessoa quiser, o artigo a que ela
// se liga. As sugestões de artigo são do que a pessoa está estudando agora (os passos Ler da etapa), nunca uma lista de
// exemplo. A Frase leva o `trecho` do artigo, e é isso que acende o "Ler na lei" no Caderno.
import type { Repositorio } from '../../../core/persistencia';
import type { Passo } from '../../../dominios/fio';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import { fontesDoArtigo } from '../../../dominios/legislacao/lembrar';
import { fraseDoErro, registrarErro } from '../../../dominios/recall/servico';
import { citacaoDaFonte } from '../passos/lei-do-passo';
import { referenciaDe } from '../passos/carregar';

/** Quantos artigos a folha sugere (o mockup mostra dois). */
const SUGESTOES = 2;

/** De onde o erro veio (os chips do mockup); guardado em `fonte.prova`, que não é obrigatória. */
export const ORIGENS_DO_ERRO = ['Questão', 'Aula', 'Simulado', 'Lei'] as const;
export type OrigemDoErro = (typeof ORIGENS_DO_ERRO)[number];

export interface ArtigoSugerido {
  dispositivoId: string;
  versaoId: string;
  /** "LEP, art. 112, III". */
  citacao: string;
  /** O texto vigente do dispositivo, para o "Ler na lei" e para o trecho da Frase. */
  texto: string;
}

/** Os dispositivos dos primeiros artigos que a etapa manda ler, sem repetir. */
export async function artigosSugeridos(
  repo: Repositorio,
  passos: readonly Passo[],
): Promise<ArtigoSugerido[]> {
  const saida: ArtigoSugerido[] = [];
  for (const passo of passos) {
    if (passo.tipo !== 'ler' || !('normaId' in passo)) continue;
    const aberta = await abrirNorma(repo, passo.normaId);
    for (const artigo of passo.artigos) {
      for (const f of await fontesDoArtigo(repo, aberta, artigo, referenciaDe)) {
        if (saida.some((s) => s.dispositivoId === f.dispositivoId)) continue;
        saida.push({
          dispositivoId: f.dispositivoId,
          versaoId: f.versaoId,
          citacao: citacaoDaFonte(f.referencia),
          texto: f.texto,
        });
        if (saida.length >= SUGESTOES) return saida;
      }
    }
  }
  return saida;
}

/** Guarda o erro (e a Frase dele); com artigo, a Frase leva o link de volta ao dispositivo. Devolve o id para o "Desfazer". */
export async function guardarErroDoFio(
  repo: Repositorio,
  entrada: { texto: string; origem?: OrigemDoErro; artigo?: ArtigoSugerido },
): Promise<string> {
  const erro = await registrarErro(repo, {
    fraseCorreta: entrada.texto,
    ...(entrada.origem ? { fonte: { prova: entrada.origem } } : {}),
    ...(entrada.artigo ? { dispositivoId: entrada.artigo.dispositivoId } : {}),
  });
  const a = entrada.artigo;
  if (a) {
    const frase = await fraseDoErro(repo, erro.id);
    if (frase) {
      await repo.colecao('frases').atualizar(frase.id, {
        trecho: {
          dispositivoId: a.dispositivoId,
          versaoId: a.versaoId,
          texto: a.texto.slice(0, 5_000),
          inicio: 0,
          fim: a.texto.length,
        },
      });
    }
  }
  return erro.id;
}
