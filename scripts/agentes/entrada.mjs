// Leitura da chamada de hook do Claude Code (JSON na entrada padrão).

/** @returns {Promise<any>} o objeto da chamada, ou `undefined` se a entrada não for JSON */
export async function lerEntrada() {
  let texto = '';
  for await (const pedaco of process.stdin) texto += pedaco;
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}
