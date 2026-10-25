// Faixa discreta no alto (plano §4): só quando outro aparelho está em uso (aqui é leitura) ou quando
// não deu para confirmar (sem rede: edita com aviso, Q1). Quem só tem um aparelho nunca a vê.
import { useState } from 'react';
import { useConectado } from '../componentes/conexao';
import { useSincronizacao } from './contexto';
import { AVISO_DA_POSSE } from './rotulos';

export function AvisoDePosse() {
  const sync = useSincronizacao();
  const conectado = useConectado();
  const [passando, setPassando] = useState(false);
  if (!sync?.estado.ligada) return null;
  const posse = sync.estado.posse;
  const texto = AVISO_DA_POSSE[posse.tipo];
  if (!texto) return null;
  // Sem rede, "de outro" não trava nada (Q1): o aviso é o de sem confirmação.
  const soLeitura = posse.tipo === 'de-outro' && conectado;
  return (
    <div className="faixa-posse" role="status">
      <span>{soLeitura ? texto : AVISO_DA_POSSE['sem-confirmacao']}</span>
      {soLeitura && (
        <button
          type="button"
          className="botao discreto"
          disabled={passando}
          onClick={() => {
            setPassando(true);
            void sync.editarAqui().finally(() => {
              setPassando(false);
            });
          }}
        >
          {passando ? 'Passando…' : 'Passar a editar aqui'}
        </button>
      )}
    </div>
  );
}
