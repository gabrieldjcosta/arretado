// Revisao.certeza (AP-02): campo opcional, sem subir a versão do esquema nem a do formato. O pacote
// sem o campo (todo o gerado antes do AP-02) segue restaurável; o app anterior recusaria o pacote que
// o traz, como diz docs/formato-pacote.md ("Campos opcionais novos sem subir a versão").
import { strToU8, unzipSync, zipSync } from 'fflate';
import { Repositorio } from '../persistencia';
import { deBytes, sha256 } from './bytes';
import { exportarPacote, hashDoConjunto, serializarLista } from './exportar';
import { PacoteRecusado, type Manifesto } from './formato';
import { aplicar, planejar } from './importar';
import { lerPacote } from './ler';

const nomeBanco = () => `certeza-${Math.random().toString(36).slice(2)}`;

type Certeza = 1 | 2 | 3 | undefined;

/** Um banco com um cartão e uma Revisão por entrada de `certezas` (`undefined` = sem o campo). */
async function comRevisoes(certezas: Certeza[]) {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const cartao = await repo.colecao('cartoes').criar({
    frente: 'Prazo?',
    verso: 'Um sexto.',
    origemTipo: 'manual',
    estado: 'ativo',
    caixa: 1,
    proximaRevisao: '2026-09-24',
  });
  for (const [i, certeza] of certezas.entries()) await revisar(repo, cartao.id, i, certeza);
  return { repo, cartao };
}

function revisar(repo: Repositorio, cartaoId: string, dia: number, certeza: Certeza) {
  return repo.colecao('revisoes').criar({
    cartaoId,
    em: `2026-09-${String(24 + dia)}T12:00:00.000Z`,
    data: `2026-09-${String(24 + dia)}`,
    resposta: 'errei',
    caixaAntes: 1,
    caixaDepois: 1,
    proximaAntes: '2026-09-24',
    proximaDepois: '2026-09-25',
    atrasoDias: 0,
    ...(certeza === undefined ? {} : { certeza }),
  });
}

const certezas = async (repo: Repositorio) =>
  (await repo.colecao('revisoes').todosDoUsuario())
    .sort((a, b) => a.em.localeCompare(b.em))
    .map((r) => r.certeza ?? null);

describe('Revisao.certeza no pacote (AP-02)', () => {
  it('pacote sem o campo restaura nos modos 6 e 2 e não inventa certeza', async () => {
    const { repo: origem } = await comRevisoes([undefined, undefined]);
    const { bytes } = await exportarPacote(origem);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const lido = await lerPacote(bytes);
    const r6 = await aplicar(destino, lido, await planejar(destino, lido, { modo: 6 }));
    expect(await certezas(r6.repo)).toEqual([null, null]);
    // Mesma identidade agora: uma Revisão nova, com certeza, não é tocada pelo pacote antigo (modo 2).
    const cartao = (await r6.repo.colecao('cartoes').todosDoUsuario())[0]!;
    await revisar(r6.repo, cartao.id, 5, 3);
    const outra = await lerPacote(bytes);
    const r2 = await aplicar(r6.repo, outra, await planejar(r6.repo, outra, { modo: 2 }));
    expect(await certezas(r2.repo)).toEqual([null, null, 3]);
  });

  it('ida e volta no modo 6 preserva a certeza e o arquivo de Revisões', async () => {
    const { repo: origem } = await comRevisoes([undefined, 1, 3]);
    const ida = await exportarPacote(origem);
    const lido = await lerPacote(ida.bytes);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const r = await aplicar(destino, lido, await planejar(destino, lido, { modo: 6 }));
    expect(await certezas(r.repo)).toEqual([null, 1, 3]);
    const volta = await exportarPacote(r.repo);
    for (const arquivo of ['dados/revisoes.json', 'dados/cartoes.json']) {
      expect(volta.manifesto.arquivos[arquivo]?.sha256).toBe(
        ida.manifesto.arquivos[arquivo]?.sha256,
      );
    }
  });

  it('recusa certeza fora de 1 a 3, mesmo com os hashes recalculados', async () => {
    const { repo } = await comRevisoes([3]);
    const { bytes } = await exportarPacote(repo);
    for (const certeza of [0, 4, 2.5, '3', null]) {
      const a: Record<string, Uint8Array> = unzipSync(bytes);
      const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
      const revisoes = (
        JSON.parse(deBytes(a['dados/revisoes.json']!)) as Record<string, unknown>[]
      ).map((r) => ({ ...r, certeza }));
      const novo = serializarLista(revisoes);
      a['dados/revisoes.json'] = novo;
      m.arquivos['dados/revisoes.json'] = { sha256: await sha256(novo), bytes: novo.length };
      m.hashConjunto = await hashDoConjunto(m.arquivos);
      a['manifesto.json'] = strToU8(JSON.stringify(m));
      const erro = await lerPacote(zipSync(a)).then(
        () => null,
        (e: unknown) => e,
      );
      expect(erro).toBeInstanceOf(PacoteRecusado);
      expect((erro as PacoteRecusado).motivo).toBe('arquivo_alterado');
    }
  });
});
