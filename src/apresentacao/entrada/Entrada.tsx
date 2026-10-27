import { useEffect } from 'react';
import { lembrarDaEntrada, type Abertura } from './regras';

/**
 * A Entrada do Dia (S4, 27/10/2026): deixou de ser uma folha modal. É uma linha quieta logo abaixo do
 * Agora, com a saudação e a dica de hoje; quem não a lê não perde nada e ninguém precisa fechá-la. A folha que
 * recebe quem volta depois de dias é o Retorno (`BoasVindas`). Grava ao aparecer: fechar o aplicativo
 * não a traz de volta no mesmo Dia.
 */
export function Entrada({ abertura }: { abertura: Extract<Abertura, { tipo: 'entrada' }> }) {
  const { dia, saudacao, conteudo } = abertura;
  const { dica } = conteudo;
  useEffect(() => {
    lembrarDaEntrada(dia);
  }, [dia]);
  return (
    <p className="linha-do-dia">
      <span className="linha-do-dia-saudacao">{saudacao}.</span> <strong>{dica.destaque}</strong>{' '}
      {dica.texto}
    </p>
  );
}
