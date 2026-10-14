import { useEffect, useState } from 'react';
import {
  lerUltimoBackup,
  pedirArmazenamentoPersistente,
  type EstadoDoArmazenamento,
} from '../../core/persistencia';
import { useDados } from './contexto';

/** Dados puros para a tela de backup (texto e lugar ficam com a UI). `undefined` = carregando. */
export function useUltimoBackup(): { dataUltimoBackup: string | null | undefined } {
  const { dados } = useDados(lerUltimoBackup);
  return { dataUltimoBackup: dados };
}

export function useEstadoDeArmazenamento(): EstadoDoArmazenamento | undefined {
  const [estado, setEstado] = useState<EstadoDoArmazenamento>();
  useEffect(() => {
    let ativo = true;
    void pedirArmazenamentoPersistente().then((e) => {
      if (ativo) setEstado(e);
    });
    return () => {
      ativo = false;
    };
  }, []);
  return estado;
}
