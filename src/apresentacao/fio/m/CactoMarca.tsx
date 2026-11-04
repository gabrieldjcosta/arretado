/** O cacto da marca ao lado do nome (o `<svg class="cacto-marca">` do mockup): o traço, o anel e o ponto. */
export function CactoMarca() {
  return (
    <svg className="m-cacto-marca" viewBox="854 24 140 136" aria-hidden="true">
      <path
        className="m-cm-l"
        d="M923 151V37M923 111H890A24 24 0 0 1 866 87V65M923 131H956A24 24 0 0 0 980 107V87"
      />
      <circle className="m-cm-anel" cx="980" cy="87" r="30" pathLength="1" />
      <circle className="m-cm-p" cx="980" cy="87" r="13" />
    </svg>
  );
}
