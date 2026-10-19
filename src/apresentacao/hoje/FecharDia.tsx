// Fechar o Dia (pacote A3b; D-D7, P3): resumo do que aconteceu, sem meta nem nota, e um gesto de
// encerrar. Fechado, o Resumo do Dia mostra o cachorro num traço só e a caneta largada ao fim dele.
// Só aparece quando houve algo hoje (ou o Dia já foi fechado, para poder reabrir).
import { useCallback, useState } from 'react';
import type { Repositorio } from '../../core/persistencia';
import { fecharDia, reabrirDia, resumoDoDia } from '../../dominios/dia/fechar';
import { Caneta } from '../componentes/Caneta';
import { TracoDoCachorro } from '../componentes/TracoDoCachorro';
import { useDados, useRepositorio } from '../dados/contexto';
import { useVoz } from '../voz';
import './estilos-dia.css';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

export function FecharDia() {
  const texto = useVoz();
  const repo = useRepositorio();
  const [versao, setVersao] = useState(0);
  const [falhou, setFalhou] = useState(false);
  /** O traço do cachorro só se desenha na hora em que a pessoa fecha o Dia; já fechado, ele aparece pronto. */
  const [desenha, setDesenha] = useState(false);
  const carregar = useCallback(
    (r: Repositorio) => resumoDoDia(r).then((x) => ({ x, versao })),
    [versao],
  );
  const { dados } = useDados(carregar);
  if (!dados) return null;
  const r = dados.x;
  const fechado = Boolean(r.dia?.fechadoEm);
  const houve = r.sessoes + r.cartoesRevisados + r.frasesRevisadas > 0;
  if (!houve && !fechado) return null;
  const partes = [
    r.sessoes > 0 ? plural(r.sessoes, 'Sessão', 'Sessões') : '',
    r.cartoesRevisados > 0
      ? plural(r.cartoesRevisados, 'cartão revisado', 'cartões revisados')
      : '',
    r.frasesRevisadas > 0 ? plural(r.frasesRevisadas, 'Frase revisada', 'Frases revisadas') : '',
  ].filter(Boolean);
  const mudar = (acao: (rep: Repositorio) => Promise<unknown>, aoConcluir: () => void) => {
    setFalhou(false);
    acao(repo).then(
      () => {
        aoConcluir();
        setVersao((v) => v + 1);
      },
      () => {
        setFalhou(true);
      },
    );
  };
  const lista = partes.length > 0 && (
    <ul className="fechar-dia-lista">
      {partes.map((parte) => (
        <li key={parte}>{parte}</li>
      ))}
    </ul>
  );
  return (
    <section className="cartao-bloco fechar-dia" aria-label="Fechar o Dia">
      {fechado ? (
        <>
          <h2 className="fechar-dia-titulo">{texto('diaFechado')}</h2>
          {lista}
          <div className="fechar-dia-pouso">
            <TracoDoCachorro desenha={desenha} />
            <Caneta pose="deitada" className="pouso-caneta" />
          </div>
          <p className="fechar-dia-texto">Bom descanso. Amanhã você começa de onde parou.</p>
          {r.proximoPasso && (
            <p className="fechar-dia-passo">
              Amanhã: <q>{r.proximoPasso}</q>
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              mudar(reabrirDia, () => {
                setDesenha(false);
              });
            }}
          >
            Reabrir o Dia
          </button>
        </>
      ) : (
        <>
          <h2 className="fechar-dia-titulo">Resumo do Dia</h2>
          {lista}
          {r.proximoPasso && (
            <p className="fechar-dia-passo">
              Para amanhã: <q>{r.proximoPasso}</q>
            </p>
          )}
          {r.sessaoAberta && (
            <p className="dica">Há uma Sessão aberta; fechar o Dia não a encerra.</p>
          )}
          <button
            type="button"
            onClick={() => {
              mudar(fecharDia, () => {
                setDesenha(true);
              });
            }}
          >
            Fechar o Dia
          </button>
        </>
      )}
      {falhou && (
        <p role="alert" className="dica">
          Problema ao salvar. Seu Dia segue como estava; tente de novo.
        </p>
      )}
    </section>
  );
}
