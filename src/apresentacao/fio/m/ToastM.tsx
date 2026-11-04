import { esconderAviso, useToast } from './toast';

/** O aviso do quadro: o `#toast` do mockup, com "Desfazer" quando a ação pode voltar atrás. */
export function ToastM() {
  const t = useToast();
  const classe = ['m-toast', t.ligado && 'm-on', t.desfazer && 'm-compacto', t.baixo && 'm-baixo']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classe} role="status">
      {t.texto && <span key={t.id}>{t.texto}</span>}
      {t.desfazer && (
        <button
          type="button"
          onClick={() => {
            esconderAviso();
            t.desfazer?.();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" />
          </svg>
          Desfazer
        </button>
      )}
    </div>
  );
}
