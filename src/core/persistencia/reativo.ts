import { liveQuery, type Observable } from "dexie";

/** Consulta reativa: reexecuta quando as tabelas lidas mudam. Fachada sobre o Dexie (T3). */
export type Observavel<T> = Observable<T>;

export function observar<T>(consulta: () => Promise<T> | T): Observavel<T> {
  return liveQuery(consulta);
}
