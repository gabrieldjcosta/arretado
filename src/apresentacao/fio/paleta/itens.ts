import { consultaDeBusca } from '../../../dominios/legislacao/busca';

/** Um destino da busca ⌘K: onde ele mora (grupo), o que se lê e para onde leva. */
export interface ItemDaPaleta {
  id: string;
  grupo: 'Lugares' | 'Fazer' | 'Leis';
  texto: string;
  para: string;
  /** Palavras que também acham o item (sem acento, minúsculas). */
  chaves?: string;
}

export const ITENS_FIXOS: readonly ItemDaPaleta[] = [
  { id: 'agora', grupo: 'Lugares', texto: 'Agora', para: '/', chaves: 'puxar fio estudar' },
  {
    id: 'destino',
    grupo: 'Lugares',
    texto: 'Destino',
    para: '/destino',
    chaves: 'mapa trilha prova',
  },
  { id: 'varal', grupo: 'Lugares', texto: 'Varal', para: '/varal', chaves: 'guardado biblioteca' },
  {
    id: 'erro',
    grupo: 'Fazer',
    texto: 'Registrar um erro',
    para: '/recall/registrar',
    chaves: 'frase correta',
  },
  { id: 'comecar', grupo: 'Fazer', texto: 'Começar', para: '/comecar', chaves: 'sessao' },
  {
    id: 'conta',
    grupo: 'Fazer',
    texto: 'Conta e ajustes',
    para: '/conta',
    chaves: 'backup aparencia',
  },
  {
    id: 'orientacoes',
    grupo: 'Fazer',
    texto: 'Orientações',
    para: '/orientacoes',
    chaves: 'ajuda',
  },
];

/** Os itens que casam com a consulta (acento e caixa não contam), na ordem recebida; vazia = todos. */
export function filtrarItens(itens: readonly ItemDaPaleta[], consulta: string): ItemDaPaleta[] {
  const alvo = consultaDeBusca(consulta);
  if (alvo === '') return [...itens];
  return itens.filter((i) => consultaDeBusca(`${i.texto} ${i.chaves ?? ''}`).includes(alvo));
}
