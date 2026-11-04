// Guardar em um toque (D-D25 §5, porta 1 do Registrar erro): a Frase correta já escrita, tirada da
// lei, vai ao caderno de Frases com o link de volta ao dispositivo. Só a Frase correta é
// obrigatória (D25): nenhum campo a mais. O artigo volta amanhã (a Frase nasce com revisão em 1 dia).
import { useState } from 'react';
import type { FonteDoItem } from '../../../dominios/legislacao/ache-o-erro';
import { criarFraseDeTrecho } from '../../../dominios/recall/servico';
import { useRepositorio } from '../../dados/contexto';

type Estado = 'parada' | 'guardando' | 'guardada' | 'falhou';

export function FraseGuardavel({
  fonte,
  aoGuardar,
}: {
  fonte: FonteDoItem;
  /** Chamado uma vez, depois de gravar. */
  aoGuardar?: () => void;
}) {
  const repo = useRepositorio();
  const [estado, setEstado] = useState<Estado>('parada');

  const guardar = async () => {
    if (estado === 'guardando' || estado === 'guardada') return;
    setEstado('guardando');
    try {
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
      setEstado('guardada');
      aoGuardar?.();
    } catch {
      setEstado('falhou');
    }
  };

  if (estado === 'guardada') {
    return (
      <p className="fio-guardada" role="status">
        Frase guardada. Volta amanhã.
      </p>
    );
  }
  return (
    <div className="fio-guardar">
      <button
        type="button"
        className="botao"
        disabled={estado === 'guardando'}
        onClick={() => void guardar()}
      >
        Guardar esta Frase
      </button>
      {estado === 'falhou' && (
        <p role="alert" className="aviso falha">
          Não foi possível guardar. Nada foi alterado.
        </p>
      )}
    </div>
  );
}
