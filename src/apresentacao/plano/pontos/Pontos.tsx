// Encaixe de `/plano/pontos/*` (pacote B3). Vazio no P0: o pacote dono preenche.
import { Link } from 'react-router';
import { Vazio } from '../../componentes/estados';

export function Pontos() {
  return (
    <Vazio titulo="Pontos do programa" acao={<Link to="/plano">Ir para o Plano</Link>}>
      <p>Esta tela chega em breve.</p>
    </Vazio>
  );
}
