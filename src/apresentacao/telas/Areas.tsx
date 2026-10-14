import { Link } from 'react-router';
import { Vazio } from '../componentes/estados';

// O Hoje saiu daqui no P0 da F3 (agora é `hoje/Hoje.tsx`); este arquivo fica fechado.
export function NaoEncontrada() {
  return (
    <Vazio titulo="Tela não encontrada" acao={<Link to="/">Ir para o Hoje</Link>}>
      <p>O endereço não corresponde a nenhuma tela do Arretado.</p>
    </Vazio>
  );
}
