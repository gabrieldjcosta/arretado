// Encaixe de `/plano/onboarding/*` (pacote B2). Vazio no P0: o pacote dono preenche.
import { Link } from 'react-router';
import { Vazio } from '../../componentes/estados';

export function Onboarding() {
  return (
    <Vazio titulo="Começar o plano" acao={<Link to="/plano">Ir para o Plano</Link>}>
      <p>Esta tela chega em breve.</p>
    </Vazio>
  );
}
