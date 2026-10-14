import { HashRouter, Route, Routes } from 'react-router';
import type { Repositorio } from '../core/persistencia';
import type { FonteDoAcervo } from '../dominios/acervo/fonte';
import { Acervo } from './biblioteca/Acervo';
import { Colecoes } from './biblioteca/Colecoes';
import { ProvedorFonteAcervo } from './dados/fonteAcervo';
import { Importar } from './biblioteca/Importar';
import { Leitor } from './biblioteca/Leitor';
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
import { CartaoDeLacuna } from './recall/CartaoDeLacuna';
import { EditarCartao } from './recall/EditarCartao';
import { Historico } from './recall/Historico';
import { ListaCartoes } from './recall/ListaCartoes';
import { ListaErros } from './recall/ListaErros';
import { ListaFrases } from './recall/ListaFrases';
import { RecallInicio } from './recall/RecallInicio';
import { RegistrarErro } from './recall/RegistrarErro';
import { RevisarFrases } from './recall/RevisarFrases';
import { Hoje } from './hoje/Hoje';
import { RotasDoPlano } from './plano/Rotas';
import { RotasDaSessao } from './sessao/Rotas';
import { NaoEncontrada } from './telas/Areas';
import './estilos.css';

export function App({
  abrir,
  fonteAcervo,
}: {
  abrir?: () => Promise<Repositorio>;
  fonteAcervo?: FonteDoAcervo;
}) {
  return (
    <ProvedorRepositorio {...(abrir ? { abrir } : {})}>
      <ProvedorFonteAcervo fonte={fonteAcervo}>
        <HashRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Hoje />} />
              <Route path="plano/*" element={<RotasDoPlano />} />
              <Route path="sessao/*" element={<RotasDaSessao />} />
              <Route path="recall" element={<RecallInicio />}>
                <Route index element={<ListaErros />} />
                <Route path="frases" element={<ListaFrases />} />
                <Route path="cartoes" element={<ListaCartoes />} />
                <Route path="historico" element={<Historico />} />
              </Route>
              <Route path="recall/registrar" element={<RegistrarErro />} />
              <Route path="recall/revisar" element={<Drill />} />
              <Route path="recall/frases/revisar" element={<RevisarFrases />} />
              <Route path="recall/frases/:id/cartao" element={<CartaoDeLacuna />} />
              <Route path="recall/erros/:id" element={<DetalheErro />} />
              <Route path="recall/cartoes/:id" element={<EditarCartao />} />
              <Route path="biblioteca" element={<Normas />} />
              <Route path="biblioteca/acervo" element={<Acervo />} />
              <Route path="biblioteca/sumulas" element={<Colecoes especie="sumulas" />} />
              <Route path="biblioteca/teses" element={<Colecoes especie="teses" />} />
              {/* Uma rota só: ao colar, o id entra na rota sem desmontar a tela. */}
              <Route path="biblioteca/importar/:versaoId?" element={<Importar />} />
              <Route path="biblioteca/normas/:normaId" element={<Leitor />} />
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
      </ProvedorFonteAcervo>
    </ProvedorRepositorio>
  );
}
