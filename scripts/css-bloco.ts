/** O texto entre as chaves da regra que começa por `seletor` (sem os comentários), em uma linha só. */
export function bloco(origem: string, seletor: string): string {
  const semComentarios = origem.replace(/\/\*[\s\S]*?\*\//g, '');
  const inicio = semComentarios.search(
    new RegExp(`(^|\\})\\s*${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`),
  );
  if (inicio < 0) throw new Error(`regra não achada: ${seletor}`);
  const abre = semComentarios.indexOf('{', inicio);
  let fundo = 1;
  let i = abre + 1;
  for (; i < semComentarios.length && fundo > 0; i += 1) {
    if (semComentarios[i] === '{') fundo += 1;
    if (semComentarios[i] === '}') fundo -= 1;
  }
  return semComentarios
    .slice(abre + 1, i - 1)
    .replace(/\s+/g, ' ')
    .trim();
}
