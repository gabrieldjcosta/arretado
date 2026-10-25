// Faixa discreta no alto (plano §4): só quando outro aparelho está em uso (aqui é leitura) ou quando
// não deu para confirmar (sem rede: edita com aviso, Q1). Quem só tem um aparelho nunca a vê.
// Uma escrita recusada pela trava muda a faixa para alerta por alguns segundos: é o aviso comum
// das telas que gravam (nenhuma trata `EscritaBloqueada` por conta própria).
import { useEffect, useState } from 'react';
import { useConectado } from '../componentes/conexao';
import { useSincronizacao } from './contexto';
import { AVISO_DA_POSSE, AVISO_DE_BLOQUEIO } from './rotulos';

/** Por quanto tempo a faixa fica em alerta depois de uma escrita recusada. */
export const ALERTA_DE_BLOQUEIO_MS = 6_000;

export function AvisoDePosse() {
  const sync = useSincronizacao();
  const conectado = useConectado();
  const [passando, setPassando] = useState(false);
  const bloqueioEm = sync?.estado.bloqueioEm ?? null;
  // Guarda qual recusa já expirou; o timer só marca a expiração (nada de relógio na renderização).
  const [expirado, setExpirado] = useState<number | null>(null);
  useEffect(() => {
    if (bloqueioEm === null) return;
    const timer = setTimeout(() => {
      setExpirado(bloqueioEm);
    }, ALERTA_DE_BLOQUEIO_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [bloqueioEm]);
  const alerta = bloqueioEm !== null && expirado !== bloqueioEm;
  if (!sync?.estado.ligada) return null;
  const posse = sync.estado.posse;
  const texto = AVISO_DA_POSSE[posse.tipo];
  if (!texto) return null;
  // Sem rede, "de outro" não trava nada (Q1): o aviso é o de sem confirmação.
  const soLeitura = posse.tipo === 'de-outro' && conectado;
  const emAlerta = soLeitura && alerta;
  return (
    <div
      className={emAlerta ? 'faixa-posse faixa-posse-alerta' : 'faixa-posse'}
      role={emAlerta ? 'alert' : 'status'}
    >
      <span>
        {emAlerta ? AVISO_DE_BLOQUEIO : soLeitura ? texto : AVISO_DA_POSSE['sem-confirmacao']}
      </span>
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
