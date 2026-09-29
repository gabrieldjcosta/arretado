import type { TipoDispositivo } from '../../core/modelo';
import type { MotivoDescarte } from '../../dominios/legislacao/rascunho';

/** Singular e plural de cada tipo de nó, para o sumário da importação (9.5). */
const TIPO: Record<TipoDispositivo, readonly [string, string]> = {
  parte: ['Parte', 'Partes'],
  livro: ['Livro', 'Livros'],
  titulo: ['Título', 'Títulos'],
  capitulo: ['Capítulo', 'Capítulos'],
  secao: ['Seção', 'Seções'],
  subsecao: ['Subseção', 'Subseções'],
  bloco: ['Bloco com numeração própria', 'Blocos com numeração própria'],
  preambulo: ['Preâmbulo', 'Preâmbulos'],
  ementa: ['Ementa', 'Ementas'],
  artigo: ['Artigo', 'Artigos'],
  nome: ['Rubrica', 'Rubricas'],
  caput: ['Caput', 'Caputs'],
  paragrafo: ['Parágrafo', 'Parágrafos'],
  inciso: ['Inciso', 'Incisos'],
  alinea: ['Alínea', 'Alíneas'],
  item: ['Item', 'Itens'],
  anexo: ['Anexo', 'Anexos'],
};

export function rotuloTipo(tipo: TipoDispositivo, quantidade: number): string {
  return TIPO[tipo][quantidade === 1 ? 0 : 1];
}

/** "4 linhas do cabeçalho do portal", "85 linhas tachadas (redação anterior)". */
export function fraseDescarte(motivo: MotivoDescarte, linhas: number): string {
  const n = `${linhas.toLocaleString('pt-BR')} ${linhas === 1 ? 'linha' : 'linhas'}`;
  switch (motivo) {
    case 'cabecalho':
      return `${n} do cabeçalho do portal`;
    case 'fecho':
      return `${n} do fecho (local, data e assinaturas)`;
    case 'sobra':
      return `${n} sem lugar na norma`;
    case 'redacao_anterior':
      return `${n} ${linhas === 1 ? 'tachada' : 'tachadas'} (redação anterior)`;
  }
}
