import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { LIMITE_FILA_DIARIA } from '../../dominios/recall/servico';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { DiasDaSemana } from '../componentes/DiasDaSemana';
import { LinhaDepois } from '../componentes/LinhaDepois';
import { useDados } from '../dados/contexto';
import { resumoDoRecall } from './carregadores';

/** Segundos por cartão na estimativa do início; ajustar com o uso real (fatia 3). */
export const SEGUNDOS_POR_CARTAO = 30;

const cartoes = (n: number) => (n === 1 ? '1 cartão' : `${String(n)} cartões`);
const frases = (n: number) => (n === 1 ? '1 frase' : `${String(n)} frases`);

/** Recall: uma ação principal (revisar até a cota, se houver fila; senão registrar) e as abas (Parte 2 §9.2). */
export function RecallInicio() {
  const { dados } = useDados(resumoDoRecall);
  const [avisoDispensado, setAvisoDispensado] = useState(false);
  const vencidos = dados?.vencidos ?? 0;
  const frasesVencidas = dados?.frasesVencidas ?? 0;
  const cota = dados?.cota ?? 10;
  const lote = Math.min(cota, vencidos);
  const minutos = Math.max(1, Math.ceil((lote * SEGUNDOS_POR_CARTAO) / 60));

  return (
    <>
      <h1>Recall</h1>
      {dados && <DiasDaSemana dias={dados.dias} />}
      {vencidos > 0 ? (
        <AcaoAgora
          titulo={
            frasesVencidas > 0
              ? `Revisar ${cartoes(lote)} e ${frases(Math.min(cota, frasesVencidas))}`
              : `Revisar ${cartoes(lote)}`
          }
          estimativa={minutos}
          rotuloBotao="Começar"
          para="/recall/revisar"
        />
      ) : frasesVencidas > 0 ? (
        <AcaoAgora
          titulo={`Revisar ${frases(Math.min(cota, frasesVencidas))}`}
          rotuloBotao="Começar"
          para="/recall/frases/revisar"
        />
      ) : (
        <AcaoAgora
          titulo={dados?.primeiroUso ? 'Registre seu primeiro erro' : 'Registrar um erro'}
          rotuloBotao="Registrar erro"
          para="/recall/registrar"
        />
      )}
      {vencidos > cota && (
        <p className="dica">
          Hoje: {lote} de {vencidos}. Os outros esperam; nada é apagado.
        </p>
      )}
      <LinhaDepois>
        {vencidos > 0 ? (
          <Link to="/recall/registrar">registrar um erro</Link>
        ) : dados?.primeiroUso ? (
          'seu primeiro cartão aparece amanhã'
        ) : dados && dados.amanha > 0 ? (
          `revisar ${cartoes(dados.amanha)} amanhã`
        ) : undefined}
      </LinhaDepois>
      {dados && dados.maiorFila > LIMITE_FILA_DIARIA && !avisoDispensado && (
        <p className="aviso">
          Em algum dia desta semana passam de {LIMITE_FILA_DIARIA} as revisões previstas. Sem
          pressa: revise a cota de cada vez, e o resto espera.{' '}
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
