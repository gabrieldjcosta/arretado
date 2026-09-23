import { Id } from '../../core/modelo';
import { aplicar, desfazerImportacao } from '../../core/pacote';
import { repositorioDeTeste } from '../../testes/repositorio';
import { CsvInvalido, celulas, lerCsvPontos } from './csv';
import { idDeterministico, prepararPontos } from './importar';

const CSV = [
  '\ufeffDisciplina;Código;Ponto;Faixa',
  'Direito Penal;1;Aplicação da lei penal;Altíssima',
  'Direito Penal;2;"Crimes contra o patrimônio; furto e roubo";alta',
  'Execução Penal;1;Progressão de regime;MÉDIA',
  'Execução Penal;2;Remição;extra',
  'Execução Penal;3;Monitoração eletrônica;urgente',
  ';4;Sem disciplina;Alta',
  'Direito Penal;9;Aplicação da lei penal;Alta',
  '',
].join('\r\n');

describe('leitura do CSV de pontos (6.10)', () => {
  it('lê separador ;, aspas, BOM, CRLF e cabeçalho com acento', () => {
    expect(celulas('a;"b;c";"d ""e"""\r\n1;2;3')).toEqual([
      ['a', 'b;c', 'd "e"'],
      ['1', '2', '3'],
    ]);
    const { linhas, avisos } = lerCsvPontos(CSV);
    expect(linhas).toEqual([
      {
        disciplina: 'Direito Penal',
        titulo: 'Aplicação da lei penal',
        codigo: '1',
        faixa: 'altissima',
      },
      {
        disciplina: 'Direito Penal',
        titulo: 'Crimes contra o patrimônio; furto e roubo',
        codigo: '2',
        faixa: 'alta',
      },
      { disciplina: 'Execução Penal', titulo: 'Progressão de regime', codigo: '1', faixa: 'media' },
      { disciplina: 'Execução Penal', titulo: 'Remição', codigo: '2', faixa: 'extra' },
      { disciplina: 'Execução Penal', titulo: 'Monitoração eletrônica', codigo: '3' },
    ]);
    expect(avisos.join('\n')).toMatch(/Linha 7 ignorada: falta disciplina/);
    expect(avisos.join('\n')).toMatch(/Linha 8 ignorada: ponto repetido/);
    expect(avisos.join('\n')).toMatch(/1 ponto\(s\) com faixa não reconhecida/);
  });

  it('aceita vírgula e colunas em outra ordem', () => {
    const { linhas } = lerCsvPontos('Ponto,Matéria\nFurto,Direito Penal\n');
    expect(linhas).toEqual([{ disciplina: 'Direito Penal', titulo: 'Furto' }]);
  });

  it('recusa arquivo sem as colunas mínimas ou sem pontos', () => {
    expect(() => lerCsvPontos('Nome;Valor\na;b')).toThrow(CsvInvalido);
    expect(() => lerCsvPontos('Disciplina;Ponto\n')).toThrow(/Nenhum ponto/);
    expect(() => lerCsvPontos('')).toThrow(/vazio/);
  });
});

describe('importação dos pontos (6.10)', () => {
  it('ids determinísticos, válidos e distintos por usuário', async () => {
    const a = await idDeterministico('ponto', 'u1', 'x');
    expect(Id.safeParse(a).success).toBe(true);
    expect(await idDeterministico('ponto', 'u1', 'x')).toBe(a);
    expect(await idDeterministico('ponto', 'u2', 'x')).not.toBe(a);
    expect(await idDeterministico('ab', 'c')).not.toBe(await idDeterministico('a', 'bc'));
  });

  it('cria disciplinas e pontos somente leitura, com faixa e log de prioridade; repetir não duplica', async () => {
    const { repo } = await repositorioDeTeste();
    const { linhas } = lerCsvPontos(CSV);
    const p = await prepararPontos(repo, linhas, CSV);
    expect(p.previa.porColecao.disciplinas?.criar).toBe(2);
    expect(p.previa.porColecao.pontos?.criar).toBe(5);
    const { log } = await aplicar(repo, p.pacote, p.previa);

    const pontos = await repo.colecao('pontos').todosDoUsuario();
    expect(pontos).toHaveLength(5);
    expect(pontos.every((x) => x.somenteLeitura && x.origem === 'importacao')).toBe(true);
    const aplicacao = pontos.find((x) => x.titulo === 'Aplicação da lei penal');
    expect(aplicacao).toMatchObject({ faixa: 'altissima', codigo: '1' });
    expect(aplicacao?.logPrioridade?.[0]).toMatchObject({
      origem: 'importacao',
      depois: { faixa: 'altissima' },
    });

    const de_novo = await prepararPontos(repo, linhas, CSV);
    expect(de_novo.previa.escreve).toBe(false);

    await desfazerImportacao(repo, log.id);
    expect(await repo.colecao('pontos').contar()).toBe(0);
  });
});
