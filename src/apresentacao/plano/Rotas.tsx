// Rotas de `/plano/*` (P0 registra; o App não muda depois). A raiz é a tela atual do Plano; cada
// subárvore é de um pacote: `onboarding` = B2, `pontos` = B3, `tarefas` = B4. Cada pacote troca só o
// componente da própria pasta e, aqui, a linha da própria rota.
import { Route, Routes } from 'react-router';
import { CicloDeEstudo } from './ciclo/Ciclo';
import { Onboarding } from './onboarding/Onboarding';
import { Plano } from './Plano';
import { Pontos } from './pontos/Pontos';
import { Tarefas } from './tarefas/Tarefas';

export function RotasDoPlano() {
  return (
    <Routes>
      <Route index element={<Plano />} />
      <Route path="onboarding/*" element={<Onboarding />} />
      <Route path="ciclo/*" element={<CicloDeEstudo />} />
      <Route path="pontos/*" element={<Pontos />} />
      <Route path="tarefas/*" element={<Tarefas />} />
    </Routes>
  );
}
