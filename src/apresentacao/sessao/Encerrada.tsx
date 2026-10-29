// O que a pessoa vê ao encerrar a Sessão (fluxo 2): um resumo curto do que ficou e uma ponte de um
// toque para a próxima coisa, que é a do Agora (sem calcular nada em paralelo).
import { useCallback } from 'react';
import { Link } from 'react-router';
import type { Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { useFonteIncidencia } from '../dados/fonteIncidenciaContexto';
import { carregarRetrato } from '../hoje/retrato';
import { rotaDeInicio } from '../hoje/rota-de-inicio';
import { tituloDaAcao } from '../hoje/textos-da-acao';
import { errosDaSessao, linhasDoResumo } from './resumo-da-sessao';
import './estilos-sessao.css';

export function Encerrada({ sessao }: { sessao: Sessao }) {
  const fonte = useFonteIncidencia();
  // `useDados` pede um `carregar` estável: uma seta nova a cada desenho o refaria sem parar. O Agora vem
  // com a fonte do Mapa da norma, como no Hoje, para a ponte ser a mesma (o trecho do mapa, não só
  // "Continuar a leitura"). É uma leitura só para o resumo e os botões chegarem juntos, e a folha não
  // se rearranjar duas vezes.
  const carregar = useCallback(
    async (repo: Repositorio) => {
      const [erros, retrato] = await Promise.all([
        errosDaSessao(repo, sessao),
        carregarRetrato(repo, [], undefined, fonte),
      ]);
      return { erros, retrato };
    },
    [sessao, fonte],
  );
  const { dados } = useDados(carregar);
  const erros = dados?.erros ?? 0;
  const linhas = linhasDoResumo(sessao, erros);
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
              // `replace`: o Voltar da Sessão nova não cai num "Encerrar a Sessão" dela.
              <Link to={rotaDeInicio(proxima)} replace className="botao ponte-da-sessao">
                <span>{`Seguir: ${tituloDaAcao(proxima)}`}</span>
              </Link>
            )}
            {erros > 0 && (
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
