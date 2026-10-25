// "A lei mudou" (AP-05, leitura): depois de uma atualização, o que a pessoa guardou sobre um
// dispositivo cujo texto mudou no mesmo endereço (Frase, Cartão, Estrela, Erro), com o texto de
// antes (lido da versão arquivada) e o de agora. Só lê: nenhum texto da pessoa é alterado.
import type { Faixa } from '../../core/modelo';
import type { Repositorio } from '../../core/persistencia';
import { todos } from './consultas';
import { textoDosTrechos } from './comparacao';

export type TipoAfetado = 'frase' | 'cartao' | 'estrela' | 'erro';

export interface ItemAfetado {
  tipo: TipoAfetado;
  id: string;
  /** Como a pessoa o conhece: o texto da Frase, a frente do Cartão, o que foi o Erro. */
  titulo: string;
  /** Faixa do Ponto ligado ao item, quando houver. */
  faixa?: Faixa | undefined;
}

export interface MudancaDeDispositivo {
  dispositivoId: string;
  endereco: string;
  rotulo?: string | undefined;
  antes: string;
  agora: string;
  /** Do mais cobrado ao menos (faixa), depois pelo tipo. */
  afetados: ItemAfetado[];
}

const REVOGADO = new Set(['revogado', 'eficacia_cessada']);
const PESO: Record<Faixa, number> = { altissima: 3, alta: 2, media: 1, extra: 0 };
const peso = (f: Faixa | undefined) => (f === undefined ? PESO.media : PESO[f]);

/**
 * Dispositivos da norma cujo texto na versão vigente difere do da versão arquivada mais recente
 * e que têm algo guardado pela pessoa. Ordenados pela faixa mais alta entre os afetados.
 */
export async function mudancasQueAfetam(
  repo: Repositorio,
  normaId: string,
  /** Dispositivos que mudaram sem mudar o texto (revogados na atualização que está sendo aplicada). */
  tambem: ReadonlySet<string> = new Set(),
): Promise<MudancaDeDispositivo[]> {
  const norma = await repo.colecao('normas').obter(normaId);
  if (!norma?.versaoVigenteId) return [];
  const versoes = await todos(repo.colecao('versoesNorma'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  });
  const anterior = versoes
    .filter((v) => v.status === 'arquivada' && v.id !== norma.versaoVigenteId)
    .sort((a, b) => b.capturadaEm.localeCompare(a.capturadaEm))[0];
  if (!anterior) return [];

  const textosDe = async (versaoId: string) =>
    new Map(
      (
        await todos(repo.colecao('textosDispositivo'), {
          indice: 'versaoId',
          de: versaoId,
          ate: versaoId,
        })
      ).map((t) => [t.dispositivoId, textoDosTrechos(t.trechos)]),
    );
  const [antes, agora] = await Promise.all([
    textosDe(anterior.id),
    textosDe(norma.versaoVigenteId),
  ]);
  const mudados = new Set<string>();
  for (const [id, texto] of agora) {
    const antigo = antes.get(id);
    if (antigo !== undefined && antigo !== texto) mudados.add(id);
  }
  for (const id of tambem) mudados.add(id);
  // Já avisados e ainda abertos (a tela relê o aviso depois): o aviso é o registro de que mudou.
  for (const p of await todos(repo.colecao('pendenciasReleitura'), {
    indice: 'normaId',
    de: normaId,
    ate: normaId,
  })) {
    if (
      p.tipo === 'texto_alterado' &&
      p.resolvidaEm === undefined &&
      p.referenciaId !== undefined
    ) {
      mudados.add(p.referenciaId);
    }
  }
  if (mudados.size === 0) return [];

  const faixaDoPonto = new Map(
    (await repo.colecao('pontos').todosDoUsuario())
      .filter((p) => p.excluidoEm === null)
      .map((p) => [p.id, p.faixa]),
  );
  const faixaDe = (pontoId: string | undefined) =>
    pontoId === undefined ? undefined : faixaDoPonto.get(pontoId);
  const vivos = <T extends { excluidoEm: string | null }>(l: T[]) =>
    l.filter((x) => x.excluidoEm === null);

  const porDispositivo = new Map<string, ItemAfetado[]>();
  const somar = (dispositivoId: string | undefined, item: ItemAfetado) => {
    if (dispositivoId === undefined || !mudados.has(dispositivoId)) return;
    porDispositivo.set(dispositivoId, [...(porDispositivo.get(dispositivoId) ?? []), item]);
  };

  const frases = vivos(await repo.colecao('frases').todosDoUsuario()).filter(
    (f) => f.estado === 'ativa',
  );
  const dispositivoDaFrase = new Map<string, string>();
  for (const f of frases) {
    const d = f.trecho?.dispositivoId;
    if (d === undefined) continue;
    dispositivoDaFrase.set(f.id, d);
    somar(d, { tipo: 'frase', id: f.id, titulo: f.texto, faixa: faixaDe(f.pontoId) });
  }
  for (const c of vivos(await repo.colecao('cartoes').todosDoUsuario())) {
    if (c.estado === 'arquivado') continue;
    const d =
      c.origemTipo === 'dispositivo'
        ? c.origemId
        : c.fraseId === undefined
          ? undefined
          : dispositivoDaFrase.get(c.fraseId);
    somar(d, { tipo: 'cartao', id: c.id, titulo: c.frente, faixa: faixaDe(c.pontoId) });
  }
  for (const e of vivos(await repo.colecao('estrelas').todosDoUsuario())) {
    if (e.normaId === normaId) somar(e.alvoId, { tipo: 'estrela', id: e.id, titulo: 'Estrela' });
  }
  for (const e of vivos(await repo.colecao('erros').todosDoUsuario())) {
    if (e.status !== 'descartado')
      somar(e.dispositivoId, {
        tipo: 'erro',
        id: e.id,
        titulo: e.oQueFoi ?? e.fraseCorreta ?? 'Erro',
        faixa: faixaDe(e.pontoId),
      });
  }

  const dispositivos = new Map(
    (await repo.colecao('dispositivos').todosDoUsuario())
      .filter((d) => d.normaId === normaId)
      .map((d) => [d.id, d]),
  );
  const ordemTipo: Record<TipoAfetado, number> = { frase: 0, cartao: 1, estrela: 2, erro: 3 };
  const saida: MudancaDeDispositivo[] = [];
  for (const [dispositivoId, itens] of porDispositivo) {
    const d = dispositivos.get(dispositivoId);
    if (!d) continue;
    itens.sort((a, b) => peso(b.faixa) - peso(a.faixa) || ordemTipo[a.tipo] - ordemTipo[b.tipo]);
    saida.push({
      dispositivoId,
      endereco: d.endereco,
      rotulo: d.rotulo,
      antes: antes.get(dispositivoId) ?? '',
      agora: (REVOGADO.has(d.status) ? 'Revogado. ' : '') + (agora.get(dispositivoId) ?? ''),
      afetados: itens,
    });
  }
  const topo = (m: MudancaDeDispositivo) => Math.max(...m.afetados.map((i) => peso(i.faixa)));
  return saida.sort((a, b) => topo(b) - topo(a) || a.endereco.localeCompare(b.endereco));
}

/**
 * "Atualizar minha Frase": a pessoa reescreve a Frase depois de ler o texto novo. É sempre ação dela
 * (o app nunca troca o texto em silêncio); a data da próxima Revisão não muda.
 */
export async function atualizarTextoDaFrase(
  repo: Repositorio,
  fraseId: string,
  texto: string,
): Promise<void> {
  const limpo = texto.trim();
  if (limpo === '' || limpo.length > 2_000) throw new Error('Texto da Frase inválido.');
  await repo.colecao('frases').atualizar(fraseId, { texto: limpo });
}
