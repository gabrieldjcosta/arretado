// Medição da adesão da CF/88 (pacote AL, F4-A): `npx vitest run --project carga scripts/adesao-cf.carga.ts`.
// Mede no fake-indexeddb (Node): o número absoluto não é o do navegador, mas a comparação antes e
// depois do log por referência (uma entrada `acervo-adesao` no lugar de uma por registro) vale.
import { readFile } from 'node:fs/promises';
import { aderirAoItem } from '../src/dominios/acervo/adesao';
import { ItemDoAcervo } from '../src/dominios/acervo/esquemas';
import { FonteEmMemoria } from '../src/dominios/acervo/fonte-em-memoria';
import { Repositorio } from '../src/core/persistencia';

const nomeBanco = () => `carga-cf-${Math.random().toString(36).slice(2)}`;

describe('adesão da CF/88', () => {
  it('mede tempo, entradas e bytes do log', async () => {
    const bruto: unknown = JSON.parse(
      await readFile('public/acervo/constituicao-1988.json', 'utf-8'),
    );
    const item = ItemDoAcervo.parse(bruto);
    const fonte = await FonteEmMemoria.criar([{ item }]);
    const [entrada] = (await fonte.listar()).itens;
    if (!entrada) throw new Error('sem entrada');
    const tempos: number[] = [];
    let entradas = 0;
    let bytes = 0;
    for (let i = 0; i < 3; i++) {
      const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
      const antes = await repo.db.alteracoes.count();
      const t = performance.now();
      await aderirAoItem(repo, fonte, entrada);
      tempos.push(performance.now() - t);
      const log = (await repo.db.alteracoes.toArray()).slice(antes);
      entradas = log.length;
      bytes = log.reduce((s, a) => s + JSON.stringify(a).length, 0);
      repo.fechar();
    }
    tempos.sort((a, b) => a - b);
    console.log(
      `CF/88: ${String(item.nos.length)} nós; adesão ${tempos.map((t) => t.toFixed(0)).join('/')} ms (mediana ${String(Math.round(tempos[1] ?? 0))} ms); log ${String(entradas)} entradas, ${String(Math.round(bytes / 1024))} KiB`,
    );
    expect(entradas).toBeGreaterThan(0);
  });
});
