// As linhas de "A lei mudou" (AP-05), uma por norma, para o Hoje e para a linha de retorno do Agora. Duas fontes: o
// texto mudou onde a pessoa guardou algo (leva à norma, onde estão o antes e o agora) e o acervo ganhou versão nova
// de uma norma que ela tem (leva ao acervo, onde a prévia e o "Atualizar" moram). O texto não cobra nada.
import type { itensComVersaoNova } from '../../dominios/acervo/atualizacao';
import type { AvisoDeLeiMudou } from '../../dominios/acervo/pendencias';

export interface LinhaDaLei {
  chave: string;
  texto: string;
  para: string;
  rotulo: string;
  aria: string;
}

export function linhasDaLeiQueMudou(
  avisos: readonly AvisoDeLeiMudou[],
  novas: Awaited<ReturnType<typeof itensComVersaoNova>>,
): LinhaDaLei[] {
  const linhas: LinhaDaLei[] = [];
  const comAviso = new Set<string>();
  for (const a of avisos) {
    comAviso.add(a.normaId);
    linhas.push({
      chave: `mudou-${a.normaId}`,
      texto: `${a.titulo}: o texto mudou em ${String(a.quantos)} ${
        a.quantos === 1 ? 'dispositivo' : 'dispositivos'
      } em que você guardou algo.`,
      para: `/biblioteca/normas/${a.normaId}`,
      rotulo: 'Ver o que mudou',
      aria: `Ver o que mudou em ${a.titulo}`,
    });
  }
  for (const n of novas) {
    if (comAviso.has(n.normaId)) continue;
    linhas.push({
      chave: `nova-${n.entrada.id}`,
      texto: `${n.entrada.titulo}: o acervo tem texto novo.`,
      para: `/biblioteca/acervo?tipo=norma&q=${encodeURIComponent(n.entrada.titulo)}`,
      rotulo: 'Ver a atualização',
      aria: `Ver a atualização de ${n.entrada.titulo}`,
    });
  }
  return linhas;
}
