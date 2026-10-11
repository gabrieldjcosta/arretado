// Verificação do acervo gerado (roda no CI): esquema do índice e de cada item, hash, tamanho,
// identidade, versão e árvore. Puro: recebe o índice e os arquivos já lidos.
import { IndiceDoAcervo, ItemDoAcervo } from '../../src/dominios/acervo/esquemas';
import { hashDoItem } from '../../src/dominios/acervo/hash';
import { arvoreValida } from './construir';

/** Teto por item (bytes): o app baixa o item inteiro de uma vez. */
export const TAMANHO_MAXIMO_DO_ITEM = 25_000_000;

export interface ProblemaDoAcervo {
  id: string;
  problema: string;
}

/**
 * @param indiceJson texto de `indice.json`
 * @param arquivos bytes de cada `<id>.json`, pelo nome do arquivo
 */
export async function verificarAcervo(
  indiceJson: string,
  arquivos: ReadonlyMap<string, Uint8Array>,
): Promise<ProblemaDoAcervo[]> {
  const problemas: ProblemaDoAcervo[] = [];
  let bruto: unknown;
  try {
    bruto = JSON.parse(indiceJson);
  } catch {
    return [{ id: 'indice', problema: 'indice.json não é JSON' }];
  }
  const indice = IndiceDoAcervo.safeParse(bruto);
  if (!indice.success)
    return [{ id: 'indice', problema: `esquema do índice: ${indice.error.message}` }];
  const ids = new Set<string>();
  for (const entrada of indice.data.itens) {
    const falha = (problema: string) => problemas.push({ id: entrada.id, problema });
    if (ids.has(entrada.id)) falha('id repetido no índice');
    ids.add(entrada.id);
    const bytes = arquivos.get(`${entrada.id}.json`);
    if (!bytes) {
      falha('arquivo do item ausente');
      continue;
    }
    if (bytes.length !== entrada.tamanho)
      falha(`tamanho ${String(bytes.length)} ≠ ${String(entrada.tamanho)} do índice`);
    if (bytes.length > TAMANHO_MAXIMO_DO_ITEM) falha('item grande demais');
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      falha('arquivo não é JSON em UTF-8');
      continue;
    }
    const item = ItemDoAcervo.safeParse(json);
    if (!item.success) {
      falha(`esquema do item: ${item.error.message.slice(0, 300)}`);
      continue;
    }
    if (item.data.id !== entrada.id) falha('id do arquivo ≠ id do índice');
    if (item.data.versao !== entrada.versao) falha('versão do arquivo ≠ versão do índice');
    if ((await hashDoItem(item.data)) !== entrada.hash) falha('hash do item ≠ hash do índice');
    const erro = arvoreValida(item.data.nos);
    if (erro) falha(`árvore inválida: ${erro}`);
  }
  for (const nome of arquivos.keys()) {
    const id = nome.replace(/\.json$/, '');
    if (!ids.has(id)) problemas.push({ id, problema: 'arquivo fora do índice' });
  }
  return problemas;
}
