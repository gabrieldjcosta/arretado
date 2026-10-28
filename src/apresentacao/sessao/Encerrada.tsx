// O que a pessoa vê ao encerrar a Sessão (fluxo 2): um resumo curto do que ficou e uma ponte de um
// toque para a próxima coisa, que é a do Agora (sem calcular nada em paralelo).
import { Link } from 'react-router';
import type { Sessao } from '../../core/modelo';
import { Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { carregarRetrato } from '../hoje/retrato';
import { rotaDeInicio } from '../hoje/rota-de-inicio';
import { tituloDaAcao } from '../hoje/textos-da-acao';
import { errosDaSessao, linhasDoResumo } from './resumo-da-sessao';
import './estilos-sessao.css';

export function Encerrada({ sessao }: { sessao: Sessao }) {
  const { dados } = useDados(async (repo) => ({
    erros: await errosDaSessao(repo, sessao.id),
    retrato: await carregarRetrato(repo),
  }));
  const linhas = linhasDoResumo(sessao, dados?.erros ?? 0);
  const proxima = dados?.retrato.agora.tipo === 'acao' ? dados.retrato.agora.acao : undefined;
  return (
    <>
      <h1>Encerrar a Sessão</h1>
      <Vazio
        titulo="Sessão encerrada"
        acao={
          <>
            <Link to="/" className="botao principal">
              Ir para o Hoje
            </Link>
            {proxima && (
              <Link to={rotaDeInicio(proxima)} className="botao">
                {`Seguir: ${tituloDaAcao(proxima)}`}
              </Link>
            )}
            {(dados?.erros ?? 0) > 0 && (
              <Link to="/recall/erros" className="botao botao-texto">
                Ver os erros
              </Link>
            )}
          </>
        }
      >
        {linhas.length > 0 && (
          <ul className="resumo-da-sessao">
            {linhas.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        {sessao.proximoPasso ? (
          <p>Próximo passo guardado: {sessao.proximoPasso}</p>
        ) : (
          <p>Bom descanso. Você decide o que vem depois.</p>
        )}
      </Vazio>
    </>
  );
}
