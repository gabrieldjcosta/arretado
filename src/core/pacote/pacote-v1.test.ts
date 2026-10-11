// Pacote v1 (gerado pelo app F0/F1) aberto no app v2 (F2, 9.1): `leituras` entra vazia.
import { strToU8, unzipSync, zipSync } from 'fflate';
import { Repositorio, apagarBanco } from '../persistencia';
import { alterarPreferencias, cotaDiaria, obterPreferencias } from '../preferencias';
import { deBytes } from './bytes';
import { cifrar } from './cifra';
import { exportarPacote, hashDoConjunto } from './exportar';
import { FORMATO, PacoteRecusado, type Manifesto } from './formato';
import { aplicar, planejar, type ModoEscrita } from './importar';
import { lerPacote } from './ler';

const nomeBanco = () => `v1-${Math.random().toString(36).slice(2)}`;

/**
 * Converte um pacote v2 no que o app v1 gerava: sem `dados/leituras.json` e com
 * `versaoEsquema: 1`. Fora a coleção nova, o formato é o mesmo.
 */
async function comoPacoteV1(
  bytes: Uint8Array,
  opcoes: { manterLeituras?: boolean } = {},
): Promise<Uint8Array> {
  const a = unzipSync(bytes);
  const m = JSON.parse(deBytes(a['manifesto.json']!)) as Manifesto;
  m.versaoEsquema = 1;
  // Coleções nascidas depois (v4) também não existiam no pacote v1.
  delete a['dados/vinculosDisciplina.json'];
  Reflect.deleteProperty(m.arquivos, 'dados/vinculosDisciplina.json');
  Reflect.deleteProperty(m.contagens, 'vinculosDisciplina');
  delete a['dados/pendenciasReleitura.json'];
  Reflect.deleteProperty(m.arquivos, 'dados/pendenciasReleitura.json');
  Reflect.deleteProperty(m.contagens, 'pendenciasReleitura');
  if (!opcoes.manterLeituras) {
    delete a['dados/leituras.json'];
    Reflect.deleteProperty(m.arquivos, 'dados/leituras.json');
    Reflect.deleteProperty(m.contagens, 'leituras');
  }
  m.hashConjunto = await hashDoConjunto(m.arquivos);
  a['manifesto.json'] = strToU8(JSON.stringify(m));
  return zipSync(a);
}

async function comLeitura() {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const norma = await repo.colecao('normas').criar({ tituloCurto: 'LEP', escopo: 'pessoal' });
  await repo.colecao('erros').criar({ resultado: 'errou', oQueFoi: 'Prazo', status: 'aberto' });
  const leitura = await repo.colecao('leituras').criar({ normaId: norma.id, lidoAteId: norma.id });
  return { repo, norma, leitura };
}

async function importar(repo: Repositorio, bytes: Uint8Array, modo: ModoEscrita) {
  const pacote = await lerPacote(bytes);
  return aplicar(repo, pacote, await planejar(repo, pacote, { modo }));
}

describe('pacote v1 no app v2 (9.1)', () => {
  it('lê o pacote v1 com `leituras` vazia e o resto intacto', async () => {
    const { repo } = await comLeitura();
    const { bytes } = await exportarPacote(repo);
    const lido = await lerPacote(await comoPacoteV1(bytes));
    expect(lido.manifesto.versaoEsquema).toBe(1);
    expect(lido.registros.get('leituras')).toEqual([]);
    expect(lido.registros.get('normas')).toHaveLength(1);
    expect(lido.registros.get('erros')).toHaveLength(1);
    repo.fechar();
  });

  it('pacote v1 cifrado também abre', async () => {
    const { repo } = await comLeitura();
    const { bytes } = await exportarPacote(repo);
    const v1 = await comoPacoteV1(bytes);
    // Cifra o conteúdo v1 como o app v1 fazia.
    const { cifra, conteudo } = await cifrar(v1, 'senha', 1_000);
    const externo = zipSync({
      'manifesto.json': strToU8(JSON.stringify({ formato: FORMATO, versaoFormato: 1, cifra })),
      'conteudo.cifrado': conteudo,
    });
    const lido = await lerPacote(externo, { senha: 'senha' });
    expect(lido.registros.get('leituras')).toEqual([]);
    repo.fechar();
  });

  it('recusa pacote v1 que traga `leituras` (coleção que a v1 não tinha)', async () => {
    const { repo } = await comLeitura();
    const { bytes } = await exportarPacote(repo);
    await expect(lerPacote(await comoPacoteV1(bytes, { manterLeituras: true }))).rejects.toThrow(
      PacoteRecusado,
    );
    repo.fechar();
  });

  it('restaurar integral (modo 6) um pacote v1 deixa o local igual ao pacote, sem leituras', async () => {
    const origem = await comLeitura();
    const { bytes } = await exportarPacote(origem.repo);
    const destino = await comLeitura();
    await importar(destino.repo, await comoPacoteV1(bytes), 6);
    const d = destino.repo.comUsuario(origem.repo.ctx.usuarioId);
    expect(await d.colecao('leituras').todosDoUsuario()).toEqual([]);
    expect((await d.colecao('normas').todosDoUsuario()).map((n) => n.id)).toEqual([
      origem.norma.id,
    ]);
    origem.repo.fechar();
    destino.repo.fechar();
  });

  it('preferências sem `destacarCondicionantesEPrazos` (anteriores à 9.8) restauram, com os destaques desligados', async () => {
    const origem = await comLeitura();
    await alterarPreferencias(origem.repo, { tamanhoFonte: 22 });
    const { bytes } = await exportarPacote(origem.repo);
    const destino = await comLeitura();
    await alterarPreferencias(destino.repo, { destacarCondicionantesEPrazos: true });
    await importar(destino.repo, await comoPacoteV1(bytes), 6);
    const preferencias = await obterPreferencias(
      destino.repo.comUsuario(origem.repo.ctx.usuarioId),
    );
    expect(preferencias.tamanhoFonte).toBe(22);
    // Ausente é desligado (o leitor lê `?? false`), sem migração.
    expect(preferencias).not.toHaveProperty('destacarCondicionantesEPrazos');
    origem.repo.fechar();
    destino.repo.fechar();
  });

  it('preferências sem `cotaDiaria` (anteriores à fatia 3) restauram, com a cota padrão', async () => {
    const origem = await comLeitura();
    const { bytes } = await exportarPacote(origem.repo);
    const destino = await comLeitura();
    await alterarPreferencias(destino.repo, { cotaDiaria: 30 });
    await importar(destino.repo, await comoPacoteV1(bytes), 6);
    const preferencias = await obterPreferencias(
      destino.repo.comUsuario(origem.repo.ctx.usuarioId),
    );
    expect(preferencias).not.toHaveProperty('cotaDiaria');
    expect(cotaDiaria(preferencias)).toBe(10);
    origem.repo.fechar();
    destino.repo.fechar();
  });

  it('preferências sem a lente e a espiada do foco (anteriores ao palco) restauram, com os padrões', async () => {
    const origem = await comLeitura();
    const { bytes } = await exportarPacote(origem.repo);
    const destino = await comLeitura();
    await alterarPreferencias(destino.repo, { lenteDoFoco: 'corrido', espiadaDosVizinhos: true });
    await importar(destino.repo, await comoPacoteV1(bytes), 6);
    const preferencias = await obterPreferencias(
      destino.repo.comUsuario(origem.repo.ctx.usuarioId),
    );
    expect(preferencias).not.toHaveProperty('lenteDoFoco');
    expect(preferencias).not.toHaveProperty('espiadaDosVizinhos');
    origem.repo.fechar();
    destino.repo.fechar();
  });

  it('substituir o módulo legislacao (modo 5) por um pacote v1 exclui as leituras locais', async () => {
    // O pacote v1 vale como um v2 sem leituras: o módulo passa a ser o do pacote.
    const { repo, leitura } = await comLeitura();
    const { bytes } = await exportarPacote(repo);
    const pacote = await lerPacote(await comoPacoteV1(bytes));
    const previa = await planejar(repo, pacote, { modo: 5, modulos: ['legislacao'] });
    expect(previa.porColecao.leituras?.excluir).toBe(1);
    await aplicar(repo, pacote, previa);
    const excluida = await repo.colecao('leituras').obter(leitura.id, { incluirExcluidos: true });
    expect(excluida?.excluidoEm).toEqual(expect.any(String));
    repo.fechar();
  });

  it('adicionar somente novos (modo 2) mantém as leituras locais', async () => {
    const { repo, leitura } = await comLeitura();
    const { bytes } = await exportarPacote(repo);
    await importar(repo, await comoPacoteV1(bytes), 2);
    expect((await repo.colecao('leituras').todosDoUsuario()).map((l) => l.id)).toEqual([
      leitura.id,
    ]);
    const nome = repo.db.name;
    repo.fechar();
    await apagarBanco(nome);
  });
});
