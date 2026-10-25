// Agenda o envio: junta gravações próximas, repete com espera crescente e para quando pedido.

export interface OpcoesDoAgendador {
  /** Roda uma rodada de envio. Rejeitar = tentar de novo com espera crescente. */
  executar: () => Promise<void>;
  /** Espera antes de enviar depois de um pedido (junta o que veio no intervalo). */
  atrasoMs?: number;
  /** Primeira espera depois de uma falha; dobra até `maxEsperaMs`. */
  esperaInicialMs?: number;
  maxEsperaMs?: number;
}

export interface Agendador {
  /** Pede um envio; vários pedidos seguidos viram um só. */
  pedir(): void;
  /** Cancela o que está agendado e ignora pedidos futuros. */
  parar(): void;
}

export function criarAgendador(opcoes: OpcoesDoAgendador): Agendador {
  const atraso = opcoes.atrasoMs ?? 5_000;
  const inicial = opcoes.esperaInicialMs ?? 2_000;
  const maximo = opcoes.maxEsperaMs ?? 300_000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let rodando = false;
  let repetir = false;
  let parado = false;
  let falhas = 0;

  const agendar = (ms: number) => {
    if (parado || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      void rodar();
    }, ms);
  };

  const rodar = async () => {
    if (parado) return;
    if (rodando) {
      repetir = true;
      return;
    }
    rodando = true;
    try {
      await opcoes.executar();
      falhas = 0;
    } catch {
      falhas += 1;
      repetir = true;
    } finally {
      rodando = false;
    }
    if (repetir) {
      repetir = false;
      agendar(falhas > 0 ? Math.min(maximo, inicial * 2 ** (falhas - 1)) : atraso);
    }
  };

  return {
    pedir() {
      if (parado) return;
      if (rodando) repetir = true;
      else agendar(atraso);
    },
    parar() {
      parado = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
