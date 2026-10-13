// Bloco "Agora" do Hoje (pacote A1). No P0 mantém o comportamento anterior: revisão vencida ou vazio.
import { AcaoAgora } from '../componentes/AcaoAgora';
import { Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { vencidosHoje } from '../recall/carregadores';

export function Agora() {
  const { dados: vencidos } = useDados(vencidosHoje);
  if (vencidos !== undefined && vencidos > 0) {
    return (
      <AcaoAgora
        titulo={
          vencidos === 1 ? '1 cartão para revisar.' : `${String(vencidos)} cartões para revisar.`
        }
        rotuloBotao="Revisar"
        para="/recall/revisar"
      />
    );
  }
  return (
    <Vazio titulo="Nenhuma revisão hoje">
      <p>O Hoje completo (ponto do dia e fechamento) chega numa próxima fase.</p>
    </Vazio>
  );
}
