// Rotas de `/sessao/*` (P0 registra; o pacote A2 é dono desta pasta e define as rotas internas).
// `alavancas/` é do pacote A3a. O App não muda depois do P0.
import { Link, Route, Routes } from 'react-router';
import { Vazio } from '../componentes/estados';

function SessaoEmBreve() {
  return (
    <Vazio titulo="Sessão" acao={<Link to="/">Ir para o Hoje</Link>}>
      <p>Esta tela chega em breve.</p>
    </Vazio>
  );
}

export function RotasDaSessao() {
  return (
    <Routes>
      <Route path="*" element={<SessaoEmBreve />} />
    </Routes>
  );
}
