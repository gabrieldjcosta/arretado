import { useEffect, useRef, useState } from 'react';
import { useRepositorio } from '../dados/contexto';
import type { RetratoDoHoje } from '../hoje/retrato';
import { Chegada } from './Chegada';
import { Entrada } from './Entrada';
import { decidirNaAberturaAFrio, type Abertura } from './regras';
import './estilos-entrada.css';

/**
 * A Chegada e a Entrada do Dia sobre o Hoje (D-D9). Decide uma vez, na abertura a frio do aplicativo,
 * depois que o Hoje carregou. Se algo falha (os dados, o conteúdo), não abre nada e o Hoje segue como
 * está: a Entrada nunca bloqueia o uso.
 */
export function EntradaDoDia({ retrato }: { retrato: RetratoDoHoje | undefined }) {
  const repo = useRepositorio();
  const [abertura, setAbertura] = useState<Abertura>();
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
        if (a !== undefined && montado.current) setAbertura(a);
      },
      () => undefined,
    );
  }, [repo, pronto]);
  if (abertura === undefined || retrato === undefined) return null;
  return abertura.tipo === 'chegada' ? (
    <Chegada dia={abertura.dia} />
  ) : (
    <Entrada abertura={abertura} agora={retrato.agora} />
  );
}
