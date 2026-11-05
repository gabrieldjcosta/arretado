// O que o Destino lê: o que o app sabe do estudo (as matérias do Ciclo e os artigos da matéria em que a
// pessoa está) junto com o que o Fio guardou no aparelho (pousos, porteiras), já na forma do mapa.
import { useCallback, useMemo } from 'react';
import type { Repositorio } from '../../../core/persistencia';
import { useRepositorio } from '../../dados/contexto';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { montarEntradaDoFio } from '../dados/entrada';
import { useFioGuardado, type FioGuardado } from '../dados/guardado';
import { useDadosDoFio } from '../dados/sem-vazio';
import { entradaDaJornada } from './entrada-da-jornada';
import type { EntradaDaJornada } from './jornada';

export interface JornadaDoFio {
  /** Ainda lendo o que o app sabe (primeira carga). */
  carregando: boolean;
  falhou: boolean;
  entrada: EntradaDaJornada | undefined;
  fio: FioGuardado;
}

export function useJornadaDoFio(): JornadaDoFio {
  const repo = useRepositorio();
  const fonte = useFonteIncidencia();
  const { fio } = useFioGuardado(repo.ctx.usuarioId);
  const etapasFeitas = fio.estado.etapasFeitas;
  // A matéria em que a pessoa está tem de vir com os artigos: o Fio abre a da vez, e aqui também a do último pouso.
  const materiaAberta = fio.estado.pousos[0]?.materiaId ?? fio.estado.etapa?.materiaId;

  const carregar = useCallback(
    (r: Repositorio) =>
      montarEntradaDoFio(r, {
        fonte,
        etapasFeitas,
        ...(materiaAberta === undefined ? {} : { materiaAberta }),
      }),
    [fonte, etapasFeitas, materiaAberta],
  );
  const { dados, falha } = useDadosDoFio('jornada', carregar);
  const entrada = useMemo(
    () => (dados ? entradaDaJornada(dados, fio.estado) : undefined),
    [dados, fio.estado],
  );
  return {
    carregando: dados === undefined && falha === undefined,
    falhou: dados === undefined && falha !== undefined,
    entrada,
    fio,
  };
}
