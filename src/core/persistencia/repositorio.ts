import { Barramento } from '../eventos/barramento';
import { novoId as novoIdPadrao, RelogioLogico } from '../ids';
import type { NomeColecao, Preferencias } from '../modelo';
import { BancoArretado, NOME_BANCO_PRINCIPAL } from './banco';
import { Colecao, type Dados } from './colecao';
import type { Contexto } from './contexto';

interface Identidade {
  usuarioId: string;
  aparelhoId: string;
}

export const PREFERENCIAS_PADRAO: Dados<'preferencias'> = {
  tema: 'sistema',
  fonteLeitura: 'serifa',
  tamanhoFonte: 18,
  mostrarRedacoesAnteriores: false,
  modulosDesabilitados: [],
  retencaoSnapshots: 5,
} satisfies Omit<Preferencias, keyof import('../modelo').CamposComuns>;

export interface OpcoesRepositorio {
  nomeBanco?: string;
  agora?: () => Date;
  novoId?: () => string;
  eventos?: Barramento;
  nomeAparelho?: string;
}

/** Ponto de entrada do core de dados: banco aberto, identidade local garantida, coleções. */
export class Repositorio {
  private readonly cache = new Map<NomeColecao, Colecao<NomeColecao>>();

  private constructor(readonly ctx: Contexto) {}

  get db(): BancoArretado {
    return this.ctx.db;
  }

  get eventos(): Barramento {
    return this.ctx.eventos;
  }

  colecao<N extends NomeColecao>(nome: N): Colecao<N> {
    let c = this.cache.get(nome);
    if (!c) {
      c = new Colecao(this.ctx, nome);
      this.cache.set(nome, c);
    }
    return c as unknown as Colecao<N>;
  }

  /** Várias escritas atômicas; eventos só saem depois da confirmação. */
  transacao<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction('rw', this.db.tables, fn);
  }

  fechar(): void {
    this.db.close();
  }

  static async abrir(opcoes: OpcoesRepositorio = {}): Promise<Repositorio> {
    const db = new BancoArretado(opcoes.nomeBanco ?? NOME_BANCO_PRINCIPAL);
    await db.open();
    const novoId = opcoes.novoId ?? novoIdPadrao;
    const agora = opcoes.agora ?? (() => new Date());
    const eventos = opcoes.eventos ?? new Barramento();

    const salva = (await db.meta.get('identidade'))?.valor as Identidade | undefined;
    const identidade: Identidade = salva ?? { usuarioId: novoId(), aparelhoId: novoId() };
    const relogio = new RelogioLogico(identidade.aparelhoId, () => agora().getTime());
    const ultima = await db.alteracoes.orderBy('ts').last();
    if (ultima) relogio.observar(ultima.ts);

    const repo = new Repositorio({ db, ...identidade, relogio, eventos, agora, novoId });
    if (!salva) await repo.criarIdentidade(identidade, opcoes.nomeAparelho);
    return repo;
  }

  /** Primeira abertura: Usuário local, este Aparelho e Preferências padrão (Parte 1 §7.2). */
  private async criarIdentidade(identidade: Identidade, nomeAparelho = 'Este aparelho') {
    await this.transacao(async () => {
      await this.colecao('usuarios').criar(
        { consentimentos: [] },
        { id: identidade.usuarioId, origem: 'sistema' },
      );
      await this.colecao('aparelhos').criar(
        { nome: nomeAparelho, plataforma: plataformaAtual() },
        { id: identidade.aparelhoId, origem: 'sistema' },
      );
      await this.colecao('preferencias').criar(PREFERENCIAS_PADRAO, { origem: 'sistema' });
      await this.db.meta.put({ chave: 'identidade', valor: identidade });
    });
  }
}

function plataformaAtual(): string {
  const ua = typeof navigator === 'undefined' ? 'desconhecida' : navigator.userAgent;
  return ua.slice(0, 200) || 'desconhecida';
}
