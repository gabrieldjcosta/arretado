// "Começar uma Sessão" no Hoje: o tipo de atividade em um toque, com a sugestão em destaque. Sem
// Sessão aberta, mostra o cartão; com uma aberta, o Hoje já mostra a `SessaoAberta`.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { AtividadeDeSessao } from '../../core/modelo';
import { iniciarSessao } from '../../dominios/sessao/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { Falha } from '../componentes/estados';
import { ATIVIDADES, atividadeSugerida, rotaDaAtividade, rotuloDaAtividade } from './atividades';
import { sessaoAberta, ultimaAtividade } from './carregadores';
import './estilos-sessao.css';

export function ComecarSessao({ normaLida }: { normaLida?: string }) {
  const repo = useRepositorio();
  const navegar = useNavigate();
  const aberta = useDados(sessaoAberta);
  const ultima = useDados(ultimaAtividade);
  const [erro, setErro] = useState(false);
  if (aberta.dados !== null || ultima.dados === undefined) return null;
  const sugerida = atividadeSugerida(normaLida !== undefined, ultima.dados);
  const comecar = (atividade: AtividadeDeSessao) => {
    setErro(false);
    const lendoNorma = atividade === 'lei' && normaLida !== undefined;
    iniciarSessao(repo, {
      atividade,
      alvo: lendoNorma
        ? { tipo: 'leitura', id: normaLida, rotulo: rotuloDaAtividade(atividade) }
        : { tipo: 'livre', rotulo: rotuloDaAtividade(atividade) },
      origemDaAcao: { tipo: 'escolha_propria' },
    }).then(
      () => {
        void navegar(rotaDaAtividade(atividade, normaLida));
      },
      () => {
        setErro(true);
      },
    );
  };
  return (
    <section className="cartao-bloco comecar-sessao" aria-labelledby="comecar-sessao-titulo">
      <h2 id="comecar-sessao-titulo">Começar uma Sessão</h2>
      <p className="sessao-detalhe">O que você vai fazer agora?</p>
      <div className="linha-acoes comecar-sessao__tipos">
        {[...ATIVIDADES]
          .sort((a, b) => Number(b.id === sugerida) - Number(a.id === sugerida))
          .map((a) => (
            <button
              key={a.id}
              type="button"
              className={a.id === sugerida ? 'principal' : undefined}
              onClick={() => {
                comecar(a.id);
              }}
            >
              {a.rotulo}
              {a.id === sugerida && <span className="visualmente-oculto"> (sugerido)</span>}
            </button>
          ))}
      </div>
      <p className="dica">O primeiro é a sugestão. Um toque e a Sessão começa.</p>
      {erro && <Falha oQue="Não foi possível começar." oQueFazer="Tente de novo em instantes." />}
    </section>
  );
}
