import { Repositorio } from '../../core/persistencia';
import type { CarreiraDoPacote, ItemDoAcervo } from './esquemas';
import { FonteEmMemoria } from './fonte-em-memoria';
import { adicionarPartida, normasDaPartida } from './partida';

const nomeBanco = () => `partida-${Math.random().toString(36).slice(2)}`;

function item(id: string): ItemDoAcervo {
  return {
    id,
    versao: 1,
    norma: { tituloCurto: id.toUpperCase(), tipo: 'Lei', esfera: 'federal' },
    nos: [
      {
        endereco: 'art1',
        categoria: 'normativo',
        tipo: 'artigo',
        rotulo: 'Art. 1º',
        status: 'vigente',
        confianca: 'alta',
        trechos: [{ texto: 'Texto do artigo.' }],
      },
    ],
  };
}

const norma = (id: string) => ({ id, titulo: id, editaisQueCitam: 3, porcentagem: 75 });
const carreira: CarreiraDoPacote = {
  nome: 'Carreira A',
  editaisComTexto: 4,
  normas: [norma('lei-a'), norma('lei-sumida'), norma('lei-b'), norma('lei-c')],
};

async function montar() {
  const repo = await Repositorio.abrir({ nomeBanco: nomeBanco() });
  const fonte = await FonteEmMemoria.criar([
    { item: item('lei-a') },
    { item: item('lei-b') },
    { item: item('lei-c') },
  ]);
  return { repo, fonte, indice: await fonte.listar() };
}

describe('normasDaPartida', () => {
  it('separa as que o acervo tem, na ordem do pacote, das que faltam nele', async () => {
    const { indice } = await montar();
    const { presentes, faltam } = normasDaPartida(carreira, indice);
    expect(presentes.map((p) => p.entrada.id)).toEqual(['lei-a', 'lei-b', 'lei-c']);
    expect(presentes[0]?.norma.editaisQueCitam).toBe(3);
    expect(faltam.map((n) => n.id)).toEqual(['lei-sumida']);
  });
});

describe('adicionarPartida', () => {
  const ids = ['lei-a', 'lei-b', 'lei-c'];

  it('adiciona todas e devolve a primeira para abrir', async () => {
    const { repo, fonte } = await montar();
    const r = await adicionarPartida(repo, fonte, ids);
    expect(r.lote.adicionadas).toEqual(ids);
    const normas = await repo.colecao('normas').todosDoUsuario();
    expect(normas).toHaveLength(3);
    expect(r.normaId).toBe(normas.find((n) => n.origemAcervo?.id === 'lei-a')?.id);
  });

  it('é idempotente: de novo, nada se repete e a mesma norma abre', async () => {
    const { repo, fonte } = await montar();
    const primeira = await adicionarPartida(repo, fonte, ids);
    const segunda = await adicionarPartida(repo, fonte, ids);
    expect(segunda.lote.jaAdicionadas).toEqual(ids);
    expect(segunda.normaId).toBe(primeira.normaId);
    expect(await repo.colecao('normas').todosDoUsuario()).toHaveLength(3);
  });

  it('se a primeira falha, abre a primeira que entrou, e diz qual falhou', async () => {
    const { repo, fonte } = await montar();
    fonte.falhas.add('lei-a');
    const r = await adicionarPartida(repo, fonte, ids);
    expect(r.lote.falhas.map((f) => f.id)).toEqual(['lei-a']);
    const normas = await repo.colecao('normas').todosDoUsuario();
    expect(r.normaId).toBe(normas.find((n) => n.origemAcervo?.id === 'lei-b')?.id);
  });

  it('sem nenhuma que entre, não há o que abrir', async () => {
    const { repo, fonte } = await montar();
    for (const id of ids) fonte.falhas.add(id);
    const r = await adicionarPartida(repo, fonte, ids);
    expect(r.normaId).toBeUndefined();
    expect(r.lote.falhas).toHaveLength(3);
  });

  it('conta o andamento a cada norma, para a tela mostrar "2 de 3"', async () => {
    const { repo, fonte } = await montar();
    const vistos: string[] = [];
    await adicionarPartida(repo, fonte, ids, {
      aoProgresso: (feitos, total, atual) => {
        vistos.push(`${String(feitos)}/${String(total)} ${atual?.id ?? ''}`.trim());
      },
    });
    expect(vistos).toEqual(['0/3 lei-a', '1/3 lei-b', '2/3 lei-c', '3/3']);
  });
});
