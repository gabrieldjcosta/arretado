// O Fio no aparelho (decisão do plano: sem esquema, sem sincronização até o Gabriel pedir, F4-B). O
// estado do gerador e as marcas do passo aberto ficam em JSON no armazenamento do aparelho, por
// pessoa; sem armazenamento (aba privada, cota), o Fio vale enquanto a página fica aberta.
import { useCallback, useSyncExternalStore } from 'react';
import { lerEstadoDoFio, type EstadoDoFio } from '../../../dominios/fio';

/** O que o Fio anotou do passo aberto para reconhecer, depois, que a pessoa o fez fora do cartão. */
export interface MarcasDoFio {
  /** Vencidos (Cartões e Frases) quando a pessoa entrou no Revisar; se baixaram, ela revisou. */
  vencidosAoAbrir?: number;
}

export interface FioGuardado {
  estado: EstadoDoFio;
  marcas: MarcasDoFio;
}

const EVENTO = 'arretado:fio';
const chaveDoEstado = (usuarioId: string) => `arretado:fio:v1:${usuarioId}`;
const chaveDasMarcas = (usuarioId: string) => `arretado:fio:marcas:v1:${usuarioId}`;

/** Quando o armazenamento recusa a escrita, o Fio segue na memória da página. */
const memoria = new Map<string, string>();

function lerBruto(chave: string): string | null {
  try {
    const guardado = window.localStorage.getItem(chave);
    if (guardado !== null) return guardado;
  } catch {
    /* sem armazenamento: vale a memória */
  }
  return memoria.get(chave) ?? null;
}

function gravarBruto(chave: string, texto: string): void {
  memoria.set(chave, texto);
  try {
    window.localStorage.setItem(chave, texto);
  } catch {
    /* só a memória */
  }
}

function lerJsonBruto(bruto: string | null): unknown {
  if (bruto === null) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

export function lerMarcas(guardado: unknown): MarcasDoFio {
  const v = (guardado as { vencidosAoAbrir?: unknown } | null)?.vencidosAoAbrir;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? { vencidosAoAbrir: v } : {};
}

let ultimo:
  { usuarioId: string; estado: string | null; marcas: string | null; fio: FioGuardado } | undefined;

/** O que está guardado agora; o mesmo objeto enquanto o texto guardado não muda (para o React). */
export function lerFio(usuarioId: string): FioGuardado {
  const estado = lerBruto(chaveDoEstado(usuarioId));
  const marcas = lerBruto(chaveDasMarcas(usuarioId));
  if (ultimo?.usuarioId === usuarioId && ultimo.estado === estado && ultimo.marcas === marcas) {
    return ultimo.fio;
  }
  const fio: FioGuardado = {
    estado: lerEstadoDoFio(lerJsonBruto(estado)),
    marcas: lerMarcas(lerJsonBruto(marcas)),
  };
  ultimo = { usuarioId, estado, marcas, fio };
  return fio;
}

export function gravarFio(usuarioId: string, fio: FioGuardado): void {
  gravarBruto(chaveDoEstado(usuarioId), JSON.stringify(fio.estado));
  gravarBruto(chaveDasMarcas(usuarioId), JSON.stringify(fio.marcas));
  window.dispatchEvent(new Event(EVENTO));
}

/** Zera o Fio desta pessoa neste aparelho (a etapa em curso e os pousos). */
export function zerarFio(usuarioId: string): void {
  memoria.delete(chaveDoEstado(usuarioId));
  memoria.delete(chaveDasMarcas(usuarioId));
  try {
    window.localStorage.removeItem(chaveDoEstado(usuarioId));
    window.localStorage.removeItem(chaveDasMarcas(usuarioId));
  } catch {
    /* idem */
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aviso: () => void): () => void {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener('storage', aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener('storage', aviso);
  };
}

/** O Fio guardado e quem o grava; reage a outra aba e às gravações desta. */
export function useFioGuardado(usuarioId: string): {
  fio: FioGuardado;
  gravar: (fio: FioGuardado) => void;
} {
  const fio = useSyncExternalStore(
    assinar,
    () => lerFio(usuarioId),
    () => lerFio(usuarioId),
  );
  const gravar = useCallback(
    (proximo: FioGuardado) => {
      gravarFio(usuarioId, proximo);
    },
    [usuarioId],
  );
  return { fio, gravar };
}
