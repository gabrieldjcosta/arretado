// O Fio na tela: junta o que o app sabe (a `EntradaDoFio`), o que o aparelho guardou (o estado do
// gerador) e as ações que mexem nos dois. Agora, passo e pouso usam o mesmo hook, então o que uma
// tela grava a outra lê no mesmo instante.
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { Repositorio } from '../../../core/persistencia';
import {
  concluirPasso,
  pousar,
  pularPasso,
  type EntradaDoFio,
  type Pouso,
  type ResultadoDoPasso,
} from '../../../dominios/fio';
import { useRepositorio, useDados } from '../../dados/contexto';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { ROTA_DO_PASSO, ROTA_DO_POUSO } from '../lugares';
import { avancar, entrarNoPasso, type Avanco } from './avancar';
import { montarEntradaDoFio } from './entrada';
import { useFioGuardado, type FioGuardado } from './guardado';

export interface FioNaTela {
  /** Ainda lendo o que o app sabe (primeira carga). */
  carregando: boolean;
  falhou: boolean;
  entrada: EntradaDoFio | undefined;
  /** O que viria num puxão agora; `undefined` enquanto carrega. */
  avanco: Avanco | undefined;
  /** Etapas pousadas e passos dados, para o Destino. */
  fio: FioGuardado;
  /** O puxão: grava o que o gerador planejou e leva à tela certa. */
  puxar: () => void;
  /** O passo da vez ficou feito. */
  concluir: (resultado: ResultadoDoPasso) => void;
  /** Pular não custa nada (regra 10). */
  pular: () => void;
  /** O pouso: a etapa conta e o Agora volta com o fio solto. */
  pousarEtapa: () => Pouso | undefined;
}

export function useFio(): FioNaTela {
  const repo = useRepositorio();
  const fonte = useFonteIncidencia();
  const navegar = useNavigate();
  const usuarioId = repo.ctx.usuarioId;
  const { fio, gravar } = useFioGuardado(usuarioId);
  const etapasFeitas = fio.estado.etapasFeitas;
  const materiaAberta = fio.estado.etapa?.materiaId;

  const carregar = useCallback(
    (r: Repositorio) =>
      montarEntradaDoFio(r, {
        fonte,
        etapasFeitas,
        ...(materiaAberta === undefined ? {} : { materiaAberta }),
      }),
    [fonte, etapasFeitas, materiaAberta],
  );
  const { dados: entrada, falha } = useDados(carregar);
  const avanco = useMemo(() => (entrada ? avancar(fio, entrada) : undefined), [fio, entrada]);

  /** Grava o estado depois de uma ação e leva a pessoa ao que vem em seguida. */
  const seguir = useCallback(
    (estado: FioGuardado['estado']) => {
      if (!entrada) return;
      const depois = avancar({ estado, marcas: {} }, entrada);
      gravar(entrarNoPasso(depois, entrada));
      if (depois.proximo.tipo === 'pouso') void navegar(ROTA_DO_POUSO, { replace: true });
      else if (depois.proximo.tipo === 'sem_materia') void navegar('/', { replace: true });
    },
    [entrada, gravar, navegar],
  );

  const puxar = useCallback(() => {
    if (!entrada || !avanco) return;
    gravar(entrarNoPasso(avanco, entrada));
    if (avanco.proximo.tipo === 'passo') void navegar(ROTA_DO_PASSO);
    else if (avanco.proximo.tipo === 'pouso') void navegar(ROTA_DO_POUSO);
    else void navegar('/comecar');
  }, [avanco, entrada, gravar, navegar]);

  const concluir = useCallback(
    (resultado: ResultadoDoPasso) => {
      seguir(concluirPasso(fio.estado, resultado));
    },
    [fio.estado, seguir],
  );

  const pular = useCallback(() => {
    seguir(pularPasso(fio.estado));
  }, [fio.estado, seguir]);

  const pousarEtapa = useCallback((): Pouso | undefined => {
    const { estado, pouso } = pousar(fio.estado);
    gravar({ estado, marcas: {} });
    void navegar('/', { replace: true });
    return pouso;
  }, [fio.estado, gravar, navegar]);

  return {
    carregando: entrada === undefined && falha === undefined,
    falhou: entrada === undefined && falha !== undefined,
    entrada,
    avanco,
    fio,
    puxar,
    concluir,
    pular,
    pousarEtapa,
  };
}
