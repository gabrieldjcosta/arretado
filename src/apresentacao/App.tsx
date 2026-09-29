import { HashRouter, Route, Routes } from 'react-router';
import type { Repositorio } from '../core/persistencia';
import { Importar } from './biblioteca/Importar';
import { Normas } from './biblioteca/Normas';
import { AparenciaConta } from './conta/AparenciaConta';
import { Conta } from './conta/Conta';
import { Dados } from './conta/dados/Dados';
import { Privacidade } from './conta/Privacidade';
import { ProvedorRepositorio } from './dados/ProvedorRepositorio';
import { Orientacoes } from './orientacoes/Orientacoes';
import { Shell } from './Shell';
import { DetalheErro } from './recall/DetalheErro';
import { Drill } from './recall/Drill';
import { EditarCartao } from './recall/EditarCartao';
import { Historico } from './recall/Historico';
import { ListaCartoes } from './recall/ListaCartoes';
import { ListaErros } from './recall/ListaErros';
import { ListaFrases } from './recall/ListaFrases';
import { RecallInicio } from './recall/RecallInicio';
import { RegistrarErro } from './recall/RegistrarErro';
import { Plano } from './plano/Plano';
import { Hoje, NaoEncontrada } from './telas/Areas';
import './estilos.css';

export function App({ abrir }: { abrir?: () => Promise<Repositorio> }) {
  return (
    <ProvedorRepositorio {...(abrir ? { abrir } : {})}>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Hoje />} />
            <Route path="plano" element={<Plano />} />
            <Route path="recall" element={<RecallInicio />}>
              <Route index element={<ListaErros />} />
              <Route path="frases" element={<ListaFrases />} />
              <Route path="cartoes" element={<ListaCartoes />} />
              <Route path="historico" element={<Historico />} />
            </Route>
            <Route path="recall/registrar" element={<RegistrarErro />} />
            <Route path="recall/revisar" element={<Drill />} />
            <Route path="recall/erros/:id" element={<DetalheErro />} />
            <Route path="recall/cartoes/:id" element={<EditarCartao />} />
            <Route path="biblioteca" element={<Normas />} />
            {/* Uma rota só: ao colar, o id entra na rota sem desmontar a tela. */}
            <Route path="biblioteca/importar/:versaoId?" element={<Importar />} />
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
