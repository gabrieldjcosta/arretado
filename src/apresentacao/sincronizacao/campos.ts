// Campos de um registro em palavras (Conta › Conflitos; revisão da Marca, 26/10/2026): a pessoa
// lê "Título" e "nenhum", não `titulo` e `[]`. O mapa cobre os nomes mais comuns; o resto vira
// camelCase em palavras ("modulosDesabilitados" → "Modulos desabilitados").

const ROTULOS: Record<string, string> = {
  titulo: 'Título',
  nome: 'Nome',
  tipo: 'Tipo',
  texto: 'Texto',
  fraseCorreta: 'Frase correta',
  frase: 'Frase',
  nota: 'Nota',
  notas: 'Notas',
  cor: 'Cor',
  estado: 'Estado',
  status: 'Situação',
  data: 'Data',
  dia: 'Dia',
  inicio: 'Início',
  fim: 'Fim',
  pausas: 'Pausas',
  duracaoMinutos: 'Duração (minutos)',
  minutos: 'Minutos',
  tema: 'Tema',
  fonteLeitura: 'Letra da leitura',
  tamanhoFonte: 'Tamanho da letra',
  reguaDeLeitura: 'Régua de leitura',
  cotaDiaria: 'Cota diária',
  modulosDesabilitados: 'Módulos desligados',
  mostrarRedacoesAnteriores: 'Mostrar redações anteriores',
  destacarCondicionantesEPrazos: 'Destacar condicionantes e prazos',
  lenteDoFoco: 'Lente do foco',
  espiadaDosVizinhos: 'Espiada dos vizinhos',
  excluidoEm: 'Excluído em',
  plataforma: 'Plataforma',
  materia: 'Matéria',
  materiaId: 'Matéria',
  codigo: 'Código',
  faixa: 'Faixa',
  prioridade: 'Prioridade',
  pontoId: 'Ponto',
  normaId: 'Norma',
  dispositivoId: 'Dispositivo',
  versaoId: 'Versão da norma',
  fonteId: 'Fonte',
  erroId: 'Erro',
  cartaoId: 'Cartão',
  sessaoId: 'Sessão',
  cicloId: 'Ciclo',
  concursoId: 'Concurso',
  ancora: 'Trecho marcado',
  observacao: 'Observação',
  tags: 'Etiquetas',
  perfil: 'Perfil',
  certeza: 'Certeza',
  resposta: 'Resposta',
  proximaRevisao: 'Próxima Revisão',
  ultimaSincronizacao: 'Última sincronização',
  somenteLeitura: 'Só leitura',
  arquivado: 'Arquivado',
  suspenso: 'Suspenso',
  ordem: 'Ordem',
  url: 'Endereço',
};

/** "fraseCorreta" → "Frase correta"; nomes conhecidos vêm do mapa. */
export function rotuloDoCampo(nome: string): string {
  const conhecido = ROTULOS[nome];
  if (conhecido) return conhecido;
  const palavras = nome
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
  return palavras.charAt(0).toUpperCase() + palavras.slice(1);
}

/** Valor em palavras: `[]` é "nenhum", `null` é "vazio", `true` é "sim"; objetos e listas em prosa curta. */
export function valorEmTexto(v: unknown): string {
  if (v === undefined) return 'sem valor';
  if (v === null) return 'vazio';
  if (typeof v === 'string') return v.trim() === '' ? 'vazio' : v;
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return 'nenhum';
    if (v.every((x) => typeof x === 'string' || typeof x === 'number'))
      return v.map((x) => String(x)).join(', ');
    return v.length === 1 ? '1 item' : `${String(v.length)} itens`;
  }
  if (typeof v === 'object') {
    const chaves = Object.keys(v);
    if (chaves.length === 0) return 'nada';
    return chaves
      .map((k) => `${rotuloDoCampo(k)}: ${valorEmTexto((v as Record<string, unknown>)[k])}`)
      .join('; ');
  }
  return typeof v === 'bigint' || typeof v === 'symbol' ? v.toString() : 'valor';
}
