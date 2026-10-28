import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Norma } from '../../../core/modelo';
import type { NoDaLeitura } from '../../../dominios/legislacao/leitor';
import {
  concentracao,
  quadradosDoMapa,
  type MapaDeIncidencia,
  type RecorteDeIncidencia,
} from '../../../dominios/legislacao/mapa-da-norma';
import { Icone } from '../../componentes/Icone';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';
import { jaVisitouOMapa } from './visita';

/**
 * Abaixo desta massa (quase o número de questões do recorte que caíram na norma) a chamada não dá
 * números: "2 de 85 artigos concentram 100%" sobre uma questão descreve a amostra, não a norma. Sem
 * a massa, volta o convite de sempre. O Mapa mostra tudo, com o recorte e as questões lidas.
 */
const MASSA_MINIMA = 10;

/**
 * A chamada do Mapa da norma sob a barra do Leitor (AP-04): só na norma do acervo que tem arquivo de
 * incidência num recorte publicado. Enquanto o índice não chega, ou quando a norma não está nele,
 * nada aparece: o Leitor não espera por isto.
 */
export function ChamadaDoMapa({
  norma,
  nos,
}: {
  norma: Norma;
  /** Os dispositivos abertos: com eles a chamada diz quantos artigos concentram o que cai (U1). */
  nos?: readonly NoDaLeitura[];
}) {
  const fonte = useFonteIncidencia();
  const acervoId = norma.origemAcervo?.id;
  const [temMapa, setTemMapa] = useState(false);
  const [mapa, setMapa] = useState<MapaDeIncidencia>();
  const [recorte, setRecorte] = useState<RecorteDeIncidencia>();
  useEffect(() => {
    if (acervoId === undefined) return;
    let ativo = true;
    fonte.mapaDaNorma(acervoId).then(
      (carregado) => {
        if (!ativo) return;
        setTemMapa(carregado !== undefined);
        setMapa(carregado?.dados);
        setRecorte(carregado?.recorte);
      },
      () => {
        // O mapa não veio (rede, formato): a chamada cai para o índice, que é leve, e fica sem números.
        fonte.recorteDaNorma(acervoId).then(
          (recorte) => {
            if (ativo) setTemMapa(recorte !== undefined);
          },
          () => undefined,
        );
      },
    );
    return () => {
      ativo = false;
    };
  }, [fonte, acervoId]);
  const conc = useMemo(
    () =>
      mapa === undefined || nos === undefined
        ? undefined
        : concentracao(quadradosDoMapa(nos, mapa)),
    [mapa, nos],
  );
  if (!temMapa) return null;
  const comNumeros =
    conc !== undefined &&
    recorte !== undefined &&
    conc.total > 0 &&
    conc.massaTotal >= MASSA_MINIMA;
  return (
    <p className="chamada-do-mapa">
      <Link to={`/biblioteca/normas/${norma.id}/mapa`} className="botao botao-texto na-margem">
        <Icone nome="mapa" />
        Mapa da norma
      </Link>
      {comNumeros && (
        <span className="dica">
          {conc.artigos.toLocaleString('pt-BR')} de {conc.total.toLocaleString('pt-BR')} artigos
          concentram {String(Math.round(conc.parcela * 100))}% do que caiu em {recorte.titulo}
        </span>
      )}
      {!comNumeros && !jaVisitouOMapa() && (
        <span className="dica">o que mais cai e por onde começar</span>
      )}
    </p>
  );
}
