import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { DESTINO, ORIGEM, gerarCss, trocarCorpo, trocarSeletor } from './fio-mockup-css.mjs';

const raiz = path.join(import.meta.dirname, '..');
const ler = (relativo: string) => readFileSync(path.join(raiz, relativo), 'utf8');

// A cara do Arretado novo é a do mockup que o Gabriel aprovou (docs/design/fio/README.md). O CSS do
// app é gerado dele; estes testes seguram as duas pontas: o arquivo aprovado não muda em silêncio e o
// CSS do app nunca se afasta dele.

/** sha256 do arquivo que o Gabriel aprovou em 04/11/2026 (`Arretado_o_Fio.html`). */
const SHA256_APROVADO = 'e70647a8d65a54e95b6922cf2c05fed7c43f35a2f0e1dad1e6039557324978af';

describe('o mockup aprovado do Fio', () => {
  it('é o arquivo que o Gabriel aprovou: trocar o arquivo é decisão da Marca e dele', () => {
    const atual = createHash('sha256')
      .update(readFileSync(path.join(raiz, ORIGEM)))
      .digest('hex');
    // Se a Marca entregou uma versão nova aprovada: troque o arquivo, rode `npm run fio:css` e atualize
    // o hash aqui junto, citando a aprovação no PR.
    expect(atual).toBe(SHA256_APROVADO);
  });

  it('o CSS do app é exatamente o gerado dele (`npm run fio:css`)', () => {
    expect(ler(DESTINO)).toBe(gerarCss(ler(ORIGEM)));
  });
});

describe('o CSS gerado do mockup', () => {
  const raizDoCss = postcss.parse(ler(DESTINO));

  it('todo seletor vale só dentro da raiz do Fio (nada vaza para o resto do app)', () => {
    const fora: string[] = [];
    raizDoCss.walkRules((regra) => {
      const pai = regra.parent;
      if (pai?.type === 'atrule' && 'name' in pai && /keyframes$/.test(pai.name)) return;
      for (const seletor of regra.selectors) {
        if (!seletor.trim().startsWith('.m-fio')) fora.push(seletor);
      }
    });
    expect(fora).toEqual([]);
  });

  it('classes, ids e propriedades personalizadas ganham o prefixo `m-`', () => {
    const css = raizDoCss.toString();
    // Propriedade personalizada sem o prefixo: `--ponto` deve ser `--m-ponto`.
    expect(css).not.toMatch(/--(?!m-)[a-z]/);
    // O id do filtro e o do mapa mudam juntos nas regras e nos `url(#…)`.
    expect(css).not.toMatch(/url\(#(?!m-)/);
  });

  it('o protótipo (página, barra de controles e nota) não entra', () => {
    const css = raizDoCss.toString();
    expect(css).not.toMatch(/\.m-controles|\.m-nota|(^|\s)body\b|(^|\s)html\b/m);
  });
});

describe('a troca de seletores e de corpo', () => {
  it('prefixa a classe e põe a regra dentro da raiz, com a mesma especificidade para todas', () => {
    expect(trocarSeletor('.acao:hover')).toBe('.m-fio .m-acao:hover');
    expect(trocarSeletor('button.marca')).toBe('.m-fio button.m-marca');
    expect(trocarSeletor('.app.largo [data-tela="mapa"] #destino')).toBe(
      '.m-fio .m-app.m-largo [data-tela="mapa"] #m-destino',
    );
  });

  it('o :root vira a raiz do Fio e não vira ancestral dela', () => {
    expect(trocarSeletor(':root')).toBe('.m-fio.m-fio');
    expect(trocarSeletor(':root[data-mundo="dia"] .acao')).toBe(
      '.m-fio.m-fio[data-mundo="dia"] .m-acao',
    );
  });

  it('o .leve da página do protótipo (aparelho fraco) vira classe da raiz do Fio', () => {
    expect(trocarSeletor('.leve .brilho')).toBe('.m-fio.m-leve .m-brilho');
    expect(trocarSeletor('.leve')).toBe('.m-fio.m-leve');
    expect(trocarSeletor('.levemente')).toBe('.m-fio .m-levemente');
  });

  it('não mexe no que está entre colchetes', () => {
    expect(trocarSeletor('[data-tela="ler"]')).toBe('.m-fio [data-tela="ler"]');
  });

  it('descarta o que só existe no protótipo', () => {
    expect(trocarSeletor('body')).toBeNull();
    expect(trocarSeletor('html, body')).toBeNull();
    expect(trocarSeletor('.controles button')).toBeNull();
    expect(trocarSeletor('.nota')).toBeNull();
  });

  it('prefixa as propriedades personalizadas e os filtros do corpo', () => {
    expect(trocarCorpo('color: var(--texto); filter: url(#desfoque)')).toBe(
      'color: var(--m-texto); filter: url(#m-desfoque)',
    );
  });
});
