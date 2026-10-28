// C6: a data da prova no Hoje, só quando a pessoa a informou e ela ainda não passou. Uma linha quieta.
import { diferencaEmDias } from '../../core/datas';
import { dataDaProvaInformada } from '../../dominios/recall/prova';
import { hoje as hojeDe } from '../../dominios/recall/servico';
import { fraseDaProva } from './frase-da-prova';
import { useDados, useRepositorio } from '../dados/contexto';

export function DiasParaAProva() {
  const repo = useRepositorio();
  const { dados } = useDados(dataDaProvaInformada);
  if (dados === undefined) return null;
  const frase = fraseDaProva(diferencaEmDias(hojeDe(repo), dados), dados);
  return frase ? <p className="dica dias-para-a-prova">{frase}</p> : null;
}
