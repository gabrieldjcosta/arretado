import type { Modulo, NomeColecao } from '../../../core/modelo';

export const ROTULO_MODULO: Record<Modulo, string> = {
  sistema: 'Conta e preferências',
  plano: 'Plano (concursos e pontos)',
  execucao: 'Dias e sessões',
  recall: 'Recall (erros, cartões e revisões)',
  legislacao: 'Legislação',
  catalogo: 'Catálogo',
  precedentes: 'Precedentes',
  notas: 'Notas',
  inteligencia: 'Inteligência de prova',
  calendario: 'Calendário',
  suporte: 'Relatos de problema',
};

export const ROTULO_COLECAO: Record<NomeColecao, string> = {
  usuarios: 'Usuário',
  aparelhos: 'Aparelhos',
  preferencias: 'Preferências',
  fontes: 'Fontes',
  anexos: 'Anexos',
  tags: 'Tags',
  vinculos: 'Vínculos',
  concursos: 'Concursos',
  fasesPrazos: 'Fases e prazos',
  editais: 'Editais',
  disciplinas: 'Disciplinas',
  pontos: 'Pontos',
  dias: 'Dias',
  sessoes: 'Sessões',
  erros: 'Erros',
  cartoes: 'Cartões',
  revisoes: 'Revisões',
  normas: 'Normas',
  versoesNorma: 'Versões de norma',
  dispositivos: 'Dispositivos',
  textosDispositivo: 'Textos de dispositivo',
  marcacoes: 'Marcações',
  estrelas: 'Estrelas',
  pacotesIncidencia: 'Pacotes de incidência',
  adesoes: 'Adesões',
  precedentes: 'Precedentes',
  notas: 'Notas',
  achados: 'Achados',
  eventosCalendario: 'Eventos de calendário',
  relatos: 'Relatos de problema',
  logsImportacao: 'Importações',
  snapshots: 'Pontos de restauração',
  espacos: 'Espaços separados',
};

export const MODOS = [
  {
    modo: 2,
    nome: 'Adicionar somente novos',
    descricao: 'Cria o que não existe aqui; não mexe no que já existe.',
  },
  {
    modo: 3,
    nome: 'Atualizar identificados',
    descricao: 'Atualiza o que já existe aqui quando o pacote é mais recente; não cria nada.',
  },
  {
    modo: 4,
    nome: 'Mesclar',
    descricao:
      'Cria o novo, atualiza o mais recente e mostra para você escolher quando o mesmo item mudou nos dois lados.',
  },
  {
    modo: 5,
    nome: 'Substituir módulos',
    descricao: 'Os módulos escolhidos ficam iguais aos do pacote; o que não está nele é excluído.',
  },
  {
    modo: 6,
    nome: 'Restaurar integral',
    descricao: 'Tudo fica exatamente como no pacote. Use em aparelho novo ou para recuperar dados.',
  },
  {
    modo: 7,
    nome: 'Importar para espaço separado',
    descricao: 'Guarda o pacote à parte, sem tocar nos seus dados. Depois você confere e mescla.',
  },
] as const;

export type ModoTela = (typeof MODOS)[number]['modo'];

export function formatarInstante(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Entrega um arquivo para o usuário salvar. */
export function baixar(bytes: Uint8Array, nome: string): void {
  const url = URL.createObjectURL(
    new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}
