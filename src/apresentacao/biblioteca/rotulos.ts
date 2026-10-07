import type { TipoDispositivo } from '../../core/modelo';
import type { CategoriaDestaque } from '../../dominios/legislacao/destaques';
import type { EstadoDaEstrela } from '../../dominios/legislacao/estrelas';
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

/** "4 linhas do cabeçalho do portal", "6 linhas do fecho (local, data e assinaturas)". */
export function fraseDescarte(motivo: MotivoDescarte, linhas: number): string {
  const n = `${linhas.toLocaleString('pt-BR')} ${linhas === 1 ? 'linha' : 'linhas'}`;
  switch (motivo) {
    case 'cabecalho':
      return `${n} do cabeçalho do portal`;
    case 'fecho':
      return `${n} do fecho (local, data e assinaturas)`;
    case 'sobra':
      return `${n} sem lugar na norma`;
  }
}

/** Nome de cada categoria do destaque automático (9.8), na legenda do leitor e de Conta › Aparência. */
export const NOME_DESTAQUE: Record<CategoriaDestaque, string> = {
  prazo: 'Prazos e tempo',
  condicao: 'Exceções e condições',
  absoluto: 'Termos absolutos',
  pena: 'Penas, quóruns e frações',
};

/** O traço de cada categoria, dito por extenso: o destaque não depende só da cor. */
export const TRACO_DESTAQUE: Record<CategoriaDestaque, string> = {
  prazo: 'sublinhado duplo',
  condicao: 'sublinhado tracejado',
  absoluto: 'sublinhado ondulado',
  pena: 'sublinhado pontilhado',
};

// ── Estrela (11.2) ──

/** "direta", "herdada de Seção I", "exceção: fora da estrela de Seção I" (ou nada, sem estrela). */
export function origemPorExtenso(estado: EstadoDaEstrela, nomeDaOrigem: string): string {
  switch (estado.origem) {
    case 'direta':
      return 'direta';
    case 'herdada':
      return `herdada de ${nomeDaOrigem}`;
    case 'excecao':
      return `exceção: fora da estrela de ${nomeDaOrigem}`;
    default:
      return '';
  }
}

/** O nome acessível: o alvo e a origem; o "pressionado" (`aria-pressed`) diz se acende. */
export function nomeDaEstrela(alvo: string, estado: EstadoDaEstrela, nomeDaOrigem: string): string {
  const origem = origemPorExtenso(estado, nomeDaOrigem);
  return `Estrela: ${alvo || 'dispositivo'}${origem ? ` (${origem})` : ''}`;
}

/** "Art. 5º: estrela herdada de Seção I.", "Art. 5º: sem estrela." (o aviso e o anúncio). */
export function fraseDaEstrela(
  alvo: string,
  estado: EstadoDaEstrela,
  referencia: (id: string) => string,
): string {
  const origem = origemPorExtenso(estado, estado.deId ? referencia(estado.deId) : '');
  const onde = alvo || 'Dispositivo';
  if (estado.origem === 'excecao') return `${onde}: ${origem}.`;
  return `${onde}: ${origem ? `estrela ${origem}` : 'sem estrela'}.`;
}
