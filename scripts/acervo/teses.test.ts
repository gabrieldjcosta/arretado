import { describe, expect, it } from 'vitest';
import { ItemDaCuradoria } from './curadoria';
import { construirItemTeses, enderecoDaArea, FonteDeTeses, nosDeTeses } from './teses';
import { aderirAoItem } from '../../src/dominios/acervo/adesao';
import { FonteEmMemoria } from '../../src/dominios/acervo/fonte-em-memoria';
import { hashDoItem } from '../../src/dominios/acervo/hash';
import { Repositorio } from '../../src/core/persistencia';
import { analisarTese, possiveisEnderecos } from '../../src/dominios/legislacao/sumulas';

// Conteúdo inventado só para o teste: não é tese da Defensoria.
const FONTE = {
  titulo: 'Teses de Teste',
  areas: [
    {
      nome: 'Execução Criminal',
      teses: [
        {
          numero: 12,
          texto: 'Tese doze de teste.',
          origem: 'Encontro de Teste, 2008',
          link: 'https://exemplo.gov.br/t12.pdf',
        },
        { numero: 3, texto: 'Tese três de teste.', situacao: 'revogada' },
      ],
    },
    { nome: 'Cível', teses: [{ numero: 1, texto: 'Tese um de teste.' }] },
  ],
};

const cur = ItemDaCuradoria.parse({
  id: 'teses-teste',
  titulo: 'Teses de Teste',
  grupo: 'Teses',
  especie: 'teses',
  fonte: { adaptador: 'teses', arquivo: 'teste.json' },
});

describe('adaptador de teses', () => {
  it('cria nó de área, teses ordenadas dentro dela, origem e revogação', () => {
    const nos = nosDeTeses(FonteDeTeses.parse(FONTE));
    expect(nos.map((n) => n.endereco)).toEqual([
      'areaexecucaocriminal',
      't003',
      't012',
      'areacivel',
      't001',
    ]);
    expect(nos[0]).toMatchObject({ categoria: 'estrutural', rotulo: 'Execução Criminal' });
    expect(nos[1]).toMatchObject({
      pai: 'areaexecucaocriminal',
      status: 'revogado',
      rotulo: 'Tese 003',
    });
    expect(nos[2]?.procedencia).toEqual({
      rotulo: 'Encontro de Teste, 2008',
      link: 'https://exemplo.gov.br/t12.pdf',
    });
    expect(enderecoDaArea('Infância e Juventude')).toBe('areainfanciaejuventude');
  });

  it('gera o mesmo hash duas vezes e bloqueia número repetido', async () => {
    const a = construirItemTeses(cur, JSON.stringify(FONTE), '2026-10-10', undefined);
    const b = construirItemTeses(cur, JSON.stringify(FONTE), '2026-10-10', undefined);
    expect(a.bloqueios).toEqual([]);
    expect(a.item?.norma.especie).toBe('teses');
    expect(await hashDoItem(a.item!)).toBe(await hashDoItem(b.item!));
    const dup = {
      ...FONTE,
      areas: [FONTE.areas[0], { nome: 'Cível', teses: [FONTE.areas[0]!.teses[0]] }],
    };
    expect(
      construirItemTeses(cur, JSON.stringify(dup), '2026-10-10', undefined).bloqueios[0],
    ).toMatch(/repetida: 12/);
    expect(construirItemTeses(cur, '{', '2026-10-10', undefined).bloqueios[0]).toMatch(/inválida/);
  });

  it('a busca entende "tese 12"', () => {
    expect(analisarTese('Tese 12')).toEqual(['t012']);
    expect(possiveisEnderecos('tese nº 3')).toContain('t003');
    expect(analisarTese('12')).toEqual([]);
  });

  it('o app adere ao item: coleção de teses com a origem guardada no texto', async () => {
    const { item } = construirItemTeses(cur, JSON.stringify(FONTE), '2026-10-10', undefined);
    const repo = await Repositorio.abrir({
      nomeBanco: `teses-${Math.random().toString(36).slice(2)}`,
    });
    const fonte = await FonteEmMemoria.criar([{ item: item! }]);
    const indice = await fonte.listar();
    const r = await aderirAoItem(repo, fonte, indice.itens[0]!);
    expect(r.estado).toBe('adicionada');
    const normas = await repo.colecao('normas').todosDoUsuario();
    expect(normas[0]?.especie).toBe('teses');
    const disp = await repo.colecao('dispositivos').todosDoUsuario();
    const t12 = disp.find((d) => d.endereco === 't012')!;
    const area = disp.find((d) => d.endereco === 'areaexecucaocriminal')!;
    expect(t12.paiId).toBe(area.id);
    const textos = await repo.colecao('textosDispositivo').todosDoUsuario();
    expect(textos.find((t) => t.dispositivoId === t12.id)?.procedencia?.rotulo).toBe(
      'Encontro de Teste, 2008',
    );
  });
});
