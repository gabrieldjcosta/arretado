import { CORPO_MAXIMO_DO_RESUMO } from '../../../dominios/notas/resumos';

/** Corpo (obrigatório) e título (opcional) de um resumo. */
export function CamposDoResumo({
  corpo,
  titulo,
  setCorpo,
  setTitulo,
}: {
  corpo: string;
  titulo: string;
  setCorpo: (v: string) => void;
  setTitulo: (v: string) => void;
}) {
  return (
    <>
      <label className="resumo-campo">
        Resumo
        <textarea
          value={corpo}
          rows={12}
          maxLength={CORPO_MAXIMO_DO_RESUMO}
          autoFocus
          onChange={(e) => {
            setCorpo(e.target.value);
          }}
        />
      </label>
      <label className="resumo-campo">
        Título (opcional)
        <input
          type="text"
          value={titulo}
          maxLength={500}
          placeholder="Se vazio, usa a primeira linha"
          onChange={(e) => {
            setTitulo(e.target.value);
          }}
        />
      </label>
    </>
  );
}
