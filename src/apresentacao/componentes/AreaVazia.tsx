interface Props {
  titulo: string;
  pergunta: string;
  mensagem: string;
}

/** Estado vazio universal (§9.1): uma frase e, quando houver, a ação que preenche a tela. */
export function AreaVazia({ titulo, pergunta, mensagem }: Props) {
  return (
    <section aria-labelledby="titulo-area">
      <h1 id="titulo-area" className="text-2xl font-semibold">
        {titulo}
      </h1>
      <p className="text-texto-atenuado">{pergunta}</p>
      <p className="mt-6">{mensagem}</p>
    </section>
  );
}
