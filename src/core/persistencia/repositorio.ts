import { Barramento } from '../eventos/barramento';
import { novoId as novoIdPadrao, RelogioLogico } from '../ids';
import type { NomeColecao, Preferencias } from '../modelo';
import { BancoArretado, NOME_BANCO_PRINCIPAL } from './banco';
import { Colecao, type Dados } from './colecao';
import type { Contexto } from './contexto';
import { CHAVE_MIGRACAO_FRASES, migrarFrasesDosErros } from './migracao-frases';

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
  /** Só na criação do banco: identidade que ele já nasce com (conta: `auth.users.id`, T26). */
  usuarioId?: string;
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

  /**
   * Mesmo banco, outro usuário (restauração integral de pacote de outra identidade).
   * Não grava nada; quem troca a identidade salva é `adotarIdentidade`.
   */
  comUsuario(usuarioId: string): Repositorio {
    return new Repositorio({ ...this.ctx, usuarioId });
  }

  /** Grava a identidade local; chamar dentro da transação que troca os dados. */
  async adotarIdentidade(usuarioId: string): Promise<void> {
    await this.db.meta.put({
      chave: 'identidade',
      valor: { usuarioId, aparelhoId: this.ctx.aparelhoId } satisfies Identidade,
    });
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

    const base = { db, eventos, agora, novoId };
    const identidade =
      ((await db.meta.get('identidade'))?.valor as Identidade | undefined) ??
      (await Repositorio.criarIdentidade(base, opcoes.nomeAparelho, opcoes.usuarioId));
    const relogio = new RelogioLogico(identidade.aparelhoId, () => agora().getTime());
    const ultima = await db.alteracoes.orderBy('ts').last();
    if (ultima) relogio.observar(ultima.ts);
    const repo = new Repositorio({ ...base, ...identidade, relogio });
    if (!(await db.meta.get(CHAVE_MIGRACAO_FRASES))) await migrarFrasesDosErros(repo);
    return repo;
  }

  /**
   * Primeira abertura: Usuário local, este Aparelho e Preferências padrão (Parte 1 §7.2).
   * Relê a identidade dentro da transação: se outra aba acabou de criá-la, usa a dela.
   */
  private static async criarIdentidade(
    base: Pick<Contexto, 'db' | 'eventos' | 'agora' | 'novoId'>,
    nomeAparelho = 'Este aparelho',
    usuarioId?: string,
  ): Promise<Identidade> {
    const candidata: Identidade = {
      usuarioId: usuarioId ?? base.novoId(),
      aparelhoId: base.novoId(),
    };
    const relogio = new RelogioLogico(candidata.aparelhoId, () => base.agora().getTime());
    const repo = new Repositorio({ ...base, ...candidata, relogio });
    return repo.transacao(async () => {
      const existente = (await repo.db.meta.get('identidade'))?.valor as Identidade | undefined;
      if (existente) return existente;
      await repo
        .colecao('usuarios')
        .criar({ consentimentos: [] }, { id: candidata.usuarioId, origem: 'sistema' });
      await repo
        .colecao('aparelhos')
        .criar(
          { nome: nomeAparelho, plataforma: plataformaAtual() },
          { id: candidata.aparelhoId, origem: 'sistema' },
        );
      await repo.colecao('preferencias').criar(PREFERENCIAS_PADRAO, { origem: 'sistema' });
      await repo.db.meta.put({ chave: 'identidade', valor: candidata });
      return candidata;
    });
  }
}

function plataformaAtual(): string {
  const ua = typeof navigator === 'undefined' ? 'desconhecida' : navigator.userAgent;
  return ua.slice(0, 200) || 'desconhecida';
}
