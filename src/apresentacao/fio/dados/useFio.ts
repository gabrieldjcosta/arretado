// O Fio na tela: junta o que o app sabe (a `EntradaDoFio`), o que o aparelho guardou (o estado do
// gerador) e as ações que mexem nos dois. Agora, passo e pouso usam o mesmo hook, então o que uma
// tela grava a outra lê no mesmo instante.
import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useRepositorio } from '../../dados/contexto';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { ROTA_DO_PASSO, ROTA_DO_POUSO } from '../lugares';
import { avancar, entrarNoPasso, type Avanco } from './avancar';
import {
  desfazivel,
  esquecerDesfazer,
  lembrarParaDesfazer,
  podeDesfazer,
  tomarParaDesfazer,
} from './desfazer';
import { montarEntradaDoFio } from './entrada';
import { useFioGuardado, type FioGuardado } from './guardado';
import { useDadosDoFio } from './sem-vazio';

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
  /** Volta ao passo que acabou de ser dado ou pulado (a toast "Desfazer"); `false` se não há o que voltar. */
  desfazer: () => boolean;
  /** Ainda dá para voltar atrás (o aviso com "Desfazer" vale poucos segundos)? */
  podeDesfazer: () => boolean;
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
  const { dados: entrada, falha } = useDadosDoFio('fio', carregar);
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

  // Um puxão antes de o Fio carregar não se perde: espera os dados chegarem e então puxa.
  const puxaoPendente = useRef(false);
  const puxar = useCallback(() => {
    if (!entrada || !avanco) {
      puxaoPendente.current = true;
      return;
    }
    puxaoPendente.current = false;
    gravar(entrarNoPasso(avanco, entrada));
    if (avanco.proximo.tipo === 'passo') void navegar(ROTA_DO_PASSO);
    else if (avanco.proximo.tipo === 'pouso') void navegar(ROTA_DO_POUSO);
    else void navegar('/comecar');
  }, [avanco, entrada, gravar, navegar]);
  useEffect(() => {
    if (puxaoPendente.current && entrada && avanco) puxar();
  }, [avanco, entrada, puxar]);

  const concluir = useCallback(
    (resultado: ResultadoDoPasso) => {
      if (desfazivel(resultado)) lembrarParaDesfazer(usuarioId, fio);
      else esquecerDesfazer();
      seguir(concluirPasso(fio.estado, resultado));
    },
    [fio, seguir, usuarioId],
  );

  const pular = useCallback(() => {
    lembrarParaDesfazer(usuarioId, fio);
    seguir(pularPasso(fio.estado));
  }, [fio, seguir, usuarioId]);

  const desfazer = useCallback((): boolean => {
    const antes = tomarParaDesfazer(usuarioId);
    if (!antes) return false;
    gravar(antes);
    void navegar(ROTA_DO_PASSO, { replace: true });
    return true;
  }, [gravar, navegar, usuarioId]);

  const aindaPodeDesfazer = useCallback(() => podeDesfazer(usuarioId), [usuarioId]);

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
    desfazer,
    podeDesfazer: aindaPodeDesfazer,
    pousarEtapa,
  };
}
