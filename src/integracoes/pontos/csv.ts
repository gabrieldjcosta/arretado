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

/** Divide o CSV em linhas e células (aspas duplas, separador detectado no cabeçalho). */
export function celulas(texto: string): string[][] {
  const semBom = texto.replace(/^\ufeff/, '');
  const primeira = semBom.split(/\r?\n/, 1)[0] ?? '';
  const sep = primeira.includes(';') ? ';' : primeira.includes('\t') ? '\t' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < semBom.length; i++) {
    const c = semBom.charAt(i);
    if (aspas) {
      if (c === '"' && semBom[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') aspas = false;
      else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(atual);
      atual = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && semBom[i + 1] === '\n') i++;
      linha.push(atual);
      linhas.push(linha);
      linha = [];
      atual = '';
    } else atual += c;
  }
  if (atual !== '' || linha.length > 0) {
    linha.push(atual);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''));
}

export function lerCsvPontos(texto: string): LeituraCsv {
  if (texto.length > LIMITE_CSV)
    throw new CsvInvalido('O arquivo é grande demais (limite de 2 MB).');
  const [cabecalho, ...dados] = celulas(texto);
  if (!cabecalho) throw new CsvInvalido('O arquivo está vazio.');
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
  dados.forEach((l, n) => {
    const disciplina = (l[iDisciplina] ?? '').trim();
    const titulo = (l[iTitulo] ?? '').trim();
    if (!disciplina || !titulo) {
      avisos.push(`Linha ${String(n + 2)} ignorada: falta disciplina ou ponto.`);
      return;
    }
    const chave = `${semAcento(disciplina)}|${semAcento(titulo)}`;
    if (vistos.has(chave)) {
      avisos.push(`Linha ${String(n + 2)} ignorada: ponto repetido na mesma disciplina.`);
      return;
    }
    vistos.add(chave);
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
