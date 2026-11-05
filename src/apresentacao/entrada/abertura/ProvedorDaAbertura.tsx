import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { esconderCarregamento } from '../../carregamento';
import { criarEncontro } from '../../componentes/escrita/encontro';
import {
  escritaNaTela,
  registrarAberturaVista,
  registrarPulo,
} from '../../componentes/escrita/frequencia';
import { ContextoDaAbertura, type VezDaEscrita } from '../../componentes/escrita/vez-da-escrita';
import { useRepositorio } from '../../dados/contexto';
import { noQuadroDoFio } from '../../fio/lugares';
import { useInterface } from '../../fio/interface';
import { Abertura } from './Abertura';
import { decidirNaAberturaDoApp } from './regras';

/**
 * Quanto o app espera a decisão antes de aparecer. A leitura é curta (as Preferências e as Sessões de
 * hoje); se ainda assim demorar, o app aparece e a camada, se vier, entra por cima: a Abertura nunca
 * atrasa o uso.
 */
const ESPERA_MAXIMA_MS = 400;

/**
 * No Fio, a abertura é uma tela do quadro dele. Se o app abriu numa rota da casca de antes (fora do quadro), não há onde
 * mostrá-la: sai quieta, sem contar pulo, e não volta se a pessoa chegar ao Agora depois.
 */
function SaidaForaDoQuadro({ aoSair }: { aoSair: (como: 'fim' | 'pulou') => void }) {
  const { pathname } = useLocation();
  const fora = !noQuadroDoFio(pathname);
  useEffect(() => {
    if (fora) aoSair('fim');
  }, [fora, aoSair]);
  return null;
}

/**
 * Decide, uma vez por abertura do aplicativo, quem escreve o nome (a camada de tela cheia ou o
 * cabeçalho), monta a camada quando é dela e diz a quem abre por cima do app (a Chegada) que espere. Na
 * primeira vez, com a Chegada por vir, a luz visita o Zé dela: a Chegada abre já, escondida, e o
 * `Encontro` que este provedor guarda leva a oferta dela à Abertura.
 *
 * A abertura em que a frequência não pede o nome (movimento reduzido, três aberturas puladas no Dia ou o
 * Dia guardado no futuro das sementes de teste) é decidida na hora, sem esperar dado nenhum: o cabeçalho
 * nasce parado e nada muda. Nas outras, que são as demais (D-D14), a leitura das Preferências e da Sessão
 * (ver `decidirOndeEscrever`) diz se a tela cheia abre. Até lá o app não
 * monta: nem o Hoje aparece antes da tela cheia, nem o cabeçalho fica sem nome, e a camada entra no
 * mesmo quadro em que o app monta. Montar o app antes só faria a decisão esperar a carga dele. Fica por
 * dentro do repositório (Preferências e Sessão moram nele) e por fora de tudo o que escreve ou abre por
 * cima.
 */
export function ProvedorDaAbertura({ children }: { children: ReactNode }) {
  const repo = useRepositorio();
  const [vez, setVez] = useState<VezDaEscrita>(() =>
    escritaNaTela(repo.ctx.agora()) === 'parada'
      ? { estado: 'decidida', onde: 'cabecalho', escrita: 'parada' }
      : { estado: 'pendente' },
  );
  const [saiu, setSaiu] = useState(false);
  const [cansou, setCansou] = useState(false);
  const [encontro] = useState(criarEncontro);

  useEffect(() => {
    if (vez.estado !== 'pendente') return;
    let ativo = true;
    void decidirNaAberturaDoApp(repo).then((decisao) => {
      if (ativo) setVez({ estado: 'decidida', ...decisao });
    });
    return () => {
      ativo = false;
    };
  }, [repo, vez.estado]);

  useEffect(() => {
    if (vez.estado !== 'pendente') return;
    const relogio = window.setTimeout(() => {
      setCansou(true);
    }, ESPERA_MAXIMA_MS);
    return () => {
      window.clearTimeout(relogio);
    };
  }, [vez.estado]);

  // Como a camada saiu conta uma vez só: um pulo é mais um na conta dos que calam a tela cheia até o Dia
  // seguinte; ir até o fim zera essa conta.
  const contou = useRef(false);
  const aoSair = useCallback(
    (como: 'fim' | 'pulou') => {
      if (!contou.current) {
        contou.current = true;
        if (como === 'pulou') registrarPulo(repo.ctx.agora());
        else registrarAberturaVista(repo.ctx.agora());
      }
      setSaiu(true);
    },
    [repo],
  );

  // O app monta quando a decisão chega (ou no teto). É nesse quadro que a tela de carregamento do index.html
  // sai, por baixo da camada quando ela abre: nem um branco entre as duas, nem o Hoje à mostra.
  const montado = vez.estado !== 'pendente' || cansou;
  useEffect(() => {
    if (montado) void esconderCarregamento();
  }, [montado]);

  const naTela = vez.estado === 'decidida' && vez.onde === 'tela' && !saiu ? vez : null;
  const fio = useInterface() === 'fio';
  // O Calmo não tem voo: a luz não visita o Zé, e a Chegada espera a camada sair, como a do Dia. No Fio a abertura é
  // uma tela do quadro dele (`AberturaM`), não esta camada, e a Chegada não vem: a luz não a visita.
  const visitaOZe = !fio && naTela !== null && naTela.chegada && !naTela.calmo;
  const valor = useMemo(
    () => ({
      vez,
      emCurso: vez.estado === 'pendente' || naTela !== null,
      voaParaAChegada: visitaOZe,
      encontro,
      camadaDoFio:
        fio && naTela !== null ? { escrita: naTela.escrita, calmo: naTela.calmo, aoSair } : null,
    }),
    [vez, naTela, visitaOZe, encontro, fio, aoSair],
  );
  return (
    <ContextoDaAbertura.Provider value={valor}>
      {montado ? children : null}
      {naTela && fio && <SaidaForaDoQuadro aoSair={aoSair} />}
      {naTela && !fio && (
        <Abertura
          escrita={naTela.escrita}
          calmo={naTela.calmo}
          aoSair={aoSair}
          encontro={visitaOZe ? encontro : undefined}
        />
      )}
    </ContextoDaAbertura.Provider>
  );
}
