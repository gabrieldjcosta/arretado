import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { NOME_BANCO_PRINCIPAL, Repositorio } from '../core/persistencia';
import { contasHabilitadas } from '../integracoes/conta';
import type { FonteDoAcervo } from '../dominios/acervo/fonte';
import { Acervo } from './biblioteca/Acervo';
import { Colecoes } from './biblioteca/Colecoes';
import { ProvedorFonteAcervo } from './dados/fonteAcervo';
import { Normas } from './biblioteca/Normas';
import { AparenciaConta } from './conta/AparenciaConta';
import { Perfis } from './conta/Perfis';
import { Conta } from './conta/Conta';
import { ProvedorConta } from './conta/entrar/ContextoConta';
import { Entrar } from './conta/entrar/Entrar';
import { Migracao } from './conta/migracao/Migracao';
import { Privacidade } from './conta/Privacidade';
import { ProvedorRepositorio } from './dados/ProvedorRepositorio';
import { Shell } from './Shell';
import { DetalheErro } from './recall/DetalheErro';
import { Drill } from './recall/Drill';
import { CartaoDeLacuna } from './recall/CartaoDeLacuna';
import { EditarCartao } from './recall/EditarCartao';
import { Historico } from './recall/Historico';
import { ListaCartoes } from './recall/ListaCartoes';
import { ErrosComFiltros } from './recall/ListaErros';
import { ListaFrases } from './recall/ListaFrases';
import { RecallInicio } from './recall/RecallInicio';
import { RegistrarErro } from './recall/RegistrarErro';
import { RegistrarVarios } from './recall/RegistrarVarios';
import { RevisarFrases } from './recall/RevisarFrases';
import { Hoje } from './hoje/Hoje';
import { RotasDoPlano } from './plano/Rotas';
import { RotasDaSessao } from './sessao/Rotas';
import { NaoEncontrada } from './telas/Areas';
import { Esqueleto } from './componentes/estados';
import { ProvedorSincronizacao } from './sincronizacao/ProvedorSincronizacao';
import { LimiteDeErro } from './componentes/LimiteDeErro';
import { Orientacoes } from './orientacoes/Orientacoes';
import './estilos.css';

// Telas pesadas (leitor, importador, backup) saem do pacote inicial: o Hoje abre sem
// baixar o estruturador nem o código de pacote. Offline continua igual (arquivos do mesmo site).
const Importar = lazy(() => import('./biblioteca/Importar').then((m) => ({ default: m.Importar })));
const Resumos = lazy(() =>
  import('./biblioteca/resumos/Resumos').then((m) => ({ default: m.Resumos })),
);
const Resumo = lazy(() =>
  import('./biblioteca/resumos/Resumo').then((m) => ({ default: m.Resumo })),
);
const Precedentes = lazy(() =>
  import('./biblioteca/precedentes/Precedentes').then((m) => ({ default: m.Precedentes })),
);
const Precedente = lazy(() =>
  import('./biblioteca/precedentes/Precedente').then((m) => ({ default: m.Precedente })),
);
const Leitor = lazy(() => import('./biblioteca/Leitor').then((m) => ({ default: m.Leitor })));
// "Escolher meu concurso": duas telas curtas, baixadas só quando a pessoa chega a elas.
const Comecar = lazy(() => import('./comecar/Comecar').then((m) => ({ default: m.Comecar })));
const ParaComecar = lazy(() =>
  import('./comecar/ParaComecar').then((m) => ({ default: m.ParaComecar })),
);
const Dados = lazy(() => import('./conta/dados/Dados').then((m) => ({ default: m.Dados })));
// Sincronização e Conflitos (F4-B, B4): só com conta; fora do pacote inicial.
const Sincronizacao = lazy(() =>
  import('./sincronizacao/Sincronizacao').then((m) => ({ default: m.Sincronizacao })),
);
const Conflitos = lazy(() =>
  import('./sincronizacao/Conflitos').then((m) => ({ default: m.Conflitos })),
);

/**
 * A migração copia do banco sem conta para o da conta, que ela apaga e recria. Depois de entrar a
 * conta já está ativa; se a tela abrisse o banco ativo, a cópia derrubaria a própria conexão
 * ("apagados em outra aba"). Por isso a rota tem provedor próprio, preso ao banco de origem.
 */
const abrirOrigemDaMigracao = () => Repositorio.abrir({ nomeBanco: NOME_BANCO_PRINCIPAL });

// No build de E2E da conta (T30) a posse renova e a puxada roda a cada 2 s, para o teste de três
// aparelhos não esperar os 30 s e 60 s do plano; no build de produção o objeto é vazio e some.
const RITMO_DA_SINCRONIZACAO =
  import.meta.env.MODE === 'e2e-conta' ? { renovacaoMs: 2_000, intervaloDePuxadaMs: 2_000 } : {};

function Carregando({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Esqueleto linhas={4} />}>{children}</Suspense>;
}

export function App({
  abrir,
  fonteAcervo,
}: {
  abrir?: () => Promise<Repositorio>;
  fonteAcervo?: FonteDoAcervo;
}) {
  return (
    <ProvedorConta>
      <ProvedorFonteAcervo fonte={fonteAcervo}>
        <HashRouter>
          <LimiteDeErro>
            <Routes>
              {contasHabilitadas() && (
                <Route
                  element={
                    <ProvedorRepositorio abrir={abrirOrigemDaMigracao}>
                      <Shell />
                    </ProvedorRepositorio>
                  }
                >
                  <Route path="conta/migracao" element={<Migracao />} />
                </Route>
              )}
              <Route
                element={
                  <ProvedorRepositorio {...(abrir ? { abrir } : {})}>
                    {contasHabilitadas() ? (
                      <ProvedorSincronizacao {...RITMO_DA_SINCRONIZACAO}>
                        <Shell />
                      </ProvedorSincronizacao>
                    ) : (
                      <Shell />
                    )}
                  </ProvedorRepositorio>
                }
              >
                <Route index element={<Hoje />} />
                <Route
                  path="comecar"
                  element={
                    <Carregando>
                      <Comecar />
                    </Carregando>
                  }
                />
                <Route
                  path="comecar/:carreira"
                  element={
                    <Carregando>
                      <ParaComecar />
                    </Carregando>
                  }
                />
                <Route path="plano/*" element={<RotasDoPlano />} />
                <Route path="sessao/*" element={<RotasDaSessao />} />
                <Route path="recall" element={<RecallInicio />}>
                  <Route index element={<Navigate to="frases" replace />} />
                  <Route path="frases" element={<ListaFrases />} />
                  <Route path="cartoes" element={<ListaCartoes />} />
                  <Route path="historico" element={<Historico />} />
                </Route>
                <Route path="recall/erros" element={<ErrosComFiltros />} />
                <Route path="recall/registrar" element={<RegistrarErro />} />
                <Route path="recall/registrar/varios" element={<RegistrarVarios />} />
                <Route path="recall/revisar" element={<Drill />} />
                <Route path="recall/frases/revisar" element={<RevisarFrases />} />
                <Route path="recall/frases/:id/cartao" element={<CartaoDeLacuna />} />
                <Route path="recall/erros/:id" element={<DetalheErro />} />
                <Route path="recall/cartoes/:id" element={<EditarCartao />} />
                <Route path="biblioteca" element={<Normas />} />
                <Route path="biblioteca/acervo" element={<Acervo />} />
                <Route path="biblioteca/sumulas" element={<Colecoes especie="sumulas" />} />
                <Route path="biblioteca/teses" element={<Colecoes especie="teses" />} />
                <Route path="biblioteca/resumos" element={<Resumos />} />
                <Route path="biblioteca/resumos/novo" element={<Resumos novo />} />
                <Route path="biblioteca/resumos/:id" element={<Resumo />} />
                <Route path="biblioteca/precedentes" element={<Precedentes />} />
                <Route path="biblioteca/precedentes/novo" element={<Precedentes novo />} />
                <Route path="biblioteca/precedentes/:id" element={<Precedente />} />
                {/* Uma rota só: ao colar, o id entra na rota sem desmontar a tela. */}
                <Route
                  path="biblioteca/importar/:versaoId?"
                  element={
                    <Carregando>
                      <Importar />
                    </Carregando>
                  }
                />
                <Route
                  path="biblioteca/normas/:normaId"
                  element={
                    <Carregando>
                      <Leitor />
                    </Carregando>
                  }
                />
                <Route path="conta" element={<Conta />} />
                <Route path="conta/aparencia" element={<AparenciaConta />} />
                <Route path="conta/perfis" element={<Perfis />} />
                <Route
                  path="conta/dados"
                  element={
                    <Carregando>
                      <Dados />
                    </Carregando>
                  }
                />
                <Route path="conta/privacidade" element={<Privacidade />} />
                <Route
                  path="conta/entrar"
                  element={contasHabilitadas() ? <Entrar /> : <NaoEncontrada />}
                />
                <Route
                  path="conta/sincronizacao"
                  element={
                    contasHabilitadas() ? (
                      <Carregando>
                        <Sincronizacao />
                      </Carregando>
                    ) : (
                      <NaoEncontrada />
                    )
                  }
                />
                <Route
                  path="conta/conflitos"
                  element={
                    contasHabilitadas() ? (
                      <Carregando>
                        <Conflitos />
                      </Carregando>
                    ) : (
                      <NaoEncontrada />
                    )
                  }
                />
                <Route path="orientacoes" element={<Orientacoes />} />
                <Route path="orientacoes/:secao" element={<Orientacoes />} />
                <Route path="*" element={<NaoEncontrada />} />
              </Route>
            </Routes>
          </LimiteDeErro>
        </HashRouter>
      </ProvedorFonteAcervo>
    </ProvedorConta>
  );
}
