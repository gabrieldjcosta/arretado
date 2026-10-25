import type { ReactNode } from 'react';
import { estadoDaSincronizacao, ROTULO_DO_ESTADO } from '../../core/sincronizacao/estado';
import { LinhaLista } from '../componentes/LinhaLista';
import { Selo } from '../componentes/Selo';
import { useSincronizacao } from '../sincronizacao/contexto';

/** Linha "Sincronização" do menu da Conta, com o selo dos três estados quando está ligada. */
export function LinhaDeSincronizacao() {
  const sync = useSincronizacao();
  const estado = sync?.estado;
  let apoio = 'Seus Aparelhos iguais, sem você fazer nada';
  let selo: ReactNode = null;
  if (estado?.ligada) {
    const tres = estadoDaSincronizacao({
      pendentes: estado.pendentes,
      ultimaRodada: estado.ultimaRodada,
      conflitos: estado.conflitos,
    });
    selo = <Selo>{ROTULO_DO_ESTADO[tres]}</Selo>;
    apoio =
      estado.conflitos > 0
        ? estado.conflitos === 1
          ? '1 Conflito para decidir'
          : `${String(estado.conflitos)} Conflitos para decidir`
        : 'Ligada';
  } else if (estado?.parada === 'sem-aceite') {
    apoio = 'Desligada. Ligar leva um toque';
  }
  return (
    <LinhaLista para="/conta/sincronizacao" titulo="Sincronização" apoio={apoio} selo={selo} />
  );
}
