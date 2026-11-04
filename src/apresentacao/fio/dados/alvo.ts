// O que a porteira pergunta: os artigos que a pessoa leu na matéria. O app só relê o banco quando algo
// grava nele, e o "Já li" grava no aparelho (o Mapa), então o "lido" da entrada fica um passo atrás:
// aqui ele se soma ao que fechou no Ler desta etapa.
import type { EntradaDoFio, EstadoDoFio } from '../../../dominios/fio';
import type { AlvoDaPorteira } from '../passos';

/** Na norma da matéria com mais artigos lidos; `undefined` se a pessoa ainda não leu nenhum. */
export function alvoDaPorteira(
  entrada: EntradaDoFio,
  estado: EstadoDoFio,
  materiaId: string,
): AlvoDaPorteira | undefined {
  const materia = entrada.materias.find((m) => m.id === materiaId);
  if (!materia) return undefined;

  const lidosNaEtapa = new Map<string, Set<string>>();
  const etapa = estado.etapa;
  etapa?.passos.forEach((passo, i) => {
    const como = etapa.fechados[i]?.como;
    if (passo.tipo !== 'ler' || !('normaId' in passo)) return;
    if (como !== 'feito' && como !== 'ja_feito') return;
    const enderecos = lidosNaEtapa.get(passo.normaId) ?? new Set<string>();
    passo.artigos.forEach((a) => enderecos.add(a.endereco));
    lidosNaEtapa.set(passo.normaId, enderecos);
  });

  let melhor: AlvoDaPorteira | undefined;
  for (const norma of materia.normas) {
    const daEtapa = lidosNaEtapa.get(norma.id);
    const artigos = norma.artigos
      .filter((a) => a.lido || daEtapa?.has(a.endereco) === true)
      .map((a) => ({ endereco: a.endereco, rotulo: a.rotulo }));
    if (artigos.length > (melhor?.artigos.length ?? 0)) melhor = { normaId: norma.id, artigos };
  }
  return melhor;
}
