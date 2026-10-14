import { describe, expect, it } from 'vitest';
import {
  FonteEmbutida,
  chaveDeNome,
  disciplinaNoEdital,
  editaisOferecidos,
} from '../../dominios/catalogo';
import { chave } from '../pontos/csv';
import { chaveDoItem, linhasDoEdital, tituloDoPonto } from './linhas';

const fonte = new FonteEmbutida();

describe('linhas do catálogo para a importação de pontos', () => {
  it('linhas do edital seguem o formato da importação de pontos e respeitam a escolha', async () => {
    const dp = await fonte.obter('defensoria-publica');
    const edital = editaisOferecidos(dp)[0]!;
    const todas = linhasDoEdital(edital);
    expect(todas.length).toBe(edital.disciplinas.reduce((n, d) => n + d.itens.length, 0));
    const primeira = edital.disciplinas[0]!;
    const nome = primeira.nome ?? primeira.nomeNoEdital;
    const so = linhasDoEdital(edital, new Set([chaveDeNome(nome)]));
    expect(so.length).toBe(primeira.itens.length);
    expect(so.every((l) => l.disciplina === nome)).toBe(true);
    const consolidada = dp.disciplinas.find((d) => chaveDeNome(d.nome) === chaveDeNome(nome));
    if (consolidada) expect(disciplinaNoEdital(edital, consolidada)).toBe(primeira);
  });

  it('faixa de item sem base não vira faixa do ponto', () => {
    const edital = {
      id: 'e',
      orgao: 'X',
      uf: null,
      banca: null,
      ano: 2026,
      cargo: null,
      fase: null,
      situacao: 'completo' as const,
      fonteUrl: null,
      rotulo: 'baseado no edital X de 2026',
      disciplinas: [
        {
          nomeNoEdital: 'D',
          ordem: 1,
          itens: [
            {
              numero: '1',
              assunto: 'Com base',
              faixa: 'Alta' as const,
              obsFaixa: 'edital',
              recorrencia: null,
              fonteUrl: null,
            },
            {
              numero: null,
              assunto: 'Sem base',
              faixa: 'Alta' as const,
              obsFaixa: null,
              recorrencia: null,
              fonteUrl: null,
            },
          ],
        },
      ],
    };
    const [a, b] = linhasDoEdital(edital);
    expect(a).toEqual({ disciplina: 'D', titulo: 'Com base', codigo: '1', faixa: 'alta' });
    expect(b).toEqual({ disciplina: 'D', titulo: 'Sem base' });
  });

  it('assunto longo vira título dentro do limite do Ponto', () => {
    const longo = `${'palavra '.repeat(200)}fim`;
    const t = tituloDoPonto(longo);
    expect(t.length).toBeLessThanOrEqual(500);
    expect(t.endsWith('…')).toBe(true);
    expect(tituloDoPonto('  curto \n assunto ')).toBe('curto assunto');
  });

  it('assuntos dispensados ficam fora das linhas', async () => {
    const dp = await fonte.obter('ministerio-publico');
    const edital = editaisOferecidos(dp)[0]!;
    const primeira = edital.disciplinas[0]!;
    const nome = primeira.nome ?? primeira.nomeNoEdital;
    const todas = linhasDoEdital(edital);
    const menos = linhasDoEdital(edital, undefined, new Set([chaveDoItem(nome, 0)]));
    expect(menos.length).toBe(todas.length - 1);
  });

  it('todos os editais oferecidos geram pontos válidos e sem repetição na disciplina', async () => {
    for (const slug of ['defensoria-publica', 'magistratura', 'ministerio-publico', 'ambiental']) {
      const carreira = await fonte.obter(slug);
      for (const edital of editaisOferecidos(carreira)) {
        const vistos = new Set<string>();
        for (const l of linhasDoEdital(edital)) {
          expect(l.titulo.length).toBeGreaterThan(0);
          expect(l.titulo.length).toBeLessThanOrEqual(500);
          vistos.add(`${chave(l.disciplina)}|${chave(l.titulo)}`);
        }
        // Repetições dentro da mesma disciplina viram um ponto só (id determinístico).
        expect(vistos.size).toBeGreaterThan(0);
      }
    }
  });
});
