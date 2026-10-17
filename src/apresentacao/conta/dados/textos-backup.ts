import { dataCivil } from '../../../core/datas';

/** Textos de tela num só lugar (guia de voz: sem sotaque em backup). */
export const TEXTOS = {
  titulo: 'Seus dados',
  nunca: 'Ainda não há backup. Seus dados estão só neste aparelho.',
  hoje: 'Último backup: hoje.',
  ontem: 'Último backup: ontem.',
  dias: (n: number) => `Último backup: há ${String(n)} dias.`,
  persistente: 'Este aparelho guarda os dados com proteção contra limpeza.',
  temporario: 'O navegador pode limpar os dados se faltar espaço. Faça um backup.',
  indisponivel: 'Este navegador não informa se os dados podem ser limpos. Faça um backup.',
  acao: 'Fazer backup agora',
};

export const COMO_GUARDAR_BACKUP = {
  titulo: 'Como guardar seu backup',
  passo1: '“Exportar” baixa um arquivo com tudo o que você estudou e configurou no Arretado.',
  passo2: 'Guarde fora deste aparelho (pendrive, e-mail para você mesmo ou uma pasta na nuvem).',
  passo3: 'Para voltar, use “Importar” neste ou em outro aparelho.',
  senha:
    'A proteção por senha é opcional na exportação — útil para guardar em nuvem de terceiros (o Arretado não guarda a senha; sem ela, não há como abrir o arquivo).',
  lembrete: 'Repita o backup de vez em quando para manter seus estudos protegidos.',
};

export const TEXTOS_EXPORTAR_TEXTO = {
  titulo: 'Exportar em texto',
  dica: 'Arquivo sem senha, para ler ou guardar onde quiser. Não serve para restaurar; para isso, use o backup.',
  frasesBotao: 'Frases corretas (.txt)',
  resumosBotao: 'Resumos (.txt)',
  semFrases: 'Nenhuma frase ainda',
  semResumos: 'Nenhum resumo ainda',
};

const DIA = 86_400_000;

export function textoDoBackup(data: string | null, agora = Date.now()): string {
  if (data === null) return TEXTOS.nunca;
  const t = Date.parse(data);
  if (Number.isNaN(t)) return TEXTOS.nunca;
  const dias = Math.floor((agora - t) / DIA);
  if (dias <= 0) return TEXTOS.hoje;
  return dias === 1 ? TEXTOS.ontem : TEXTOS.dias(dias);
}

export function obterNomeDaDisciplina(
  disciplinaId: string | undefined,
  disciplinas?: Record<string, string> | Map<string, string>,
): string | undefined {
  if (!disciplinaId || !disciplinas) return undefined;
  if (disciplinas instanceof Map) {
    return disciplinas.get(disciplinaId)?.trim() || undefined;
  }
  return disciplinas[disciplinaId]?.trim() || undefined;
}

/** Formata frases para exportação em texto: agrupadas por disciplina quando houver, um item por bloco. */
export function formatarFrasesTexto(
  frases: Array<{ texto: string; disciplinaId?: string }>,
  disciplinas?: Record<string, string> | Map<string, string>,
): string {
  if (frases.length === 0) return '';

  const temAlgumaDisciplina = frases.some(
    (f) => obterNomeDaDisciplina(f.disciplinaId, disciplinas) !== undefined,
  );

  if (!temAlgumaDisciplina) {
    return frases
      .map((f) => f.texto.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  const grupos = new Map<string, string[]>();
  const semDisciplina: string[] = [];

  for (const f of frases) {
    const texto = f.texto.trim();
    if (!texto) continue;
    const nome = obterNomeDaDisciplina(f.disciplinaId, disciplinas);
    if (nome) {
      const lista = grupos.get(nome) ?? [];
      lista.push(texto);
      grupos.set(nome, lista);
    } else {
      semDisciplina.push(texto);
    }
  }

  const saida: string[] = [];
  const nomesOrdenados = Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  for (const nome of nomesOrdenados) {
    const itens = grupos.get(nome);
    if (!itens || itens.length === 0) continue;
    saida.push(`# ${nome}\n\n${itens.join('\n\n')}`);
  }

  if (semDisciplina.length > 0) {
    saida.push(`# Sem disciplina\n\n${semDisciplina.join('\n\n')}`);
  }

  return saida.join('\n\n');
}

/** Formata um resumo individual como bloco de texto (título e corpo). */
export function formatarItemResumo(r: { titulo?: string; conteudo: string }): string {
  const corpo = r.conteudo.trim();
  const tit = r.titulo?.trim();
  if (!tit) return corpo;
  if (corpo === tit) return corpo;
  if (corpo.startsWith(tit)) {
    return corpo;
  }
  return `${tit}\n\n${corpo}`;
}

/** Formata resumos para exportação em texto: agrupados por disciplina quando houver, um item por bloco. */
export function formatarResumosTexto(
  resumos: Array<{ titulo?: string; conteudo: string; disciplinaId?: string }>,
  disciplinas?: Record<string, string> | Map<string, string>,
): string {
  if (resumos.length === 0) return '';

  const temAlgumaDisciplina = resumos.some(
    (r) => obterNomeDaDisciplina(r.disciplinaId, disciplinas) !== undefined,
  );

  if (!temAlgumaDisciplina) {
    return resumos.map(formatarItemResumo).filter(Boolean).join('\n\n');
  }

  const grupos = new Map<string, string[]>();
  const semDisciplina: string[] = [];

  for (const r of resumos) {
    const itemFormatado = formatarItemResumo(r);
    if (!itemFormatado) continue;
    const nome = obterNomeDaDisciplina(r.disciplinaId, disciplinas);
    if (nome) {
      const lista = grupos.get(nome) ?? [];
      lista.push(itemFormatado);
      grupos.set(nome, lista);
    } else {
      semDisciplina.push(itemFormatado);
    }
  }

  const saida: string[] = [];
  const nomesOrdenados = Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  for (const nome of nomesOrdenados) {
    const itens = grupos.get(nome);
    if (!itens || itens.length === 0) continue;
    saida.push(`# ${nome}\n\n${itens.join('\n\n')}`);
  }

  if (semDisciplina.length > 0) {
    saida.push(`# Sem disciplina\n\n${semDisciplina.join('\n\n')}`);
  }

  return saida.join('\n\n');
}

/** Nome do arquivo exportado com a data no formato AAAA-MM-DD. */
export function nomeArquivoExportacao(tipo: 'frases' | 'resumos', data = new Date()): string {
  return `arretado-${tipo}-${dataCivil(data)}.txt`;
}

/** Dispara o download de um arquivo .txt em UTF-8. */
export function baixarTexto(texto: string, nomeArquivo: string): void {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}
