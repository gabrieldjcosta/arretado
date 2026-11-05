// Os pares de artigos parecidos de uma norma (a base do "Ache a diferença"): os artigos que a incidência
// da banca põe nas três faixas de cima, comparados pelo texto que a pessoa tem no aparelho
// (`sugerirPares`). Sem Mapa (sem peso) não há par: o par nasce da incidência, não só da semelhança.
import type { ParDoFio } from '../../../dominios/fio';
import { sugerirPares, type ArtigoParaPar } from '../../../dominios/legislacao/pares';
import type { NormaAberta } from '../../../dominios/legislacao/leitor';
import type { QuadradoDoMapa } from '../../../dominios/legislacao/mapa-da-norma';
import type { Repositorio } from '../../../core/persistencia';

/** Quantos artigos (os de maior peso) entram na comparação: o custo cresce com o quadrado deles. */
const CANDIDATOS = 150;
const PARES_POR_NORMA = 5;

const porVersao = new Map<string, readonly ParDoFio[]>();

export async function paresDaNorma(
  repo: Repositorio,
  aberta: NormaAberta,
  quadrados: readonly QuadradoDoMapa[],
): Promise<readonly ParDoFio[]> {
  const guardado = porVersao.get(aberta.versao.id);
  if (guardado) return guardado;
  const candidatos = quadrados
    .filter(
      (q) =>
        q.peso > 0 && (q.classe === 'altissima' || q.classe === 'alta' || q.classe === 'media'),
    )
    .sort((a, b) => b.peso - a.peso || a.indice - b.indice)
    .slice(0, CANDIDATOS);
  // Sem peso o Mapa não chegou (ou a norma não tem): não guarda, para a próxima entrada tentar de novo.
  if (candidatos.length < 2) return [];
  const textos = await repo.colecao('textosDispositivo').obterPorChaves(
    '[versaoId+dispositivoId]',
    candidatos.map((q) => [aberta.versao.id, aberta.nos[q.indice]?.dispositivo.id ?? '']),
  );
  const artigos: ArtigoParaPar[] = [];
  candidatos.forEach((q, i) => {
    const trechos = textos[i]?.trechos;
    if (!trechos || trechos.some((t) => t.tachado)) return;
    artigos.push({
      endereco: q.endereco,
      rotulo: q.rotulo,
      texto: trechos
        .map((t) => t.texto)
        .join('')
        .trim(),
      peso: q.peso,
    });
  });
  const pares = sugerirPares(artigos, { maximo: PARES_POR_NORMA }).map((p): ParDoFio => ({
    a: { endereco: p.a.endereco, rotulo: p.a.rotulo },
    b: { endereco: p.b.endereco, rotulo: p.b.rotulo },
  }));
  porVersao.set(aberta.versao.id, pares);
  return pares;
}
