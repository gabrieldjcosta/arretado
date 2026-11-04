/** O desfoque que dá o brilho dos fios (o `<filter id="desfoque">` do mockup; o id leva o prefixo `m-`). */
export function FiltrosM() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="m-desfoque" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
    </svg>
  );
}
