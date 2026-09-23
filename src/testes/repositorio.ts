import { Repositorio, type OpcoesRepositorio } from '../core/persistencia';

let contador = 0;

/** Repositório isolado (banco próprio no fake-indexeddb) com relógio controlável. */
export async function repositorioDeTeste(
  opcoes: OpcoesRepositorio & { inicio?: string } = {},
): Promise<{ repo: Repositorio; relogio: { agora: Date; avancar: (ms: number) => void } }> {
  const relogio = {
    agora: new Date(opcoes.inicio ?? '2026-09-23T12:00:00.000Z'),
    avancar(ms: number) {
      this.agora = new Date(this.agora.getTime() + ms);
    },
  };
  contador += 1;
  const repo = await Repositorio.abrir({
    nomeBanco: `teste-${String(contador)}-${Math.random().toString(36).slice(2)}`,
    agora: () => relogio.agora,
    ...opcoes,
  });
  return { repo, relogio };
}
