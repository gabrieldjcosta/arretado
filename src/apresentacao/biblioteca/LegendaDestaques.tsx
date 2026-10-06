import { CATEGORIAS_DESTAQUE } from '../../dominios/legislacao/destaques';
import { NOME_DESTAQUE, TRACO_DESTAQUE } from './rotulos';

/**
 * Legenda do destaque automático (9.8): cada categoria escrita com o próprio traço. Em Conta ›
 * Aparência, o traço também por extenso (o destaque não depende só da cor).
 */
export function LegendaDestaques({ comTraco = false }: { comTraco?: boolean }) {
  return (
    <ul className="legenda-destaques" aria-label="Legenda dos destaques">
      {CATEGORIAS_DESTAQUE.map((categoria) => (
        <li key={categoria}>
          <span className={`destaque destaque-${categoria}`}>{NOME_DESTAQUE[categoria]}</span>
          {comTraco && <span className="dica"> ({TRACO_DESTAQUE[categoria]})</span>}
        </li>
      ))}
    </ul>
  );
}
