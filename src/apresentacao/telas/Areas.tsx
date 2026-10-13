import { Link } from 'react-router';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { vencidosHoje } from '../recall/carregadores';

export function Hoje() {
  const { dados: vencidos } = useDados(vencidosHoje);
  return (
    <>
      <h1>Hoje</h1>
      {vencidos !== undefined && vencidos > 0 ? (
        <AcaoAgora
          titulo={
            vencidos === 1 ? '1 cartão para revisar.' : `${String(vencidos)} cartões para revisar.`
          }
          rotuloBotao="Revisar"
          para="/recall/revisar"
        />
      ) : (
        <Vazio titulo="Nenhuma revisão hoje">
          <p>O Hoje completo (ponto do dia e fechamento) chega numa próxima fase.</p>
        </Vazio>
      )}
    </>
  );
}

export function NaoEncontrada() {
  return (
    <Vazio titulo="Tela não encontrada" acao={<Link to="/">Ir para o Hoje</Link>}>
      <p>O endereço não corresponde a nenhuma tela do Arretado.</p>
    </Vazio>
  );
}
