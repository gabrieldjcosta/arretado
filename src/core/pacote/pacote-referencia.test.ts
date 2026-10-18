// Versão de formato do pacote com log de lote por referência (F4-A, pacote AL): o pacote cujo log
// tem `acervo-adesao` sai na versão 2 (o app anterior recusa); sem referência segue na 1.
import { strToU8, unzipSync, zipSync } from 'fflate';
import { idDoLote, OPERACAO_ADESAO, Repositorio } from '../persistencia';
import { deBytes } from './bytes';
import { exportarPacote, hashDoConjunto } from './exportar';
import { PacoteRecusado, VERSAO_FORMATO, VERSOES_FORMATO_LIDAS, type Manifesto } from './formato';
import { aplicar, planejar } from './importar';
import { lerPacote } from './ler';

const nomeBanco = () => `pacote-ref-${Math.random().toString(36).slice(2)}`;

/** O leitor do app anterior ao AL: só a versão de formato 1 (ler.ts, `verificarCabecalho`). */
function leitorAntigoAceita(bytes: Uint8Array): boolean {
  const m = JSON.parse(deBytes(unzipSync(bytes)['manifesto.json']!)) as Manifesto;
  return m.versaoFormato === 1;
}

async function comLote() {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const normaId = repo.ctx.novoId();
  const versaoId = repo.ctx.novoId();
  const base = repo.ctx.novoId();
  await repo.transacao(() =>
    repo.gravarLoteDoAcervo(
      { itemId: 'lei-x', versao: 1, hash: 'b'.repeat(64), normaId, versaoId, base },
      {
        dispositivos: [
          {
            normaId,
            endereco: 'art1',
            categoria: 'normativo',
            tipo: 'artigo',
            ordem: 1,
            status: 'vigente',
            confianca: 'alta',
          },
        ],
        textos: [{ versaoId, normaId, dispositivoId: idDoLote(base, 0), trechos: [{ texto: 'Texto.' }] }],
      },
    ),
  );
  return repo;
}

async function comoVersao(bytes: Uint8Array, versaoFormato: number): Promise<Uint8Array> {
  const a = unzipSync(bytes);
  const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
  (m as { versaoFormato: number }).versaoFormato = versaoFormato;
  m.hashConjunto = await hashDoConjunto(m.arquivos);
  a['manifesto.json'] = strToU8(JSON.stringify(m));
  return zipSync(a);
}

describe('versão de formato do pacote (AL)', () => {
  it('a versão atual é a 2 e o leitor lê a 1 e a 2', () => {
    expect(VERSAO_FORMATO).toBe(2);
    expect(VERSOES_FORMATO_LIDAS).toEqual([1, 2]);
  });

  it('pacote com log de referência sai na versão 2; o leitor antigo recusa, o novo lê', async () => {
    const repo = await comLote();
    const { bytes, manifesto } = await exportarPacote(repo, { incluirLog: true });
    expect(manifesto.versaoFormato).toBe(2);
    expect(leitorAntigoAceita(bytes)).toBe(false);
    const lido = await lerPacote(bytes);
    expect(lido.log?.some((a) => (a as { operacao: string }).operacao === OPERACAO_ADESAO)).toBe(
      true,
    );
    // E importa no app novo (os registros vêm de dados/, como sempre).
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const r = await aplicar(destino, lido, await planejar(destino, lido, { modo: 6 }));
    expect(await r.repo.colecao('dispositivos').contar()).toBe(1);
    expect(await r.repo.colecao('textosDispositivo').contar()).toBe(1);
    repo.fechar();
    destino.fechar();
  });

  it('cifrado com log de referência também sai na versão 2 (dentro e fora)', async () => {
    const repo = await comLote();
    const { bytes } = await exportarPacote(repo, { incluirLog: true, senha: 'x', iteracoes: 1000 });
    expect(leitorAntigoAceita(bytes)).toBe(false);
    expect((await lerPacote(bytes, { senha: 'x' })).manifesto.versaoFormato).toBe(2);
    repo.fechar();
  });

  it('sem referência no pacote (ou sem log) segue na versão 1: o app anterior continua lendo', async () => {
    const repo = await comLote();
    const semLog = await exportarPacote(repo);
    expect(semLog.manifesto.versaoFormato).toBe(1);
    expect(leitorAntigoAceita(semLog.bytes)).toBe(true);
    const limpo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    await limpo.colecao('erros').criar({ resultado: 'errou', oQueFoi: 'Prazo', status: 'aberto' });
    const comLogSemRef = await exportarPacote(limpo, { incluirLog: true });
    expect(comLogSemRef.manifesto.versaoFormato).toBe(1);
    repo.fechar();
    limpo.fechar();
  });

  it('pacote antigo (versão 1, log por registro) ainda é importado', async () => {
    const origem = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    await origem.colecao('erros').criar({ resultado: 'errou', oQueFoi: 'Prazo', status: 'aberto' });
    const { bytes } = await exportarPacote(origem, { incluirLog: true });
    const lido = await lerPacote(bytes);
    expect(lido.manifesto.versaoFormato).toBe(1);
    const destino = await Repositorio.abrir({ nomeBanco: nomeBanco() });
    const r = await aplicar(destino, lido, await planejar(destino, lido, { modo: 6 }));
    expect(await r.repo.colecao('erros').contar()).toBe(1);
    origem.fechar();
    destino.fechar();
  });

  it('versão de formato posterior pede para atualizar o app', async () => {
    const repo = await comLote();
    const { bytes } = await exportarPacote(repo, { incluirLog: true });
    const futuro = await comoVersao(bytes, 3);
    await expect(lerPacote(futuro)).rejects.toMatchObject({ motivo: 'versao_posterior' });
    try {
      await lerPacote(futuro);
    } catch (e) {
      expect((e as PacoteRecusado).message).toMatch(/Atualize o app/);
    }
    repo.fechar();
  });
});
