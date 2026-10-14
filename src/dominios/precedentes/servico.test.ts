import { repositorioDeTeste } from '../../testes/repositorio';
import {
  alternarFavorito,
  corrigirTextoDoPrecedente,
  criarFraseDePrecedente,
  criarPrecedente,
  excluirPrecedente,
  lerPrecedente,
  listarPrecedentes,
  marcarTrechoChave,
  relacionadosDe,
  removerTrechoChave,
  trechoPadrao,
  vincularADispositivo,
  vincularPrecedentes,
  vinculosDoDispositivo,
  vinculosDoPrecedente,
} from './servico';

const ADPF =
  'O sistema carcerário brasileiro vive um estado de coisas inconstitucional, com violação massiva de direitos fundamentais.';

async function adpf(repo: Parameters<typeof criarPrecedente>[0]) {
  return criarPrecedente(repo, { tribunal: 'STF', numero: 'ADPF 347', texto: ADPF });
}

describe('Precedentes (C2)', () => {
  it('exige tribunal, número e texto; a tese nasce como trecho-chave', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(criarPrecedente(repo, { tribunal: '', numero: '1', texto: 'x' })).rejects.toThrow(
      'Informe o tribunal e o número.',
    );
    await expect(
      criarPrecedente(repo, { tribunal: 'STF', numero: '1', texto: ' ' }),
    ).rejects.toThrow('Escreva ou cole o texto do precedente.');
    const p = await adpf(repo);
    expect(p.trechosChave).toHaveLength(1);
    expect(trechoPadrao(p)).toMatchObject({ rotulo: 'tese', inicio: 0, fim: ADPF.length });
  });

  it('marca e remove trechos-chave; o último não sai', async () => {
    const { repo } = await repositorioDeTeste();
    const p = await adpf(repo);
    const m = await marcarTrechoChave(repo, p.id, { inicio: 3, fim: 20, rotulo: 'ratio' });
    expect(m.trechosChave).toHaveLength(2);
    await expect(
      marcarTrechoChave(repo, p.id, { inicio: 5, fim: 5, rotulo: 'ementa' }),
    ).rejects.toThrow('Selecione o trecho.');
    const [primeiro, segundo] = m.trechosChave ?? [];
    await removerTrechoChave(repo, p.id, segundo!.id);
    await expect(removerTrechoChave(repo, p.id, primeiro!.id)).rejects.toThrow(
      'ao menos um trecho-chave',
    );
  });

  it('vincula o trecho a dispositivos, vê pelo dispositivo e não duplica', async () => {
    const { repo } = await repositorioDeTeste();
    const p = await adpf(repo);
    const dados = {
      precedenteId: p.id,
      normaId: p.id,
      dispositivoId: p.id,
      endereco: 'art5.incXLIX',
    };
    const a = await vincularADispositivo(repo, dados);
    const b = await vincularADispositivo(repo, dados);
    expect(b.id).toBe(a.id);
    expect(a.trechoId).toBe(trechoPadrao(p)?.id);
    expect(await vinculosDoDispositivo(repo, p.id)).toHaveLength(1);
    expect(await vinculosDoPrecedente(repo, p.id)).toHaveLength(1);
  });

  it('vincula precedentes nos dois sentidos; "supera" marca o outro como superado', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await adpf(repo);
    const b = await criarPrecedente(repo, { tribunal: 'STF', numero: 'RE 1', texto: 'Tese nova.' });
    await expect(
      vincularPrecedentes(repo, {
        de: { tipo: 'precedente', id: a.id },
        para: { tipo: 'precedente', id: a.id },
      }),
    ).rejects.toThrow('Escolha outro precedente.');
    const v = await vincularPrecedentes(repo, {
      de: { tipo: 'precedente', id: b.id },
      para: { tipo: 'precedente', id: a.id },
      tipoDeVinculo: 'supera',
    });
    expect(v.tipoDeVinculo).toBe('supera');
    const deA = await relacionadosDe(repo, a.id);
    expect(deA.superado).toBe(true);
    expect(deA.entrando).toHaveLength(1);
    expect((await relacionadosDe(repo, b.id)).saindo).toHaveLength(1);
    // O destino pode ser um dispositivo do acervo (súmula, tese).
    const s = await vincularPrecedentes(repo, {
      de: { tipo: 'precedente', id: a.id },
      para: { tipo: 'dispositivo', id: b.id, normaId: b.id },
    });
    expect(s.tipoDeVinculo).toBe('relacionado');
  });

  it('corrigir o texto reancora trechos e frases; trecho que some fica pendente', async () => {
    const { repo } = await repositorioDeTeste();
    const p = await adpf(repo);
    const m = await marcarTrechoChave(repo, p.id, {
      inicio: ADPF.indexOf('estado de coisas'),
      fim: ADPF.indexOf('estado de coisas') + 'estado de coisas inconstitucional'.length,
      rotulo: 'ratio',
    });
    const frase = await criarFraseDePrecedente(repo, {
      texto: 'ECI',
      precedenteId: p.id,
      citado: 'estado de coisas inconstitucional',
      inicio: ADPF.indexOf('estado de coisas'),
      fim: ADPF.indexOf('estado de coisas') + 'estado de coisas inconstitucional'.length,
    });
    expect(m.trechosChave).toHaveLength(2);
    const novo = `Nota: ${ADPF}`;
    const r = await corrigirTextoDoPrecedente(repo, p.id, novo);
    const ratio = r.trechosChave?.find((t) => t.rotulo === 'ratio');
    expect(ratio?.inicio).toBe(novo.indexOf('estado de coisas'));
    expect(ratio?.status).toBe('reancorada');
    const f = await repo.colecao('frases').obter(frase.id);
    expect(f?.trechoDePrecedente?.inicio).toBe(novo.indexOf('estado de coisas'));
    const sem = await corrigirTextoDoPrecedente(repo, p.id, 'Texto totalmente diferente agora.');
    expect(sem.trechosChave?.every((t) => t.status === 'pendente')).toBe(true);
  });

  it('favorito alterna e vai para o topo; excluir leva os vínculos', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await adpf(repo);
    const b = await criarPrecedente(repo, { tribunal: 'STJ', numero: 'Tema 1', texto: 'Tese.' });
    await alternarFavorito(repo, a.id);
    expect((await listarPrecedentes(repo))[0]?.id).toBe(a.id);
    await vincularPrecedentes(repo, {
      de: { tipo: 'precedente', id: a.id },
      para: { tipo: 'precedente', id: b.id },
    });
    await vincularADispositivo(repo, {
      precedenteId: a.id,
      normaId: b.id,
      dispositivoId: b.id,
      endereco: 'art1',
    });
    await excluirPrecedente(repo, a.id);
    expect(await lerPrecedente(repo, a.id)).toBeUndefined();
    expect((await relacionadosDe(repo, b.id)).entrando).toHaveLength(0);
    expect(await vinculosDoDispositivo(repo, b.id)).toHaveLength(0);
  });
});
