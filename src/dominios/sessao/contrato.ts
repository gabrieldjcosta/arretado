// Contrato da Sessão leve (F3-A, pacote A2; `estacionar` é do A3a, em `estacionamento.ts`). A duração
// de uma Sessão nunca é tratada como aprendizado, e pausar não declara falha.
import type { AlvoDeAcao, OrigemDaAcao, Sessao } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';

export interface EntradaDeSessao {
  /** Ausente = Sessão livre. */
  alvo?: AlvoDeAcao;
  origemDaAcao?: OrigemDaAcao;
  tarefaId?: string;
  /** Até onde ler ("até o art. 15"); opcional. */
  fronteira?: string;
  temporizadorMin?: number;
}

export interface FechamentoDeSessao {
  /** Próximo passo pequeno; vem pré-preenchido e a pessoa pode deixar em branco. */
  proximoPasso?: string;
}

/** Assinaturas. O A2 implementa em `servico.ts`; o A3a, `estacionar`, em `estacionamento.ts`. */
export interface ServicoDeSessao {
  iniciarSessao: (repo: Repositorio, entrada: EntradaDeSessao) => Promise<Sessao>;
  pausarSessao: (repo: Repositorio, id: string) => Promise<Sessao>;
  retomarSessao: (repo: Repositorio, id: string) => Promise<Sessao>;
  encerrarSessao: (
    repo: Repositorio,
    id: string,
    fechamento?: FechamentoDeSessao,
  ) => Promise<Sessao>;
  /** A Sessão `ativa` ou `pausada` que ficou aberta (volta ao app); `undefined` se não houver. `interrompida` não restaura (decisão do A2, ver `servico.ts`). */
  restaurarSessao: (repo: Repositorio) => Promise<Sessao | undefined>;
  /** Estaciona uma distração na Sessão, sem sair do estudo. */
  estacionar: (repo: Repositorio, id: string, texto: string) => Promise<Sessao>;
}
