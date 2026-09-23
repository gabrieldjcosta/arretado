import { HashRouter, Route, Routes } from 'react-router';
import type { Repositorio } from '../core/persistencia';
import { AparenciaConta } from './conta/AparenciaConta';
import { Conta } from './conta/Conta';
import { Dados } from './conta/dados/Dados';
import { Privacidade } from './conta/Privacidade';
import { ProvedorRepositorio } from './dados/ProvedorRepositorio';
import { Orientacoes } from './orientacoes/Orientacoes';
import { Shell } from './Shell';
import { Biblioteca, Hoje, NaoEncontrada, Plano, Recall } from './telas/Areas';
import './estilos.css';

export function App({ abrir }: { abrir?: () => Promise<Repositorio> }) {
  return (
    <ProvedorRepositorio {...(abrir ? { abrir } : {})}>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Hoje />} />
            <Route path="plano" element={<Plano />} />
            <Route path="recall" element={<Recall />} />
            <Route path="biblioteca" element={<Biblioteca />} />
            <Route path="conta" element={<Conta />} />
            <Route path="conta/aparencia" element={<AparenciaConta />} />
            <Route path="conta/dados" element={<Dados />} />
            <Route path="conta/privacidade" element={<Privacidade />} />
            <Route path="orientacoes" element={<Orientacoes />} />
            <Route path="orientacoes/:secao" element={<Orientacoes />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProvedorRepositorio>
  );
}
