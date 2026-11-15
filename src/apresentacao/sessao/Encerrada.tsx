// O que a pessoa vê ao encerrar a Sessão (fluxo 2): um resumo curto do que ficou e um caminho só, de volta ao
// Agora. O que vem depois quem escolhe é o Agora do Fio: esta tela não calcula um passo em paralelo (a ponte
// "Seguir" saiu com o Hoje, que era quem a decidia).
import { useCallback } from 'react';
import { Link } from 'react-router';
import type { Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { Vazio } from '../componentes/estados';
import { useDados } from '../dados/contexto';
import { errosDaSessao, linhasDoResumo } from './resumo-da-sessao';
import './estilos-sessao.css';

export function Encerrada({ sessao }: { sessao: Sessao }) {
  // `useDados` pede um `carregar` estável: uma seta nova a cada desenho o refaria sem parar.
  const carregar = useCallback((repo: Repositorio) => errosDaSessao(repo, sessao), [sessao]);
  const { dados: erros = 0 } = useDados(carregar);
  const linhas = linhasDoResumo(sessao, erros);
  return (
    <>
      <h1>Encerrar a Sessão</h1>
      <Vazio
        titulo="Sessão encerrada"
        acao={
          <>
            <Link to="/" className="botao principal">
              Ir para o Agora
            </Link>
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
