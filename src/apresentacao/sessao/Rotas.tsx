// Rotas de `/sessao/*` (A2). `alavancas/` é do pacote A3a. O App não muda depois do P0.
import { Navigate, Route, Routes } from 'react-router';
import { Atual } from './Atual';
import { Fechar } from './Fechar';
import { Iniciar } from './Iniciar';

export function RotasDaSessao() {
  return (
    <Routes>
      <Route path="iniciar" element={<Iniciar />} />
      <Route path="atual" element={<Atual />} />
      <Route path="fechar" element={<Fechar />} />
      <Route path="*" element={<Navigate to="/sessao/iniciar" replace />} />
    </Routes>
  );
}
