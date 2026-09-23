// Leitura de pontos do edital em CSV (atividade 6.10). A planilha do Ciclo Obrigatório
// é exportada como CSV (Excel ou Google Planilhas) com as colunas abaixo.
import type { Faixa } from '../../core/modelo';

export interface LinhaPonto {
  disciplina: string;
  titulo: string;
  codigo?: string;
  faixa?: Faixa;
}

export interface LeituraCsv {
  linhas: LinhaPonto[];
  avisos: string[];
}

export class CsvInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'CsvInvalido';
  }
}

export const LIMITE_CSV = 2_000_000;

/**
 * Texto do arquivo: UTF-8 quando válido; senão Windows-1252, o padrão do Excel em
 * português ao salvar CSV (sem isso, todo acento viraria "�").
 */
export function decodificarCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Chave de comparação: sem acento, minúsculas, espaços colapsados (também usada nos ids). */
export function chave(s: string): string {
  return semAcento(s).replace(/\s+/g, ' ');
}

function semAcento(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const COLUNAS: Record<keyof LinhaPonto, string[]> = {
  disciplina: ['disciplina', 'materia'],
  titulo: ['ponto', 'topico', 'assunto', 'conteudo', 'tema'],
  faixa: ['faixa', 'prioridade', 'incidencia'],
  codigo: ['codigo', 'cod', 'item', 'numero', 'n', 'no'],
};

const FAIXAS: Record<string, Faixa> = {
  altissima: 'altissima',
  'muito alta': 'altissima',
  alta: 'alta',
  media: 'media',
  extra: 'extra',
};

/** Separador do cabeçalho: o mais frequente fora de aspas entre ";", tab e ",". */
function separador(texto: string): string {
  let aspas = false;
  const contagem: Record<string, number> = { ';': 0, '\t': 0, ',': 0 };
  for (const c of texto) {
    if (c === '"') aspas = !aspas;
    else if (!aspas && (c === '\n' || c === '\r')) break;
    else if (!aspas && c in contagem) contagem[c] = (contagem[c] ?? 0) + 1;
  }
  const [melhor] = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return melhor && melhor[1] > 0 ? melhor[0] : ';';
}

interface LinhaCsv {
  valores: string[];
  /** Linha física (1 = primeira) onde o registro começa. */
  numero: number;
}

function registros(texto: string): LinhaCsv[] {
  const semBom = texto.replace(/^\ufeff/, '');
  const sep = separador(semBom);
  const saida: LinhaCsv[] = [];
  let linha: string[] = [];
  let atual = '';
  let aspas = false;
  let fisica = 1;
  let inicio = 1;
  for (let i = 0; i < semBom.length; i++) {
    const c = semBom.charAt(i);
    if (aspas) {
      if (c === '"' && semBom[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') aspas = false;
      else {
        if (c === '\n' || (c === '\r' && semBom[i + 1] !== '\n')) fisica++;
        atual += c;
      }
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(atual);
      atual = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && semBom[i + 1] === '\n') i++;
      linha.push(atual);
      saida.push({ valores: linha, numero: inicio });
      fisica++;
      inicio = fisica;
      linha = [];
      atual = '';
    } else atual += c;
  }
  if (atual !== '' || linha.length > 0) {
    linha.push(atual);
    saida.push({ valores: linha, numero: inicio });
  }
  return saida.filter((l) => l.valores.some((c) => c.trim() !== ''));
}

/** Divide o CSV em linhas e células (aspas duplas, separador detectado no cabeçalho). */
export function celulas(texto: string): string[][] {
  return registros(texto).map((l) => l.valores);
}

export function lerCsvPontos(texto: string): LeituraCsv {
  if (texto.length > LIMITE_CSV)
    throw new CsvInvalido('O arquivo é grande demais (limite de 2 MB).');
  const [primeira, ...dados] = registros(texto);
  if (!primeira) throw new CsvInvalido('O arquivo está vazio.');
  const cabecalho = primeira.valores;
  const indice = (campo: keyof LinhaPonto) =>
    cabecalho.findIndex((c) =>
      COLUNAS[campo].includes(
        semAcento(c)
          .replace(/[º°.:]/g, '')
          .trim(),
      ),
    );
  const iDisciplina = indice('disciplina');
  const iTitulo = indice('titulo');
  const iFaixa = indice('faixa');
  const iCodigo = indice('codigo');
  if (iDisciplina < 0 || iTitulo < 0) {
    throw new CsvInvalido(
      'Não encontrei as colunas "Disciplina" e "Ponto" na primeira linha. Veja o modelo nas Orientações.',
    );
  }

  const linhas: LinhaPonto[] = [];
  const avisos: string[] = [];
  let semFaixa = 0;
  const vistos = new Set<string>();
  dados.forEach(({ valores: l, numero }) => {
    const disciplina = (l[iDisciplina] ?? '').trim();
    const titulo = (l[iTitulo] ?? '').trim();
    if (!disciplina || !titulo) {
      avisos.push(`Linha ${String(numero)} ignorada: falta disciplina ou ponto.`);
      return;
    }
    const k = `${chave(disciplina)}|${chave(titulo)}`;
    if (vistos.has(k)) {
      avisos.push(`Linha ${String(numero)} ignorada: ponto repetido na mesma disciplina.`);
      return;
    }
    vistos.add(k);
    const textoFaixa = iFaixa >= 0 ? semAcento(l[iFaixa] ?? '') : '';
    const faixa = FAIXAS[textoFaixa];
    if (textoFaixa && !faixa) semFaixa += 1;
    const codigo = iCodigo >= 0 ? (l[iCodigo] ?? '').trim() : '';
    linhas.push({
      disciplina: disciplina.slice(0, 500),
      titulo: titulo.slice(0, 500),
      ...(codigo ? { codigo: codigo.slice(0, 50) } : {}),
      ...(faixa ? { faixa } : {}),
    });
  });
  if (semFaixa > 0) {
    avisos.push(
      `${String(semFaixa)} ponto(s) com faixa não reconhecida ficam sem faixa (use Altíssima, Alta, Média ou Extra).`,
    );
  }
  if (linhas.length === 0) throw new CsvInvalido('Nenhum ponto encontrado no arquivo.');
  return { linhas, avisos };
}
