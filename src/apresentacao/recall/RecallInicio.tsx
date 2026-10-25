import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { minutosDoLote } from '../../dominios/recall/ordem-de-valor';
import { LIMITE_FILA_DIARIA } from '../../dominios/recall/servico';
import { AcaoAgora } from '../componentes/AcaoAgora';
import { DiasDaSemana } from '../componentes/DiasDaSemana';
import { LinhaDepois } from '../componentes/LinhaDepois';
import { TituloComMais } from '../componentes/TituloComMais';
import { TracoDeSelecao } from '../componentes/traco/TracoDeSelecao';
import { useDados } from '../dados/contexto';
import { ROTULO_DA_AREA } from '../textos';
import { resumoDoRecall } from './carregadores';

/** Uma aba do Recall: link de rota com o traço de seleção (D-D7, "A caneta que desenha"). */
function AbaDoRecall({ para, rotulo }: { para: string; rotulo: string }) {
  return (
    <NavLink to={para}>
      {({ isActive }) => (
        <>
          {rotulo}
          <TracoDeSelecao chave={`recall:${para}`} ativo={isActive} />
        </>
      )}
    </NavLink>
  );
}

const cartoes = (n: number) => (n === 1 ? '1 cartão' : `${String(n)} cartões`);
const frases = (n: number) => (n === 1 ? '1 frase' : `${String(n)} frases`);

/**
 * Fixar: uma ação principal (revisar até a cota, se houver fila; senão registrar) e as abas Frases ·
 * Cartões · Histórico (Parte 2 §9.2; D-D5: "Erros" deixou de ser aba). Quem chega a `/recall` cai
 * na aba Frases.
 */
export function RecallInicio() {
  const { dados } = useDados(resumoDoRecall);
  const [avisoDispensado, setAvisoDispensado] = useState(false);
  const vencidos = dados?.vencidos ?? 0;
  const frasesVencidas = dados?.frasesVencidas ?? 0;
  const cota = dados?.cota ?? 10;
  const lote = Math.min(cota, vencidos);
  const minutos = minutosDoLote(lote);

  return (
    <>
      <TituloComMais>{ROTULO_DA_AREA.recall}</TituloComMais>
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
      <nav aria-label={`Seções do ${ROTULO_DA_AREA.recall}`} className="abas">
        <AbaDoRecall para="/recall/frases" rotulo="Frases" />
        <AbaDoRecall para="/recall/cartoes" rotulo="Cartões" />
        <AbaDoRecall para="/recall/historico" rotulo="Histórico" />
      </nav>
      <Outlet />
    </>
  );
}
