import { useEffect, useRef, useState } from 'react';
import type { Repositorio } from '../../core/persistencia';
import { useEstadoDaAbertura } from '../componentes/escrita/vez-da-escrita';
import { useRepositorio } from '../dados/contexto';
import type { RetratoDoHoje } from '../hoje/retrato';
import { Chegada } from './Chegada';
import { Entrada } from './Entrada';
import { decidirNaAberturaAFrio, type Abertura } from './regras';
import './estilos-entrada.css';

// A abertura decidida fica por repositório: voltar ao Hoje na mesma abertura do aplicativo mostra a
// mesma linha, em vez de decidir de novo (a decisão é uma por abertura a frio).
const decididas = new WeakMap<Repositorio, Abertura>();

/**
 * A Chegada (folha) e a Entrada do Dia (linha quieta) no Hoje (D-D9; S4). Decide uma vez, na abertura a
 * frio do aplicativo, depois que o Hoje carregou. Se algo falha (os dados, o conteúdo), não aparece nada e
 * o Hoje segue como está: a Entrada nunca bloqueia o uso. Enquanto a Abertura (o nome em tela cheia)
 * decide ou está na tela, nada abre: a Chegada é um `<dialog>` modal e, aberto depois dela, ficaria por
 * cima do nome. A exceção é a Chegada que a luz da Abertura vai visitar (a primeira vez): ela abre já,
 * escondida (ver `Chegada`), para a luz ter para onde voar.
 */
export function EntradaDoDia({ retrato }: { retrato: RetratoDoHoje | undefined }) {
  const repo = useRepositorio();
  const { emCurso: aberturaEmCurso, voaParaAChegada } = useEstadoDaAbertura();
  const [abertura, setAbertura] = useState<Abertura | undefined>(() => decididas.get(repo));
  // O StrictMode roda os efeitos duas vezes e a resposta chega depois da segunda: vale se ainda montado.
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  const pronto = retrato !== undefined;
  useEffect(() => {
    if (!pronto) return;
    decidirNaAberturaAFrio(repo).then(
      (a) => {
        if (a === undefined) return;
        decididas.set(repo, a);
        if (montado.current) setAbertura(a);
      },
      () => undefined,
    );
  }, [repo, pronto]);
  if (abertura === undefined) return null;
  if (aberturaEmCurso && !(abertura.tipo === 'chegada' && voaParaAChegada)) return null;
  return abertura.tipo === 'chegada' ? (
    <Chegada
      dia={abertura.dia}
      aoFechar={() => {
        // Dispensada, a Chegada não volta enquanto o aplicativo está aberto: voltar ao Hoje não a reabre
        // (a Entrada do Dia, que é uma linha quieta, é que fica).
        decididas.delete(repo);
        setAbertura(undefined);
      }}
    />
  ) : (
    <Entrada abertura={abertura} />
  );
}
