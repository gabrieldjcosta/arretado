import { repositorioDeTeste } from '../../testes/repositorio';
import {
  criarFraseDeResumo,
  criarResumo,
  editarResumo,
  excluirResumo,
  lerResumo,
  listarResumos,
  tituloDoResumo,
} from './resumos';

describe('Resumos (C1)', () => {
  it('só o corpo é obrigatório; o título vem da primeira linha', async () => {
    const { repo } = await repositorioDeTeste();
    await expect(criarResumo(repo, { corpo: '   ' })).rejects.toThrow('Escreva o resumo.');
    const n = await criarResumo(repo, { corpo: 'Estado de coisas inconstitucional\nADPF 347' });
    expect(n.tipo).toBe('resumo');
    expect(n.titulo).toBe('Estado de coisas inconstitucional');
    expect(tituloDoResumo('x'.repeat(200))).toHaveLength(80);
  });

  it('edita, lista só resumos e exclui', async () => {
    const { repo } = await repositorioDeTeste();
    const a = await criarResumo(repo, { corpo: 'A' });
    await repo.colecao('notas').criar({ titulo: 'anot', tipo: 'anotacao', conteudo: 'x' });
    await editarResumo(repo, a.id, { corpo: 'A2', titulo: 'Novo' });
    expect((await listarResumos(repo)).map((n) => n.titulo)).toEqual(['Novo']);
    expect((await lerResumo(repo, a.id))?.conteudo).toBe('A2');
    await excluirResumo(repo, a.id);
    expect(await lerResumo(repo, a.id)).toBeUndefined();
  });

  it('HTML colado fica como texto, sem virar marcação', async () => {
    const { repo } = await repositorioDeTeste();
    const n = await criarResumo(repo, { corpo: '<img src=x onerror=alert(1)>' });
    expect((await lerResumo(repo, n.id))?.conteudo).toBe('<img src=x onerror=alert(1)>');
  });

  it('"Enviar às frases" guarda o link de volta ao intervalo do resumo', async () => {
    const { repo } = await repositorioDeTeste();
    const n = await criarResumo(repo, { corpo: 'Tese central do julgado.' });
    const f = await criarFraseDeResumo(repo, {
      texto: 'Tese central',
      notaId: n.id,
      citado: 'Tese central',
      inicio: 0,
      fim: 12,
    });
    expect(f.origemTipo).toBe('trecho');
    expect(f.trechoDeNota).toEqual({ notaId: n.id, texto: 'Tese central', inicio: 0, fim: 12 });
    await expect(
      criarFraseDeResumo(repo, { texto: ' ', notaId: n.id, citado: 'x', inicio: 0, fim: 1 }),
    ).rejects.toThrow('Escreva a frase.');
  });
});
