// Aviso "você deixou uma Sessão aberta", para o Hoje encaixar (A2 restaura ao voltar). Não mostra
// nada quando não há Sessão aberta; sem culpa, sem cobrança.
import { Link } from 'react-router';
import { useDados } from '../dados/contexto';
import { horaDeInicio, sessaoAberta } from './carregadores';
import './estilos-sessao.css';

export function SessaoAberta() {
  const { dados: sessao } = useDados(sessaoAberta);
  if (!sessao) return null;
  return (
    <section className="cartao-bloco sessao-aberta" aria-label="Sessão aberta">
      <p className="sessao-resumo">
        {sessao.estado === 'pausada' ? 'Sessão pausada' : 'Sessão em andamento'}
        {sessao.alvo?.rotulo ? `: ${sessao.alvo.rotulo}` : ''}
      </p>
      <p className="sessao-detalhe">Começou às {horaDeInicio(sessao.inicio)}.</p>
      <div className="linha-acoes">
        <Link to="/sessao/atual" className="botao principal">
          Continuar
        </Link>
        <Link to="/sessao/fechar" className="botao">
          Encerrar
        </Link>
      </div>
    </section>
  );
}
