import { useEstadoDeArmazenamento, useUltimoBackup } from '../../dados/useSaude';
import { textoDoBackup, TEXTOS } from './textos-backup';

/** Resumo no alto de Conta › Dados: quando foi o último backup e se o aparelho protege os dados. */
export function Salvaguarda() {
  const { dataUltimoBackup } = useUltimoBackup();
  const armazenamento = useEstadoDeArmazenamento();
  if (dataUltimoBackup === undefined) return null;
  const irParaExportar = () => {
    const alvo = document.getElementById('t-exportar');
    if (!alvo) return;
    alvo.setAttribute('tabindex', '-1');
    alvo.scrollIntoView({ block: 'start' });
    alvo.focus();
  };
  return (
    <section className="cartao-bloco" aria-label={TEXTOS.titulo}>
      <p>{textoDoBackup(dataUltimoBackup)}</p>
      {armazenamento && <p className="dica">{TEXTOS[armazenamento]}</p>}
      <button type="button" onClick={irParaExportar}>
        {TEXTOS.acao}
      </button>
    </section>
  );
}
