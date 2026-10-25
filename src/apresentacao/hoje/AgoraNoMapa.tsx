// "Agora no mapa" no Hoje (AP-04): abaixo da folha, o próximo trecho que mais cai na norma que a
// pessoa está lendo, com a faixa e os minutos, e o toque que abre o Leitor nele. Depois do lote de
// Cartões por tempo, só aparece quando o trecho cabe no tempo que sobra. Nada aqui cobra: sem arquivo
// de incidência, sem rede na primeira vez ou com tudo o que cai já coberto, a linha não existe.
import { useCallback } from 'react';
import { Link } from 'react-router';
import type { Repositorio } from '../../core/persistencia';
import { NOME_DA_CLASSE } from '../../dominios/legislacao/mapa-da-norma';
import { trechoParaLer } from '../biblioteca/mapa/cobertura-da-norma';
import { Icone } from '../componentes/Icone';
import { useDados } from '../dados/contexto';
import { useFonteIncidencia } from '../dados/fonteIncidenciaContexto';

export function AgoraNoMapa({
  normaId,
  sobra,
}: {
  normaId: string;
  /** Minutos que sobram depois do lote de Cartões: o trecho só entra se couber neles. */
  sobra?: number;
}) {
  const fonte = useFonteIncidencia();
  const carregar = useCallback(
    (repo: Repositorio) => trechoParaLer(repo, fonte, normaId).catch(() => undefined),
    [fonte, normaId],
  );
  const { dados: trecho } = useDados(carregar);
  if (!trecho || (sobra !== undefined && trecho.minutos > sobra)) return null;
  return (
    <p className="agora-no-mapa dica">
      <Icone nome="mapa" />
      <span>
        {sobra === undefined ? 'Agora no mapa' : 'Depois dos cartões, no mapa'}:{' '}
        {NOME_DA_CLASSE[trecho.classe]}, uns {String(trecho.minutos)} min.
      </span>
      <Link
        to={`/biblioteca/normas/${normaId}?ir=${trecho.endereco}`}
        className="botao botao-texto"
      >
        Ler {trecho.rotulo}
      </Link>
    </p>
  );
}
