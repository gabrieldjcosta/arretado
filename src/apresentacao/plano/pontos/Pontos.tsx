// `/plano/pontos/*` (pacote B3): lista por matéria e detalhe do ponto.
import { Route, Routes } from 'react-router';
import { DetalheDoPonto } from './DetalheDoPonto';
import { ListaDePontos } from './ListaDePontos';

export function Pontos() {
  return (
    <Routes>
      <Route index element={<ListaDePontos />} />
      <Route path=":id" element={<DetalheDoPonto />} />
    </Routes>
  );
}
