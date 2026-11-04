/**
 * O nome com o cacto da marca (a forma simples do `geometria.ts`): o ponto do braço direito é o nó da
 * pessoa. No cabeçalho do Arretado novo ele abre a Conta; na Abertura é onde a luz pousa.
 */
export function CactoDoFio({ className = 'fio-cacto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="854 24 140 136" aria-hidden="true" focusable="false">
      <path d="M923 151V37M923 111H890A24 24 0 0 1 866 87V65M923 131H956A24 24 0 0 0 980 107V87" />
      <circle className="fio-cacto-ponto" cx="980" cy="87" r="13" />
    </svg>
  );
}

export function MarcaDoFio() {
  return (
    <>
      <span>arretado</span>
      <CactoDoFio />
    </>
  );
}
