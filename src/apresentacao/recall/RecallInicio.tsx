import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { LIMITE_FILA_DIARIA } from '../../dominios/recall/servico';
import { useDados } from '../dados/contexto';
import { resumoDoRecall } from './carregadores';

/** Recall: uma ação principal (revisar, se houver fila; senão registrar) e as abas (Parte 2 §9.2). */
export function RecallInicio() {
  const { dados } = useDados(resumoDoRecall);
  const [avisoDispensado, setAvisoDispensado] = useState(false);
  const vencidos = dados?.vencidos ?? 0;

  return (
    <>
      <h1>Recall</h1>
      <div className="linha-acoes">
        {vencidos > 0 ? (
          <>
            <Link to="/recall/revisar" className="botao principal">
              Revisar {vencidos === 1 ? '1 cartão' : `${String(vencidos)} cartões`}
            </Link>
            <Link to="/recall/registrar" className="botao">
              Registrar erro
            </Link>
          </>
        ) : (
          <Link to="/recall/registrar" className="botao principal">
            Registrar erro
          </Link>
        )}
      </div>
      {dados && dados.maiorFila > LIMITE_FILA_DIARIA && !avisoDispensado && (
        <p className="aviso">
          Há dias com mais de {LIMITE_FILA_DIARIA} revisões previstas nesta semana: você está
          criando mais cartões do que revisa.{' '}
          <button
            type="button"
            className="discreto"
            onClick={() => {
              setAvisoDispensado(true);
            }}
          >
            Dispensar
          </button>
        </p>
      )}
      <nav aria-label="Seções do Recall" className="abas">
        <NavLink to="/recall" end>
          Erros
        </NavLink>
        <NavLink to="/recall/frases">Frases</NavLink>
        <NavLink to="/recall/cartoes">Cartões</NavLink>
        <NavLink to="/recall/historico">Histórico</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
