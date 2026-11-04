// Guardar em um toque (D-D25 §5): a Frase correta, já escrita, tirada da lei, vai ao caderno de Frases
// com o link de volta ao dispositivo. Só a Frase correta é obrigatória (D25). A Frase nasce com revisão
// em 1 dia: o artigo volta amanhã.
import type { Repositorio } from '../../../core/persistencia';
import type { FonteDoItem } from '../../../dominios/legislacao/ache-o-erro';
import { criarFraseDeTrecho } from '../../../dominios/recall/servico';

export async function guardarFraseDaFonte(repo: Repositorio, fonte: FonteDoItem): Promise<void> {
  await criarFraseDeTrecho(repo, {
    texto: fonte.texto,
    trecho: {
      dispositivoId: fonte.dispositivoId,
      versaoId: fonte.versaoId,
      texto: fonte.texto,
      inicio: fonte.deslocamento,
      fim: fonte.deslocamento + fonte.texto.length,
    },
  });
}
