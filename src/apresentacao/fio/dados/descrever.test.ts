import type { Passo } from '../../../dominios/fio';
import { descreverPasso, rotuloDosArtigos } from './descrever';

const art = (n: number) => ({ endereco: `art-${String(n)}`, rotulo: `Art. ${String(n)}` });

describe('rótulo dos artigos de um passo', () => {
  it('diz um, dois, três e muitos artigos sem lista comprida', () => {
    expect(rotuloDosArtigos([art(112)])).toBe('Art. 112');
    expect(rotuloDosArtigos([art(112), art(113)])).toBe('Arts. 112 e 113');
    expect(rotuloDosArtigos([art(5), art(6), art(7)])).toBe('Arts. 5, 6 e 7');
    expect(rotuloDosArtigos([art(5), art(6), art(7), art(8), art(9)])).toBe('Arts. 5, 6 e mais 3');
  });

  it('dispositivo que não é artigo mantém o rótulo dele', () => {
    expect(rotuloDosArtigos([{ endereco: 'sv-11', rotulo: 'Súmula Vinculante 11' }])).toBe(
      'Súmula Vinculante 11',
    );
  });
});

describe('o que a tela diz de cada passo', () => {
  it('Ler traz a norma, os artigos, o porquê e um minuto por artigo', () => {
    const passo: Passo = {
      tipo: 'ler',
      materiaId: 'penal',
      normaId: 'lep',
      tituloCurto: 'LEP',
      artigos: [art(112), art(113)],
      porque: 'mapa',
    };
    expect(descreverPasso(passo, 'Execução Penal')).toEqual({
      titulo: 'LEP, Arts. 112 e 113',
      apoio: 'Execução Penal · um dos que mais caem',
      minutos: 2,
    });
  });

  it('Ler sem norma pede a lei da matéria, sem minutos', () => {
    const d = descreverPasso({ tipo: 'ler', materiaId: 'penal', adicionarNorma: true }, 'Penal');
    expect(d.titulo).toBe('Adicionar a lei de Penal');
    expect(d.minutos).toBeUndefined();
  });

  it('Revisar conta três itens por minuto, no mínimo um', () => {
    expect(descreverPasso({ tipo: 'revisar', materiaId: 'm', quantidade: 1 }, 'M').minutos).toBe(1);
    expect(descreverPasso({ tipo: 'revisar', materiaId: 'm', quantidade: 10 }, 'M').minutos).toBe(
      4,
    );
    expect(descreverPasso({ tipo: 'revisar', materiaId: 'm', quantidade: 1 }, 'M').titulo).toBe(
      'Revisar 1 item',
    );
  });

  it('o passo do usuário mostra o título que ele pôs no fio', () => {
    const d = descreverPasso(
      { tipo: 'seu_passo', materiaId: 'm', tarefaId: 't', titulo: 'Fichar o HC 143.988' },
      'M',
    );
    expect(d).toEqual({ titulo: 'Fichar o HC 143.988', apoio: 'Do seu fio' });
  });

  it('nenhuma frase soa como dívida', () => {
    const passos: Passo[] = [
      { tipo: 'revisar', materiaId: 'm', quantidade: 12 },
      { tipo: 'guardar', materiaId: 'm', normaId: 'n', enderecos: ['a'] },
      { tipo: 'praticar', materiaId: 'm', modo: 'porteira', quantidade: 3, porque: 'quarta_etapa' },
      { tipo: 'fixar_sumula', materiaId: 'm', sumulaId: 's', rotulo: 'Súmula 711 do STF' },
    ];
    for (const p of passos) {
      const d = descreverPasso(p, 'Penal');
      expect(`${d.titulo} ${d.apoio}`).not.toMatch(/atrasad|pendente|falta|esqueceu|parou/i);
    }
  });
});
