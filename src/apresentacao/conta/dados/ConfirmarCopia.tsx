import { Link } from 'react-router';
import { podeApagarComCopia } from './recomecar';

/** Sem cópia registrada nem exportação confirmada, o texto manda exportar (regra em `podeApagarComCopia`). */
export function ConfirmarCopia({
  ultimaCopia,
  exportei,
  aoMudar,
}: {
  ultimaCopia: string | null;
  exportei: boolean;
  aoMudar: (exportei: boolean) => void;
}) {
  return (
    <>
      {!ultimaCopia && (
        <label className="opcao">
          <input
            type="checkbox"
            checked={exportei}
            onChange={(e) => {
              aoMudar(e.target.checked);
            }}
          />
          Já exportei os meus dados e guardei o arquivo.
        </label>
      )}
      {!podeApagarComCopia(ultimaCopia, exportei) && (
        <p className="dica">
          Antes de apagar, <Link to="/conta/dados">exporte uma cópia</Link>.
        </p>
      )}
    </>
  );
}
