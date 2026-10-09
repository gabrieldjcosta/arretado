// Remissões (11.9) sobre o corpus: fração das internas resolvidas na CF e na LEP.
import { describe, expect, it } from 'vitest';
import { sanitizarHtml } from '../../core/seguranca/sanitizador';
import { resolverEndereco } from './busca';
import { estruturar } from './estruturador';
import { emOrdemDeLeitura } from './ordem';
import { detectarRemissoes } from './remissoes';

const HTML = import.meta.glob<string>('../../../corpus/normas/*.colado.html', {
  query: '?raw',
  import: 'default',
  eager: false,
});

async function medir(id: string) {
  const carregar = HTML[`../../../corpus/normas/${id}.colado.html`];
  if (!carregar) throw new Error(id);
  const { blocos } = sanitizarHtml(await carregar());
  const nos = emOrdemDeLeitura(estruturar(blocos).nos);
  const existentes = new Set(nos.map(({ no }) => no.endereco));
  let internas = 0;
  let resolvidas = 0;
  let externas = 0;
  for (const { no } of nos) {
    const texto = no.trechos.map((t) => t.texto).join('');
    for (const r of detectarRemissoes(texto, no.endereco)) {
      if (r.tipo === 'externa') {
        externas++;
        continue;
      }
      internas++;
      const r2 = resolverEndereco(r.enderecos, (e) => existentes.has(e));
      if (r2 && r2.faltou === undefined) resolvidas++;
    }
  }
  return { internas, resolvidas, externas };
}

describe('remissões no corpus', () => {
  for (const id of ['cf', 'lep']) {
    it(id, async () => {
      const m = await medir(id);
      // Linha de base de 09/10/2026: CF 1431 de 1458 (98,1%); LEP 107 de 115 (93,0%). O resto é
      // citação a dispositivo que a própria norma não tem (texto desatualizado) ou "do mesmo artigo".
      expect(m.resolvidas / m.internas).toBeGreaterThanOrEqual(id === 'cf' ? 0.97 : 0.9);
    });
  }
});
