import type { Repositorio } from '../../core/persistencia';
import type { Bloco } from '../../core/seguranca/sanitizador';
import { repositorioDeTeste } from '../../testes/repositorio';
import type { FonteDoItem } from './ache-o-erro';
import {
  conferirCartao,
  conferirLacuna,
  gerarLacuna,
  gerarPergunta,
  gerarPorteira,
  montarCartao,
  montarGuardar,
  montarLembrar,
  montarPorteira,
  reunirGrifos,
  type FonteDoArtigo,
} from './lembrar';
import { criarRascunho, publicarVersao } from './servico';

const fonte = (texto: string, id = 'd1'): FonteDoItem => ({
  normaId: 'n1',
  dispositivoId: id,
  versaoId: 'v1',
  referencia: 'LEP · Art. 1º',
  texto,
  deslocamento: 0,
});

const A = 'A medida será reavaliada no prazo de 30 (trinta) dias, salvo decisão em contrário.';
const B = 'O pedido será decidido em até 10 (dez) dias úteis, sempre que houver urgência.';
const C = 'A internação não excederá o prazo de 3 (três) anos, nunca por tempo indeterminado.';
const D = 'O recurso será interposto em 5 (cinco) dias, exceto nos casos de lei.';

const grifos = reunirGrifos([A, B, C, D]);

describe('reunirGrifos', () => {
  it('junta os destaques por categoria, sem repetir e na ordem em que aparecem', () => {
    const g = reunirGrifos([A, A, B]);
    const prazos = g.get('prazo') ?? [];
    expect(prazos.length).toBeGreaterThanOrEqual(2);
    expect(new Set(prazos.map((p) => p.toLowerCase())).size).toBe(prazos.length);
    expect(prazos[0]).toContain('30');
  });

  it('descarta trecho curto demais ou longo demais', () => {
    expect(reunirGrifos(['']).size).toBe(0);
    const longo = `${'a'.repeat(80)} no prazo de 30 dias`;
    expect([...reunirGrifos([longo]).values()].flat().every((t) => t.length <= 60)).toBe(true);
  });
});

describe('gerarLacuna', () => {
  it('esconde um destaque e oferece três opções, a certa entre elas', () => {
    const lacuna = gerarLacuna(fonte(A), grifos, 1);
    expect(lacuna).toBeDefined();
    const l = lacuna!;
    expect(l.opcoes).toHaveLength(3);
    expect(new Set(l.opcoes.map((o) => o.toLowerCase())).size).toBe(3);
    expect(l.opcoes).toContain(l.resposta);
    expect(l.resposta).toBe(A.slice(l.inicio, l.fim));
    expect(conferirLacuna(l, l.resposta)).toBe(true);
    expect(
      conferirLacuna(
        l,
        l.opcoes.find((o) => o !== l.resposta)!,
      ),
    ).toBe(false);
  });

  it('é determinística: mesma fonte e mesma semente, mesma lacuna', () => {
    for (const semente of [0, 1, 7, 42]) {
      expect(gerarLacuna(fonte(A), grifos, semente)).toEqual(
        gerarLacuna(fonte(A), grifos, semente),
      );
    }
  });

  it('a semente muda o trecho escondido ou a ordem das opções', () => {
    const vistas = new Set(
      [0, 1, 2, 3, 4, 5, 6, 7].map((s) => JSON.stringify(gerarLacuna(fonte(A), grifos, s))),
    );
    expect(vistas.size).toBeGreaterThan(1);
  });

  it('a pergunta nunca entrega a resposta nas opções erradas por repetição do mesmo texto', () => {
    for (let s = 0; s < 20; s++) {
      const l = gerarLacuna(fonte(B), grifos, s)!;
      expect(l.opcoes.filter((o) => conferirLacuna(l, o))).toHaveLength(1);
    }
  });

  it('sem destaque no texto, não há lacuna', () => {
    expect(gerarLacuna(fonte('O juiz decidirá.'), grifos, 0)).toBeUndefined();
  });

  it('sem opções erradas possíveis, não há lacuna', () => {
    // Nenhum outro destaque na norma e nenhuma troca do próprio trecho: "salvo" sozinho.
    const sozinho = fonte('Isto vale, salvo decisão diversa.');
    expect(gerarLacuna(sozinho, reunirGrifos([sozinho.texto]), 0)).toBeUndefined();
  });
});

describe('montarCartao e conferirCartao', () => {
  it('o cartão certo mostra o texto da lei; o errado, uma troca', () => {
    const certo = montarCartao(fonte(A), true, 3)!;
    const errado = montarCartao(fonte(A), false, 3)!;
    expect(certo.mostrado).toBe(A);
    expect(certo.troca).toBeUndefined();
    expect(errado.mostrado).not.toBe(A);
    expect(errado.troca).toBeDefined();
    expect(conferirCartao(certo, 'certo')).toBe(true);
    expect(conferirCartao(certo, 'errado')).toBe(false);
    expect(conferirCartao(errado, 'errado')).toBe(true);
    expect(conferirCartao(errado, 'certo')).toBe(false);
  });

  it('texto sem troca segura não vira cartão', () => {
    expect(montarCartao(fonte('O juiz decidirá.'), true, 0)).toBeUndefined();
    expect(montarCartao(fonte('O juiz decidirá.'), false, 0)).toBeUndefined();
  });
});

describe('gerarPergunta', () => {
  it('dá a lacuna quando a norma tem opções', () => {
    expect(gerarPergunta(fonte(A), grifos, 1)?.tipo).toBe('lacuna');
  });

  it('cai para o certo ou errado quando faltam opções, e fica vazia sem troca', () => {
    // Um destaque sozinho na norma: a troca do próprio trecho dá uma opção; falta a segunda.
    const so = fonte('Isso é permitido sempre.');
    const p = gerarPergunta(so, reunirGrifos([so.texto]), 0);
    expect(p?.tipo).toBe('certo_ou_errado');
    expect(gerarPergunta(fonte('O juiz decidirá.'), grifos, 0)).toBeUndefined();
  });
});

describe('gerarPorteira', () => {
  const fontes = (textos: readonly string[], artigos = textos.length): FonteDoArtigo[] =>
    textos.map((texto, i) => ({
      ...fonte(texto, `d${String(i)}`),
      artigoEndereco: `art${String((i % artigos) + 1)}`,
      artigoRotulo: `Art. ${String((i % artigos) + 1)}`,
    }));

  it('dá três cartões de dispositivos diferentes, um certo e dois trocados', () => {
    const cartoes = gerarPorteira(fontes([A, B, C, D]), 5);
    expect(cartoes).toHaveLength(3);
    expect(new Set(cartoes.map((c) => c.fonte.dispositivoId)).size).toBe(3);
    expect(cartoes.filter((c) => c.troca === undefined)).toHaveLength(1);
    for (const c of cartoes) {
      if (c.troca) expect(c.mostrado).not.toBe(c.fonte.texto);
      else expect(c.mostrado).toBe(c.fonte.texto);
    }
  });

  it('é determinística e a semente muda a posição do certo', () => {
    expect(gerarPorteira(fontes([A, B, C, D]), 9)).toEqual(gerarPorteira(fontes([A, B, C, D]), 9));
    const posicoes = new Set(
      [0, 1, 2, 3, 4, 5].map((s) =>
        gerarPorteira(fontes([A, B, C]), s).findIndex((c) => c.troca === undefined),
      ),
    );
    expect(posicoes.size).toBeGreaterThan(1);
  });

  it('espalha entre os artigos antes de repetir um', () => {
    // Três artigos com dois dispositivos cada: a porteira pega um de cada.
    const cartoes = gerarPorteira(
      fontes(
        [A, B, C, D, A, B].map((t) => t),
        3,
      ),
      2,
    );
    const artigos = new Set(
      cartoes.map(
        (c) =>
          fontes([A, B, C, D, A, B], 3).find((f) => f.dispositivoId === c.fonte.dispositivoId)
            ?.artigoEndereco,
      ),
    );
    expect(artigos.size).toBe(3);
  });

  it('intercala artigos vizinhos: três seguidos no código, um cartão de cada, nunca de longe', () => {
    // Seis artigos (um dispositivo cada), em ordem; a janela é de três vizinhos.
    const seis = fontes([A, B, C, D, A, B], 6);
    const numeroDo = (id: string) => Number(id.slice(1));
    for (const semente of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const nums = gerarPorteira(seis, semente)
        .map((c) => numeroDo(c.fonte.dispositivoId))
        .sort((x, y) => x - y);
      expect(nums).toHaveLength(3);
      expect(nums[2]! - nums[0]!).toBe(2);
    }
    const inicios = new Set(
      [0, 1, 2, 3].map((s) =>
        Math.min(...gerarPorteira(seis, s).map((c) => numeroDo(c.fonte.dispositivoId))),
      ),
    );
    expect(inicios.size).toBeGreaterThan(1);
  });

  it('com menos texto bom, devolve menos cartões; com um só, ele vem trocado', () => {
    expect(gerarPorteira(fontes([A, 'O juiz decidirá.', B]), 1)).toHaveLength(2);
    const um = gerarPorteira(fontes([A]), 1);
    expect(um).toHaveLength(1);
    expect(um[0]?.troca).toBeDefined();
    expect(gerarPorteira(fontes(['O juiz decidirá.']), 1)).toEqual([]);
  });
});

// ── Leitura do banco ────────────────────────────────────────────────────────

const linha = (texto: string): Bloco => ({ trechos: [{ texto }] });
const LEI: Bloco[] = [
  linha('LEI Nº 1.234, DE 5 DE MAIO DE 2020.'),
  linha('Dispõe sobre o teste.'),
  linha(
    'O PRESIDENTE DA REPÚBLICA Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:',
  ),
  linha('TÍTULO I'),
  linha('DAS DISPOSIÇÕES GERAIS'),
  linha(
    'Art. 1º A medida será reavaliada no prazo de 30 (trinta) dias, salvo decisão em contrário.',
  ),
  linha('Parágrafo único. O pedido será decidido em até 10 (dez) dias úteis.'),
  linha('Art. 2º A internação não excederá o prazo de 3 (três) anos.'),
  linha('Art. 3º O recurso será interposto em 5 (cinco) dias, exceto nos casos de lei.'),
  linha('Art. 4º O juiz decidirá.'),
];

async function publicada(repo: Repositorio) {
  const { versao } = await criarRascunho(repo, { blocos: LEI, origemEntrada: 'html' });
  return publicarVersao(repo, versao.id);
}

const referenciaDe = () => 'Art.';

describe('Lembrar, Guardar e porteira lendo a norma', () => {
  it('uma pergunta por artigo com destaque; o artigo sem destaque fica de fora', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await publicada(repo);
    const artigos = ['art1', 'art2', 'art3', 'art4'].map((e) => ({ endereco: e, rotulo: e }));
    const perguntas = await montarLembrar(repo, { normaId: norma.id, artigos }, referenciaDe, 3);
    expect(perguntas.map((p) => p.artigoEndereco)).toEqual(['art1', 'art2', 'art3']);
    for (const p of perguntas) {
      expect(['lacuna', 'certo_ou_errado']).toContain(p.pergunta.tipo);
    }
    // O parágrafo único (art1.parUnico) também serve de fonte do artigo 1.
    const fontes = perguntas.map((p) =>
      p.pergunta.tipo === 'lacuna' ? p.pergunta.lacuna.fonte : p.pergunta.cartao.fonte,
    );
    expect(fontes[0]?.texto).toMatch(/30 \(trinta\)|10 \(dez\)/);
    expect(fontes[1]?.texto).toContain('3 (três) anos');
  });

  it('o Guardar refaz as mesmas perguntas do Lembrar com a mesma semente', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await publicada(repo);
    const artigos = ['art1', 'art2', 'art3'].map((e) => ({ endereco: e, rotulo: 'Art.' }));
    const lembrar = await montarLembrar(repo, { normaId: norma.id, artigos }, referenciaDe, 11);
    const guardar = await montarGuardar(
      repo,
      { normaId: norma.id, enderecos: ['art3', 'art1'] },
      referenciaDe,
      11,
    );
    const doLembrar = new Map(lembrar.map((p) => [p.artigoEndereco, p.pergunta]));
    expect(guardar.map((g) => g.artigoEndereco)).toEqual(['art3', 'art1']);
    for (const g of guardar) expect(g.pergunta).toEqual(doLembrar.get(g.artigoEndereco));
  });

  it('a porteira monta três cartões dos artigos pedidos', async () => {
    const { repo } = await repositorioDeTeste();
    const { norma } = await publicada(repo);
    const artigos = ['art1', 'art2', 'art3', 'art4'].map((e) => ({ endereco: e, rotulo: e }));
    const cartoes = await montarPorteira(repo, { normaId: norma.id, artigos }, referenciaDe, 4);
    expect(cartoes).toHaveLength(3);
    expect(cartoes.filter((c) => c.troca === undefined)).toHaveLength(1);
    await expect(
      montarPorteira(repo, { normaId: norma.id, artigos: [] }, referenciaDe, 4),
    ).resolves.toEqual([]);
  });
});
