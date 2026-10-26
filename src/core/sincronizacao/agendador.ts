// Agenda o envio: junta gravações próximas, repete com espera crescente e para quando pedido.

export interface OpcoesDoAgendador {
  /** Roda uma rodada de envio. Rejeitar = tentar de novo com espera crescente. */
  executar: () => Promise<void>;
  /** Espera antes de enviar depois de um pedido (junta o que veio no intervalo). */
  atrasoMs?: number;
  /** Primeira espera depois de uma falha; dobra até `maxEsperaMs`. */
  esperaInicialMs?: number;
  maxEsperaMs?: number;
  /** Cada rodada que rejeitou (a tela mostra a causa como Problema, B4). */
  aoFalhar?: (falha: unknown) => void;
}

export interface Agendador {
  /** Pede um envio; vários pedidos seguidos viram um só. `agora` não espera o atraso de juntar. */
  pedir(agora?: boolean): void;
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
  let repetirAgora = false; // pedir(true) durante uma rodada: a próxima sai sem o atraso
  let parado = false;
  let falhas = 0;

  const agendar = (ms: number) => {
    if (parado) return;
    if (timer !== null) {
      if (ms > 0) return;
      clearTimeout(timer); // "Sincronizar agora" encurta um atraso já marcado
    }
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
    } catch (falha: unknown) {
      falhas += 1;
      repetir = true;
      opcoes.aoFalhar?.(falha);
    } finally {
      rodando = false;
    }
    if (repetir) {
      repetir = false;
      const ja = repetirAgora;
      repetirAgora = false;
      agendar(falhas > 0 ? Math.min(maximo, inicial * 2 ** (falhas - 1)) : ja ? 0 : atraso);
    }
  };

  return {
    pedir(agora = false) {
      if (parado) return;
      if (rodando) {
        repetir = true;
        if (agora) repetirAgora = true;
      } else agendar(agora ? 0 : atraso);
    },
    parar() {
      parado = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
