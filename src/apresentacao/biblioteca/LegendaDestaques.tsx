import { CATEGORIAS_DESTAQUE } from '../../dominios/legislacao/destaques';
import { NOME_CURTO_DESTAQUE, NOME_DESTAQUE, TRACO_DESTAQUE } from './rotulos';

/**
 * Legenda do destaque automático (9.8): cada categoria escrita com o próprio traço. Em Conta ›
 * Aparência, o traço também por extenso (o destaque não depende só da cor). No leitor (P4) é uma
 * linha só, com o nome curto (o nome inteiro fica na dica do sublinhado).
 */
export function LegendaDestaques({
  comTraco = false,
  curta = false,
}: {
  comTraco?: boolean;
  curta?: boolean;
}) {
  return (
    <ul
      className={curta ? 'legenda-destaques curta' : 'legenda-destaques'}
      aria-label="Legenda dos destaques"
    >
      {CATEGORIAS_DESTAQUE.map((categoria) => (
        <li key={categoria}>
          <span
            className={`destaque destaque-${categoria}`}
            title={curta ? NOME_DESTAQUE[categoria] : undefined}
          >
            {curta ? NOME_CURTO_DESTAQUE[categoria] : NOME_DESTAQUE[categoria]}
          </span>
          {comTraco && <span className="dica"> ({TRACO_DESTAQUE[categoria]})</span>}
        </li>
      ))}
    </ul>
  );
}
