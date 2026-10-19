// Faixa da Sessão aberta: "Sessão · Pausar · Encerrar" no topo da revisão e do Leitor (fora do modo
// foco). Só estrutura e lógica; o visual é do redesenho (classes `.faixa-sessao*`). Sem Sessão
// aberta, não renderiza nada.
import { useState } from 'react';
import { Link } from 'react-router';
import { pausarSessao, retomarSessao } from '../../dominios/sessao/servico';
import { useDados, useRepositorio } from '../dados/contexto';
import { sessaoAberta } from './carregadores';
import './estilos-faixa.css';

export function FaixaDaSessao() {
  const repo = useRepositorio();
  const { dados: sessao, recarregar } = useDados(sessaoAberta);
  const [falha, setFalha] = useState(false);
  if (!sessao) return null;
  const pausada = sessao.estado === 'pausada';
  const alternar = () => {
    setFalha(false);
    (pausada ? retomarSessao : pausarSessao)(repo, sessao.id).then(recarregar, () => {
      setFalha(true);
    });
  };
  return (
    <div className="faixa-sessao" role="group" aria-label="Sessão">
      <span className="faixa-sessao__rotulo">{pausada ? 'Sessão pausada' : 'Sessão'}</span>
      <button type="button" className="botao-texto faixa-sessao__acao" onClick={alternar}>
        {pausada ? 'Voltar' : 'Pausar'}
      </button>
      <Link to="/sessao/fechar" className="botao botao-texto faixa-sessao__acao">
        Encerrar
      </Link>
      {falha && (
        <span role="alert" className="faixa-sessao__falha">
          Não foi possível salvar. Tente de novo.
        </span>
      )}
    </div>
  );
}
