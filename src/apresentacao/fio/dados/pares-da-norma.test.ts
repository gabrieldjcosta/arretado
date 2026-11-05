import type { Bloco } from '../../../core/seguranca/sanitizador';
import { abrirNorma } from '../../../dominios/legislacao/leitor';
import type { QuadradoDoMapa } from '../../../dominios/legislacao/mapa-da-norma';
import { criarRascunho, publicarVersao } from '../../../dominios/legislacao/servico';
import { repositorioDeTeste } from '../../../testes/repositorio';
import { paresDaNorma } from './pares-da-norma';

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 9.999, DE 5 DE MAIO DE 2020.'),
  linha('Dispõe sobre a execução.'),
  linha('O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta a seguinte Lei:'),
  linha(
    'Art. 1º Os condenados que cumprem pena em regime fechado e os presos provisórios poderão obter permissão para sair do estabelecimento, mediante escolta.',
  ),
  linha(
    'Art. 2º Os condenados que cumprem pena em regime semiaberto poderão obter autorização para saída temporária do estabelecimento, sem vigilância direta.',
  ),
  linha(
    'Art. 3º O prazo de prescrição da pretensão executória regula-se pela pena aplicada, nos termos do Código Penal.',
  ),
];

async function cenario() {
  const { repo } = await repositorioDeTeste();
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
  const { norma } = await publicarVersao(repo, versao.id);
  const aberta = await abrirNorma(repo, norma.id);
  const quadrado = (n: number, peso: number, classe: QuadradoDoMapa['classe']): QuadradoDoMapa => {
    const indice = aberta.nos.findIndex((no) => no.dispositivo.endereco === `art${String(n)}`);
    return {
      indice,
      fim: indice + 1,
      id: `q${String(n)}`,
      endereco: `art${String(n)}`,
      rotulo: `Art. ${String(n)}`,
      classe,
      peso,
      foraDeVigor: false,
    };
  };
  return { repo, aberta, quadrado };
}

describe('os pares da norma para o Ache a diferença', () => {
  it('junta dois artigos parecidos que a banca cobra, e só endereço e rótulo vão ao Fio', async () => {
    const { repo, aberta, quadrado } = await cenario();
    const pares = await paresDaNorma(repo, aberta, [
      quadrado(1, 3, 'altissima'),
      quadrado(2, 2, 'alta'),
      quadrado(3, 1, 'media'),
    ]);
    expect(pares).toEqual([
      {
        a: { endereco: 'art1', rotulo: 'Art. 1' },
        b: { endereco: 'art2', rotulo: 'Art. 2' },
      },
    ]);
  });

  it('sem peso (o Mapa não chegou) não há par, e a próxima entrada tenta de novo', async () => {
    const { repo, aberta, quadrado } = await cenario();
    expect(
      await paresDaNorma(repo, aberta, [quadrado(1, 0, 'sem'), quadrado(2, 0, 'sem')]),
    ).toEqual([]);
    const depois = await paresDaNorma(repo, aberta, [
      quadrado(1, 3, 'altissima'),
      quadrado(2, 2, 'alta'),
    ]);
    expect(depois).toHaveLength(1);
  });
});
