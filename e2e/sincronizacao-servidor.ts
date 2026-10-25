// Servidor da sincronização para o E2E da conta (F4-B, B4): mora no teste e responde
// `/__sync/<função>` por `context.route`. É o único jeito de três aparelhos (três contextos do
// Playwright, sem `localStorage` em comum) verem a mesma conta. Espelha as regras de
// `supabase/migrations/20261025000000_f4b_sincronizacao.sql` (enviar_lote, posse); o SQL real é
// coberto por `supabase/convergencia.test.ts` (PGlite). O relógio é controlável para simular um
// aparelho parado (posse concedida sem pergunta depois de 60 s).
import type { BrowserContext, Route } from '@playwright/test';

interface Registro {
  colecao: string;
  id: string;
  ts_logico: string;
  dados: Record<string, unknown>;
  excluido_em: string | null;
}

interface Entrada {
  seq: number;
  aparelho_id: string;
  ts: string;
  colecao: string;
  registro_id: string;
  operacao: string;
  dados: Record<string, unknown> | null;
  removidos: string[] | null;
  base_ts: string | null;
  divergente: boolean;
  versao_esquema: number | null;
}

interface EntradaEnviada {
  ts: string;
  colecao: string;
  registro_id: string;
  operacao: string;
  dados?: Record<string, unknown>;
  removidos?: string[];
  base_ts: string | null;
}

const VALIDADE_MS = 2 * 60_000;
const PARADO_MS = 60_000;

export class ServidorDeSincronizacaoFalso {
  private seq = 0;
  private readonly log: Entrada[] = [];
  private readonly registros = new Map<string, Registro>();
  private posse: { aparelho_id: string; ate: number; atualizado_em: number } | null = null;
  private deslocamentoMs = 0;
  readonly aceites: string[] = [];
  readonly chamadas: string[] = [];
  private uid: string | null = null;
  /** Aparelhos (pelo nome dado em `instalar`) cuja rede caiu: toda chamada deles aborta. */
  private readonly semRede = new Set<string>();

  /** Relógio do servidor; `avancarRelogio` finge que o tempo passou (aparelho parado). */
  agora(): number {
    return Date.now() + this.deslocamentoMs;
  }
  avancarRelogio(ms: number): void {
    this.deslocamentoMs += ms;
  }
  get donoDaPosse(): string | null {
    return this.posse?.aparelho_id ?? null;
  }
  get entradasNoLog(): number {
    return this.log.length;
  }

  /** `nome` identifica o aparelho para `cortarRede`/`religarRede` (o `setOffline` do Playwright não barra rotas). */
  async instalar(context: BrowserContext, nome: string): Promise<void> {
    await context.route('**/__sync/*', (route) => this.atender(route, nome));
  }
  cortarRede(nome: string): void {
    this.semRede.add(nome);
  }
  religarRede(nome: string): void {
    this.semRede.delete(nome);
  }

  private async atender(route: Route, nome: string): Promise<void> {
    if (this.semRede.has(nome)) {
      await route.abort('internetdisconnected');
      return;
    }
    const funcao = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const corpo = route.request().postDataJSON() as Record<string, unknown>;
    this.chamadas.push(funcao);
    const uid = String(corpo.uid);
    this.uid ??= uid;
    if (uid !== this.uid) {
      await route.fulfill({ status: 403, body: 'outra conta' });
      return;
    }
    try {
      const resposta = this.chamar(funcao, corpo);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(resposta ?? null),
      });
    } catch (erro) {
      await route.fulfill({ status: 422, body: erro instanceof Error ? erro.message : 'falha' });
    }
  }

  private chamar(funcao: string, c: Record<string, unknown>): unknown {
    switch (funcao) {
      case 'aceitar_sincronizacao':
        this.aceites.push(String(c.versao));
        return null;
      case 'enviar_lote':
        return this.enviarLote(
          String(c.aparelhoId),
          Number(c.versao),
          c.entradas as EntradaEnviada[],
        );
      case 'puxar_log': {
        const depoisDe = Number(c.depoisDe);
        const operacao = c.operacao as string | null;
        return this.log
          .filter((e) => e.seq > depoisDe && (operacao === null || e.operacao === operacao))
          .slice(0, Number(c.limite));
      }
      case 'ler_registro':
        return this.registros.get(`${String(c.colecao)}|${String(c.id)}`) ?? null;
      case 'instantaneo_inicio':
        return this.seq;
      case 'puxar_registros': {
        const depois = c.depois as { colecao: string; id: string } | null;
        return [...this.registros.values()]
          .sort((a, b) => a.colecao.localeCompare(b.colecao) || a.id.localeCompare(b.id))
          .filter(
            (r) =>
              !depois ||
              r.colecao > depois.colecao ||
              (r.colecao === depois.colecao && r.id > depois.id),
          )
          .slice(0, Number(c.limite));
      }
      case 'registrar_sincronia':
        return null;
      case 'pedir_posse':
        return this.pedirPosse(String(c.aparelhoId), Boolean(c.forcar));
      case 'soltar_posse':
        if (this.posse && this.posse.aparelho_id === c.aparelhoId) this.posse.ate = this.agora();
        return null;
      default:
        throw new Error(`função desconhecida: ${funcao}`);
    }
  }

  private pedirPosse(aparelho: string, forcar: boolean) {
    const agora = this.agora();
    const atual = this.posse;
    const livre =
      !atual ||
      atual.aparelho_id === aparelho ||
      atual.ate <= agora ||
      atual.atualizado_em < agora - PARADO_MS;
    if (!atual || livre || forcar) {
      this.posse = { aparelho_id: aparelho, ate: agora + VALIDADE_MS, atualizado_em: agora };
      return { concedida: true, aparelho_id: aparelho };
    }
    return {
      concedida: false,
      aparelho_id: atual.aparelho_id,
      ultimo_sinal: new Date(atual.atualizado_em).toISOString(),
    };
  }

  private enviarLote(aparelho: string, versao: number, entradas: EntradaEnviada[]) {
    const divergentes: { colecao: string; registro_id: string; ts_servidor: string | null }[] = [];
    for (const e of entradas) {
      const chave = `${e.colecao}|${e.registro_id}`;
      const repetida = this.log.find(
        (x) => x.aparelho_id === aparelho && x.ts === e.ts && x.registro_id === e.registro_id,
      );
      if (repetida) {
        if (repetida.divergente) {
          divergentes.push({
            colecao: e.colecao,
            registro_id: e.registro_id,
            ts_servidor: this.registros.get(chave)?.ts_logico ?? null,
          });
        }
        continue;
      }
      const base = e.base_ts === '' ? null : e.base_ts;
      const nova: Entrada = {
        seq: ++this.seq,
        aparelho_id: aparelho,
        ts: e.ts,
        colecao: e.colecao,
        registro_id: e.registro_id,
        operacao: e.operacao,
        dados: e.dados ?? null,
        removidos: e.removidos ?? null,
        base_ts: base,
        divergente: false,
        versao_esquema: versao,
      };
      this.log.push(nova);
      if (e.operacao === 'acervo-adesao') continue;

      const atual = this.registros.get(chave);
      let novos: Record<string, unknown> | null = null;
      if (e.operacao === 'gravar') novos = e.dados ?? null;
      else if (atual) {
        if (e.operacao === 'atualizar') {
          novos = { ...atual.dados, ...(e.dados ?? {}) };
          for (const k of e.removidos ?? []) Reflect.deleteProperty(novos, k);
        } else novos = atual.dados;
      }
      const divergiu = atual ? atual.ts_logico !== base : base !== null || novos === null;
      if (divergiu) {
        nova.divergente = true;
        divergentes.push({
          colecao: e.colecao,
          registro_id: e.registro_id,
          ts_servidor: atual?.ts_logico ?? null,
        });
      } else if (atual && novos) {
        atual.dados = novos;
        atual.ts_logico = e.ts;
        atual.excluido_em = e.operacao === 'remover' ? new Date(this.agora()).toISOString() : null;
      } else if (novos) {
        this.registros.set(chave, {
          colecao: e.colecao,
          id: e.registro_id,
          ts_logico: e.ts,
          dados: novos,
          excluido_em: null,
        });
      }
    }
    return { seq_max: this.seq, divergentes };
  }
}
