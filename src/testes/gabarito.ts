// Comparação do rascunho do estruturador com o gabarito da 7.3 (`corpus/normas/*.gabarito.json`),
// para os testes de src/ e de scripts/. Só a árvore estrutural (8.2); a 8.9 traz a métrica completa.
import { textoDe } from '../dominios/legislacao/linhas';
import type { NoRascunho } from '../dominios/legislacao/rascunho';

export interface NoDoGabarito {
  tipo: string;
  rotulo: string;
  nome: string;
  primeiroArtigo: string;
}

export interface Gabarito {
  estrutura: (NoDoGabarito & { notas?: string[] })[];
  dispositivos: { endereco: string; status: string }[];
}

const ESTRUTURAIS = new Set(['parte', 'livro', 'titulo', 'capitulo', 'secao', 'subsecao']);

/** Nós estruturais em ordem, com o primeiro artigo que aparece depois de cada um. */
export function estruturaDe(nos: readonly NoRascunho[]): NoDoGabarito[] {
  const saida: NoDoGabarito[] = [];
  const esperando: NoDoGabarito[] = [];
  const visitar = (no: NoRascunho) => {
    if (ESTRUTURAIS.has(no.tipo)) {
      const nome = no.filhos.find((f) => f.tipo === 'nome');
      const item = {
        tipo: no.tipo,
        rotulo: no.rotulo ?? '',
        nome: nome ? textoDe(nome.trechos) : '',
        primeiroArtigo: '',
      };
      saida.push(item);
      esperando.push(item);
    }
    if (no.tipo === 'artigo') for (const e of esperando.splice(0)) e.primeiroArtigo = no.endereco;
    no.filhos.forEach(visitar);
  };
  nos.forEach(visitar);
  return saida;
}

/**
 * Onde o estruturador está certo e o gabarito não (examinado na página). Chave: id e rótulo + nome
 * do gabarito; valor: o nome certo. A 8.5 (notas) acerta o gabarito e esvazia esta lista.
 */
const NOME_CORRIGIDO: Record<string, Record<string, string>> = {
  // "Regulamento" solto depois do nome é link de nota (regra 7), como no fim do texto.
  cf: {
    'CAPÍTULO III DA POLÍTICA AGRÍCOLA E FUNDIÁRIA E DA REFORMA AGRÁRIA Regulamento':
      'DA POLÍTICA AGRÍCOLA E FUNDIÁRIA E DA REFORMA AGRÁRIA',
  },
};

/**
 * A árvore estrutural do gabarito no estágio atual do estruturador:
 * - até a 8.4, sem bloco com numeração própria (nem o nó do ADCT nem o prefixo `adct.`/`dt.`);
 * - até a 8.6, o artigo revogado todo tachado é descarte (`redacao_anterior`), não nó: o primeiro
 *   artigo do nó passa a ser o primeiro não revogado a partir do que o gabarito aponta.
 */
export function estruturaEsperada(id: string, gabarito: Gabarito): NoDoGabarito[] {
  const artigos = gabarito.dispositivos.filter((d) => /^(?:\w+\.)?art\d+[A-Z]*$/.test(d.endereco));
  const indice = new Map(artigos.map((d, k) => [d.endereco, k]));
  const naoRevogado = (endereco: string) => {
    let k = indice.get(endereco) ?? -1;
    while (artigos[k]?.status === 'revogado') k++;
    return artigos[k]?.endereco ?? endereco;
  };
  return gabarito.estrutura
    .filter((no) => no.tipo !== 'bloco')
    .map(({ tipo, rotulo, nome, primeiroArtigo }) => ({
      tipo,
      rotulo,
      nome: NOME_CORRIGIDO[id]?.[`${rotulo} ${nome}`] ?? nome,
      primeiroArtigo: naoRevogado(primeiroArtigo).replace(/^(?:adct|dt)\./, ''),
    }));
}
