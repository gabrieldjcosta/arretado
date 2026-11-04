import { describe, expect, it } from 'vitest';
import { fatoDoPasso } from './fatos';
import type { Passo } from './tipos';

const ler = (rotulos: string[]): Passo => ({
  tipo: 'ler',
  materiaId: 'm',
  normaId: 'lep',
  tituloCurto: 'LEP',
  artigos: rotulos.map((r, i) => ({ endereco: `a${String(i)}`, rotulo: r })),
  porque: 'mapa',
});

describe('fatoDoPasso', () => {
  it('Ler diz os artigos sem artigo antes da norma', () => {
    const feito = { como: 'feito' as const, resultado: { tipo: 'ler' as const, lidos: 1 } };
    expect(fatoDoPasso(ler(['Art. 112']), feito)).toBe('Leu o art. 112 (LEP)');
    expect(fatoDoPasso(ler(['Art. 112', 'Art. 113']), feito)).toBe('Leu os arts. 112 e 113 (LEP)');
    expect(fatoDoPasso(ler(['Art. 5º', 'Art. 6º', 'Art. 7º']), { como: 'ja_feito' })).toBe(
      'Leu os arts. 5º, 6º e 7º (LEP)',
    );
    expect(fatoDoPasso(ler(['Preâmbulo', 'Art. 1']), feito)).toBe('Leu 2 dispositivos (LEP)');
    expect(
      fatoDoPasso(
        { tipo: 'ler', materiaId: 'm', adicionarNorma: true },
        { como: 'feito', resultado: { tipo: 'ler', lidos: 0 } },
      ),
    ).toBe('Adicionou a lei da matéria');
  });

  it('pulado não deixa fato', () => {
    expect(fatoDoPasso(ler(['Art. 1']), { como: 'pulado' })).toBeUndefined();
  });

  it('os outros passos, no tom do plano', () => {
    const lembrar: Passo = {
      tipo: 'lembrar',
      materiaId: 'm',
      normaId: 'n',
      tituloCurto: 'N',
      artigos: [],
    };
    expect(
      fatoDoPasso(lembrar, {
        como: 'feito',
        resultado: { tipo: 'lembrar', acertos: 2, erros: ['x'] },
      }),
    ).toBe('Lembrou 2 de 3');
    const guardar: Passo = { tipo: 'guardar', materiaId: 'm', normaId: 'n', enderecos: ['x'] };
    expect(
      fatoDoPasso(guardar, { como: 'feito', resultado: { tipo: 'guardar', guardadas: 1 } }),
    ).toBe('Guardou 1 Frase');
    expect(
      fatoDoPasso(guardar, { como: 'feito', resultado: { tipo: 'guardar', guardadas: 0 } }),
    ).toBeUndefined();
    const revisar: Passo = { tipo: 'revisar', materiaId: 'm', quantidade: 6 };
    expect(
      fatoDoPasso(revisar, {
        como: 'feito',
        resultado: { tipo: 'revisar', revisados: 6, voltamAmanha: 2 },
      }),
    ).toBe('Revisou 6, 2 voltam amanhã');
    expect(
      fatoDoPasso(revisar, {
        como: 'feito',
        resultado: { tipo: 'revisar', revisados: 6, voltamAmanha: 1 },
      }),
    ).toBe('Revisou 6, 1 volta amanhã');
    const sumula: Passo = {
      tipo: 'fixar_sumula',
      materiaId: 'm',
      sumulaId: 's',
      rotulo: 'Súmula 711 do STF',
    };
    expect(fatoDoPasso(sumula, { como: 'feito', resultado: { tipo: 'fixar_sumula' } })).toBe(
      'Súmula 711 do STF no caderno',
    );
    const porteira: Passo = {
      tipo: 'praticar',
      materiaId: 'm',
      modo: 'porteira',
      quantidade: 3,
      porque: 'fim_do_mapa',
    };
    expect(
      fatoDoPasso(porteira, {
        como: 'feito',
        resultado: { tipo: 'praticar', acertos: 3, total: 3 },
      }),
    ).toBe('Passou a porteira (3 de 3)');
    expect(
      fatoDoPasso(porteira, {
        como: 'feito',
        resultado: { tipo: 'praticar', acertos: 2, total: 3 },
      }),
    ).toBe('Fez a porteira (2 de 3)');
    const ache: Passo = { ...porteira, modo: 'ache_o_erro' };
    expect(
      fatoDoPasso(ache, { como: 'feito', resultado: { tipo: 'praticar', acertos: 1, total: 3 } }),
    ).toBe('Achou o erro em 1 de 3');
    const seu: Passo = {
      tipo: 'seu_passo',
      materiaId: 'm',
      tarefaId: 't',
      titulo: 'Ver a aula de execução',
    };
    expect(fatoDoPasso(seu, { como: 'feito', resultado: { tipo: 'seu_passo' } })).toBe(
      'Fez: Ver a aula de execução',
    );
    expect(fatoDoPasso(seu, { como: 'feito', resultado: { tipo: 'seu_passo', questoes: 1 } })).toBe(
      'Fez: Ver a aula de execução, com 1 questão',
    );
  });
});
