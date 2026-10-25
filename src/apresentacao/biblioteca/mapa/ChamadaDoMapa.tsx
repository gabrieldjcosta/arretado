import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Norma } from '../../../core/modelo';
import { Icone } from '../../componentes/Icone';
import { useFonteIncidencia } from '../../dados/fonteIncidenciaContexto';

/**
 * A chamada do Mapa da norma sob a barra do Leitor (AP-04): só na norma do acervo que tem arquivo de
 * incidência num recorte publicado. Enquanto o índice não chega, ou quando a norma não está nele,
 * nada aparece: o Leitor não espera por isto.
 */
export function ChamadaDoMapa({ norma }: { norma: Norma }) {
  const fonte = useFonteIncidencia();
  const acervoId = norma.origemAcervo?.id;
  const [temMapa, setTemMapa] = useState(false);
  useEffect(() => {
    if (acervoId === undefined) return;
    let ativo = true;
    fonte.recorteDaNorma(acervoId).then(
      (recorte) => {
        if (ativo) setTemMapa(recorte !== undefined);
      },
      () => undefined,
    );
    return () => {
      ativo = false;
    };
  }, [fonte, acervoId]);
  if (!temMapa) return null;
  return (
    <p className="chamada-do-mapa">
      <Link to={`/biblioteca/normas/${norma.id}/mapa`} className="botao botao-texto na-margem">
        <Icone nome="mapa" />
        Mapa da norma
      </Link>
      <span className="dica">o que mais cai e por onde começar</span>
    </p>
  );
}
