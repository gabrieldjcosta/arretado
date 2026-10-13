// Contrato da Sessão leve (F3-A, pacote A2; estacionamento no A3a). Só tipos e funções que lançam
// "não implementado"; o pacote dono preenche. A duração de uma Sessão nunca é tratada como
// aprendizado, e pausar não declara falha.
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

/** Assinaturas que os pacotes A2 (e A3a, `estacionar`) implementam. */
export interface ServicoDeSessao {
  iniciarSessao: (repo: Repositorio, entrada: EntradaDeSessao) => Promise<Sessao>;
  pausarSessao: (repo: Repositorio, id: string) => Promise<Sessao>;
  retomarSessao: (repo: Repositorio, id: string) => Promise<Sessao>;
  encerrarSessao: (
    repo: Repositorio,
    id: string,
    fechamento?: FechamentoDeSessao,
  ) => Promise<Sessao>;
  /** A Sessão `ativa` ou `pausada` que ficou aberta (volta ao app); `undefined` se não houver. O A2 decide se `interrompida` também restaura. */
  restaurarSessao: (repo: Repositorio) => Promise<Sessao | undefined>;
  /** Estaciona uma distração na Sessão, sem sair do estudo. */
  estacionar: (repo: Repositorio, id: string, texto: string) => Promise<Sessao>;
}

const naoImplementado = (nome: string, pacote: string): Promise<never> =>
  Promise.reject(new Error(`${nome}: não implementado (pacote ${pacote})`));

export const iniciarSessao: ServicoDeSessao['iniciarSessao'] = () =>
  naoImplementado('iniciarSessao', 'A2');
export const pausarSessao: ServicoDeSessao['pausarSessao'] = () =>
  naoImplementado('pausarSessao', 'A2');
export const retomarSessao: ServicoDeSessao['retomarSessao'] = () =>
  naoImplementado('retomarSessao', 'A2');
export const encerrarSessao: ServicoDeSessao['encerrarSessao'] = () =>
  naoImplementado('encerrarSessao', 'A2');
export const restaurarSessao: ServicoDeSessao['restaurarSessao'] = () =>
  naoImplementado('restaurarSessao', 'A2');
export const estacionar: ServicoDeSessao['estacionar'] = () => naoImplementado('estacionar', 'A3a');
