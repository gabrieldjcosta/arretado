// Encaixe de `/plano/tarefas/*` (pacote B4). Vazio no P0: o pacote dono preenche.
import { Link } from 'react-router';
import { Vazio } from '../../componentes/estados';

export function Tarefas() {
  return (
    <Vazio titulo="Tarefas" acao={<Link to="/plano">Ir para o Plano</Link>}>
      <p>Esta tela chega em breve.</p>
    </Vazio>
  );
}
