// Pontos importados entram pelo mesmo caminho do pacote: prévia, snapshot, log e desfazer.
import type { Disciplina, NomeColecao, Ponto } from '../../core/modelo';
import { planejar, type PacoteLido, type Previa } from '../../core/pacote';
import { VERSAO_ESQUEMA, type Repositorio } from '../../core/persistencia';
import { VERSAO_APP } from '../../core/versao';
import type { LinhaPonto } from './csv';

async function sha256(texto: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

/**
 * Id determinístico (UUID versão 8 derivado de SHA-256): o mesmo ponto do mesmo usuário
 * tem sempre o mesmo id, então importar a mesma planilha de novo não duplica nada.
 */
export async function idDeterministico(...partes: string[]): Promise<string> {
  const b = (await sha256(partes.join('\u0000'))).slice(0, 16);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x80;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function chave(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface PontosPreparados {
  pacote: PacoteLido;
  previa: Previa;
  disciplinas: number;
  pontos: number;
}

/** Monta os registros e calcula a prévia no modo 2 (só novos). Não escreve nada. */
export async function prepararPontos(
  repo: Repositorio,
  linhas: LinhaPonto[],
  textoOriginal: string,
): Promise<PontosPreparados> {
  const u = repo.ctx.usuarioId;
  const agora = repo.ctx.agora().toISOString();
  const comuns = () => ({
    usuarioId: u,
    criadoEm: agora,
    atualizadoEm: agora,
    tsLogico: repo.ctx.relogio.tick(),
    origem: 'importacao' as const,
    excluidoEm: null,
  });

  const disciplinas = new Map<string, Disciplina>();
  for (const [ordem, l] of linhas.entries()) {
    const k = chave(l.disciplina);
    if (!disciplinas.has(k)) {
      disciplinas.set(k, {
        id: await idDeterministico('disciplina', u, k),
        ...comuns(),
        nome: l.disciplina,
        ordem,
      });
    }
  }
  const pontos: Ponto[] = [];
  for (const [ordem, l] of linhas.entries()) {
    const disciplina = disciplinas.get(chave(l.disciplina));
    if (!disciplina) continue;
    pontos.push({
      id: await idDeterministico('ponto', u, chave(l.disciplina), chave(l.titulo)),
      ...comuns(),
      titulo: l.titulo,
      disciplinaId: disciplina.id,
      prioridade: ordem,
      somenteLeitura: true,
      ...(l.codigo ? { codigo: l.codigo } : {}),
      ...(l.faixa
        ? {
            faixa: l.faixa,
            logPrioridade: [
              { em: agora, antes: {}, depois: { faixa: l.faixa }, origem: 'importacao' as const },
            ],
          }
        : {}),
    });
  }

  const hashArquivo = Array.from(await sha256(textoOriginal), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
  const pacote: PacoteLido = {
    manifesto: {
      formato: 'arretado-pacote',
      versaoFormato: 1,
      versaoEsquema: VERSAO_ESQUEMA,
      versaoApp: VERSAO_APP,
      criadoEm: agora,
      usuarioId: u,
      aparelhoId: repo.ctx.aparelhoId,
      escopo: { tipo: 'modulos', modulos: ['plano'] },
      modulos: ['plano'],
      incluiLog: false,
      incluiAnexos: false,
      contagens: { disciplinas: disciplinas.size, pontos: pontos.length },
      arquivos: {},
      hashConjunto: hashArquivo,
    },
    registros: new Map<NomeColecao, Record<string, unknown>[]>([
      ['disciplinas', [...disciplinas.values()]],
      ['pontos', pontos],
    ]),
    log: null,
    anexos: new Map(),
    hashArquivo,
    cifrado: false,
  };
  const previa = await planejar(repo, pacote, { modo: 2 });
  return { pacote, previa, disciplinas: disciplinas.size, pontos: pontos.length };
}
