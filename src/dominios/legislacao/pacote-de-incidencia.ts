// Pacote de incidência → estrelas (F7, ligação mínima). O pacote traz, por norma, os números de
// artigo de maior incidência; cada um vira uma estrela `pacote` no dispositivo `art<N>` da árvore.
// Quem já tem estrela (direta, pacote ou herdada) ou exceção fica como está: o pacote nunca desfaz
// uma escolha do usuário.
import type { Estrela } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import {
  estrelaEfetiva,
  estrelasDaNorma,
  estrelavel,
  porAlvo,
  type ArvoreDaEstrela,
} from './estrelas';

/** `180-A` → `art180A`, `5` → `art5` (endereço canônico do artigo). */
export function enderecoDoArtigo(numero: string): string {
  return `art${numero.replace(/[^0-9a-zA-Z]/g, '')}`;
}

export interface PacoteAplicado {
  /** Alvos que ganharam estrela de pacote. */
  gravadas: string[];
  /** Números sem artigo estrelável na norma (revogado, vetado ou fora da árvore). */
  ausentes: string[];
  /** Números que já estavam estrelados ou com exceção do usuário. */
  mantidas: string[];
}

export async function aplicarPacote(
  repo: Repositorio,
  arvore: ArvoreDaEstrela,
  pacoteId: string,
  numeros: readonly string[],
  enderecoPorId: ReadonlyMap<string, string>,
): Promise<PacoteAplicado> {
  const idPorEndereco = new Map<string, string>();
  for (const [id, endereco] of enderecoPorId) idPorEndereco.set(endereco, id);
  const resultado: PacoteAplicado = { gravadas: [], ausentes: [], mantidas: [] };
  await repo.transacao(async () => {
    const gravadas = porAlvo(await estrelasDaNorma(repo, arvore.normaId));
    for (const numero of numeros) {
      const id = idPorEndereco.get(enderecoDoArtigo(numero));
      const no = id === undefined ? undefined : arvore.porId.get(id);
      if (id === undefined || !no || !estrelavel(no)) {
        resultado.ausentes.push(numero);
        continue;
      }
      if (gravadas.has(id) || estrelaEfetiva(arvore, gravadas, id).estrelado) {
        resultado.mantidas.push(numero);
        continue;
      }
      const criada: Estrela = await repo
        .colecao('estrelas')
        .criar({ normaId: arvore.normaId, alvoId: id, origemTipo: 'pacote', pacoteId });
      gravadas.set(id, criada);
      resultado.gravadas.push(numero);
    }
  });
  return resultado;
}
