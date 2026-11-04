// O passo Guardar do Fio (D-D25): depois de um Lembrar com erro, a Frase certa de cada artigo
// errado, já escrita (tirada da lei), e um toque para guardar. Nada é obrigatório: dá para seguir
// sem guardar nenhuma. Não conta no tamanho da etapa (regra 4 do gerador).
import { useState } from 'react';
import type { LembrarDoArtigo } from '../../../dominios/legislacao/lembrar';
import { FraseGuardavel } from './FraseGuardavel';
import '../../recall/estilos-ache-o-erro.css';
import './passos.css';

export function GuardarDoFio({
  itens,
  aoConcluir,
}: {
  itens: readonly LembrarDoArtigo[];
  aoConcluir: (resultado: { guardadas: number }) => void;
}) {
  const [guardadas, setGuardadas] = useState(0);
  return (
    <div className="coluna-drill fio-passo">
      <h2 className="fio-titulo">Guardar</h2>
      <p className="ache-instrucao">
        {itens.length === 1 ? 'Esta frase vale guardar.' : 'Estas frases valem guardar.'}
      </p>
      <ul className="fio-lista">
        {itens.map(({ artigoEndereco, pergunta }) => {
          const fonte = pergunta.tipo === 'lacuna' ? pergunta.lacuna.fonte : pergunta.cartao.fonte;
          return (
            <li key={artigoEndereco} className="cartao-bloco ache-folha">
              <p className="ache-referencia">{fonte.referencia}</p>
              <p className="ache-texto">{fonte.texto}</p>
              <FraseGuardavel
                fonte={fonte}
                aoGuardar={() => {
                  setGuardadas((n) => n + 1);
                }}
              />
            </li>
          );
        })}
      </ul>
      <div className="linha-acoes acoes-drill ache-respostas">
        <button
          type="button"
          className="principal grande"
          onClick={() => {
            aoConcluir({ guardadas });
          }}
        >
          Seguir
        </button>
      </div>
    </div>
  );
}
