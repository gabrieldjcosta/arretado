// As remissões que a norma aberta resolve (F2, 11.9): o detector puro acha as citações no texto do
// dispositivo (`detectarRemissoes`); aqui só ficam as internas cujo endereço existe de verdade na
// norma (o que não existe é texto comum, não botão). O resultado é guardado por texto: o mesmo
// objeto enquanto o texto é o mesmo, para a partição não ser refeita a cada desenho.
import type { TextoDeDispositivo } from '../../core/modelo';
import { resolverEndereco } from '../../dominios/legislacao/busca';
import { detectarRemissoes } from '../../dominios/legislacao/remissoes';
import { textoParaDestacar, type RemissaoNoTexto } from './destacar';

type Trechos = TextoDeDispositivo['trechos'];

export type ResolvedorDeRemissoes = (
  trechos: Trechos,
  enderecoAtual: string,
) => readonly RemissaoNoTexto[];

/** `indiceDoEndereco`: o índice do nó com o endereço canônico, se a norma o tem. */
export function criarResolvedorDeRemissoes(
  indiceDoEndereco: (endereco: string) => number | undefined,
): ResolvedorDeRemissoes {
  const guardados = new WeakMap<Trechos, readonly RemissaoNoTexto[]>();
  return (trechos, enderecoAtual) => {
    let lista = guardados.get(trechos);
    if (lista) return lista;
    const resolvidas: RemissaoNoTexto[] = [];
    for (const r of detectarRemissoes(textoParaDestacar(trechos), enderecoAtual)) {
      if (r.tipo !== 'interna') continue;
      const resolvido = resolverEndereco(r.enderecos, (e) => indiceDoEndereco(e) !== undefined);
      // Só o endereço que existe (o ancestral mais próximo seria uma promessa que o texto não fez)
      // e que não é o do próprio dispositivo.
      if (!resolvido || resolvido.faltou !== undefined || resolvido.endereco === enderecoAtual)
        continue;
      const alvo = indiceDoEndereco(resolvido.endereco);
      if (alvo !== undefined) resolvidas.push({ inicio: r.inicio, fim: r.fim, alvo });
    }
    lista = resolvidas.length === 0 ? SEM_REMISSOES : resolvidas;
    guardados.set(trechos, lista);
    return lista;
  };
}

const SEM_REMISSOES: readonly RemissaoNoTexto[] = [];
