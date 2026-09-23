import { Barramento } from "./eventos/barramento";
import { type Identidade, inicializarIdentidade } from "./identidade/servico";
import { RelogioHibrido } from "./log/relogio";
import type { BancoArretado } from "./persistencia/db";
import { ServicoDePreferencias } from "./preferencias/servico";

/** Tudo que domínios e apresentação recebem do Core. Criado uma vez por aparelho aberto. */
export interface Core {
  db: BancoArretado;
  relogio: RelogioHibrido;
  identidade: Identidade;
  preferencias: ServicoDePreferencias;
  eventos: Barramento;
}

export async function inicializarCore(db: BancoArretado): Promise<Core> {
  const relogio = new RelogioHibrido();
  const identidade = await inicializarIdentidade(db, relogio);
  const contexto = () => ({ usuarioId: identidade.usuarioId, aparelhoId: identidade.aparelhoId });
  const preferencias = new ServicoDePreferencias(db, contexto, relogio);
  const eventos = new Barramento((evento, erro) => {
    // Falha de handler nunca é "erro" na interface (D24); vira Problema em F4. Por ora, console.
    console.error(`[eventos] falha ao entregar ${evento}`, erro);
  });
  return { db, relogio, identidade, preferencias, eventos };
}
