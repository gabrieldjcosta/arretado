import { ligarToques, useToquesLigados } from '../toques';

/** Som e vibração mínimos: desligados por padrão e só neste aparelho. */
export function ToquesConta() {
  const ligados = useToquesLigados();
  return (
    <fieldset>
      <legend>Som e vibração</legend>
      <label className="opcao">
        <input
          type="checkbox"
          checked={ligados}
          onChange={(e) => {
            ligarToques(e.target.checked);
          }}
        />
        Um tec ao virar o cartão e uma vibração curta ao pousar
      </label>
      <p className="dica">Vale só neste aparelho e fica quieto em movimento reduzido.</p>
    </fieldset>
  );
}
