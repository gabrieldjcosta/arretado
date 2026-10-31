import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(
  path.join(
    import.meta.dirname,
    '..',
    'src',
    'apresentacao',
    'entrada',
    'passeio',
    'estilos-passeio.css',
  ),
  'utf8',
);

// O jsdom não aplica o CSS da Chegada (nem as consultas de contêiner): estas são as regras de que o layout
// do celular pequeno, a fonte ampliada, o movimento e as cores do botão do Google dependem. Quem muda uma
// delas muda também o contrato (docs/design/referencias/2026-10-27-ze/) ou o teste de ponta a ponta
// (`e2e/passeio.spec.ts`).

const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** O texto entre as chaves que abrem em `inicio`, equilibradas, em uma linha só. */
function interior(origem: string, inicio: number): string {
  const abre = origem.indexOf('{', inicio);
  let fundo = 1;
  let i = abre + 1;
  for (; i < origem.length && fundo > 0; i += 1) {
    if (origem[i] === '{') fundo += 1;
    if (origem[i] === '}') fundo -= 1;
  }
  return origem
    .slice(abre + 1, i - 1)
    .replace(/\s+/g, ' ')
    .trim();
}

/** O corpo da primeira regra que começa por `seletor` (de qualquer nível: dentro de `@media` também). */
function bloco(seletor: string, origem = semComentarios): string {
  const inicio = origem.search(new RegExp(`(^|[{}])\\s*${escapar(seletor)}\\s*\\{`));
  if (inicio < 0) throw new Error(`regra não achada: ${seletor}`);
  return interior(origem, inicio + (origem[inicio] === '{' || origem[inicio] === '}' ? 1 : 0));
}

/** O que está dentro do `@media`/`@container` com este cabeçalho exato (o primeiro). */
function dentroDe(cabecalho: string): string {
  const inicio = semComentarios.indexOf(cabecalho);
  if (inicio < 0) throw new Error(`consulta não achada: ${cabecalho}`);
  return interior(semComentarios, inicio);
}

describe('o CSS da Chegada: a folha e o celular (D-D10)', () => {
  it('o <dialog> é o contêiner de consulta, em tamanho, de 30 rem num monitor', () => {
    const folha = bloco('dialog.dialogo-chegada');
    expect(folha).toContain('container: chegada / size;');
    expect(folha).toContain('width: min(30rem, 100vw);');
    expect(folha).toContain('height: min(46rem, 100dvh);');
    expect(folha).toContain('overflow: hidden;');
  });

  it('no celular a folha é a tela toda, com os recortes da tela respeitados', () => {
    const celular = dentroDe('@media (max-width: 30rem)');
    expect(celular).toContain('width: 100vw;');
    expect(celular).toContain('height: 100dvh;');
    expect(celular).toContain('border-radius: 0;');
    for (const lado of ['top', 'right', 'bottom', 'left']) {
      expect(celular).toContain(`env(safe-area-inset-${lado}, 0px)`);
    }
  });

  it('a única consulta de mídia por tamanho é a do celular; o resto é consulta de contêiner em em', () => {
    const porTamanho = semComentarios.match(/@media[^{]*\((?:max|min)-(?:width|height)[^)]*\)/g);
    expect(porTamanho).toEqual(['@media (max-width: 30rem)']);
    const consultas = [...semComentarios.matchAll(/@container chegada ([^{]+)\{/g)].map((m) =>
      (m[1] ?? '').trim(),
    );
    expect(consultas).toEqual([
      '(max-height: 41em)',
      '(max-height: 41em) and (min-width: 13em)',
      '(max-width: 16em)',
      '(max-height: 24em)',
    ]);
  });
});

describe('o CSS da Chegada: tela baixa e fonte ampliada (consultas de contêiner, em `em`)', () => {
  it('abaixo de 41 em de altura o passo se compacta: sem pontos, ícone menor, Zé espiando', () => {
    const baixa = dentroDe('@container chegada (max-height: 41em)');
    expect(bloco('.passo-pontos', baixa)).toBe('display: none;');
    expect(bloco('.passo-icone', baixa)).toContain('width: 2.75em;');
    expect(bloco('.passo-ze', baixa)).toContain('margin-bottom: -1.25em;');
    // A folha cobre os pés do Zé: por cima dele.
    expect(bloco('.passo-folha', baixa)).toContain('z-index: 2;');
    expect(bloco('.passo-conteudo', baixa)).toContain('grid-template-columns: auto 1fr;');
  });

  it('Voltar e Seguir ficam lado a lado só quando cabem; a ordem visual muda, a de foco não', () => {
    const lado = dentroDe('@container chegada (max-height: 41em) and (min-width: 13em)');
    expect(lado).toContain(".chegada-tela[data-tela='passo'] .chegada-rodape {");
    expect(lado).toContain('grid-template-columns: auto minmax(max-content, 1fr);');
    expect(lado).toContain('order: 2;');
  });

  it('estreito (fonte ampliada num celular): some a cópia da barra de abas e o ícone vai para cima do título', () => {
    const estreito = dentroDe('@container chegada (max-width: 16em)');
    expect(bloco('.passo-abas', estreito)).toBe('display: none;');
    // Ao lado do ícone o nome do menu quebraria no meio da palavra ("Bibliotec/a").
    expect(bloco('.passo-conteudo', estreito)).toBe('grid-template-columns: 1fr;');
    expect(bloco('.passo-icone', estreito)).toContain('width: 2.25em;');
    expect(bloco('.passo-titulo', estreito)).toBe('font-size: 1.25em;');
  });

  it('muito apertado: a tela toda rola e o corpo deixa de rolar sozinho', () => {
    const apertado = dentroDe('@container chegada (max-height: 24em)');
    expect(bloco('.chegada-tela', apertado)).toBe('overflow-y: auto;');
    const corpo = bloco('.chegada-corpo', apertado);
    expect(corpo).toContain('flex: none;');
    expect(corpo).toContain('overflow: visible;');
  });

  it('o corpo rola por dentro, e o topo e o rodapé não encolhem', () => {
    const corpo = bloco('.chegada-corpo');
    expect(corpo).toContain('overflow-y: auto;');
    expect(corpo).toContain('min-height: 0;');
    expect(bloco('.chegada-topo')).toContain('flex: none;');
    expect(bloco('.chegada-rodape')).toContain('flex: none;');
  });
});

describe('o CSS da Chegada: o movimento (160 ms, o Calmo esmaece, o reduzido não anda)', () => {
  it('o passo sai por transição (opacidade e 12 px) e entra por animação, do lado oposto', () => {
    expect(bloco(".passo-conteudo[data-fase='saindo']")).toBe('opacity: 0;');
    expect(bloco(".passo-conteudo[data-fase='saindo'][data-sentido='avanca']")).toBe(
      'transform: translateX(-12px);',
    );
    expect(bloco(".passo-conteudo[data-fase='saindo'][data-sentido='volta']")).toBe(
      'transform: translateX(12px);',
    );
    const entrou = bloco(".passo-conteudo[data-fase='entrou']");
    expect(entrou).toContain('transition: none;');
    expect(entrou).toContain('animation: passo-entra-avanca 160ms');
    expect(bloco(".passo-conteudo[data-fase='entrou'][data-sentido='volta']")).toBe(
      'animation-name: passo-entra-volta;',
    );
    expect(bloco('@keyframes passo-entra-avanca')).toContain('transform: translateX(12px);');
    expect(bloco('@keyframes passo-entra-volta')).toContain('transform: translateX(-12px);');
  });

  it('o Calmo só esmaece: sem deslocamento ao sair nem ao entrar', () => {
    expect(bloco("html[data-perfil='calmo'] .passo-conteudo[data-fase='saindo']")).toBe(
      'transform: none;',
    );
    expect(bloco("html[data-perfil='calmo'] .passo-conteudo[data-fase='entrou']")).toBe(
      'animation-name: passo-entra-calmo;',
    );
    expect(bloco('@keyframes passo-entra-calmo')).not.toContain('transform');
  });

  it('só se anima com o movimento liberado: a troca de passo e a de tela ficam sob `no-preference`', () => {
    const liberado = [
      ...semComentarios.matchAll(/@media \(prefers-reduced-motion: no-preference\) \{/g),
    ];
    expect(liberado.length).toBeGreaterThanOrEqual(3);
    const todos = liberado.map((m) => interior(semComentarios, m.index)).join(' ');
    expect(todos).toContain('.chegada-tela {');
    expect(todos).toContain('.passo-conteudo {');
    expect(todos).toContain('.passo-traco {');
    // Nada infinito: a Chegada não pulsa (a luz da mão, que pisca, é do controle do Zé).
    expect(css).not.toMatch(/infinite/);
  });

  it('o traço sob a aba salta de aba em 200 ms; o Calmo salta na hora', () => {
    const todos = [
      ...semComentarios.matchAll(/@media \(prefers-reduced-motion: no-preference\) \{/g),
    ]
      .map((m) => interior(semComentarios, m.index))
      .join(' ');
    expect(todos).toContain('transition: transform 200ms');
    expect(todos).toContain("html[data-perfil='calmo'] .passo-traco { transition: none; }");
  });

  it('o ícone do passo: o brilho é o traço mais largo na cor do néon, aceso enquanto se desenha', () => {
    const brilho = bloco('.passo-icone .passo-neon');
    expect(brilho).toContain('stroke: var(--neon-cor);');
    expect(brilho).toContain('stroke-width: 4.2;');
    expect(brilho).toContain('opacity: var(--neon-op, var(--neon-repouso));');
    expect(bloco('.passo-icone[data-acesa]')).toBe('--neon-op: var(--neon-aceso);');
    expect(bloco('.passo-icone .passo-neon', dentroDe('@media (forced-colors: active)'))).toBe(
      'display: none;',
    );
  });
});

describe('o CSS da Chegada: o Começar não recebe o toque que sobrou do "Seguir"', () => {
  it('o rodapé do Começar fica sem toque por 400 ms e depois libera, também no movimento reduzido', () => {
    const rodape = bloco(".chegada-tela[data-tela='comecar'] .chegada-rodape");
    expect(rodape).toContain('animation: chegada-libera-toque 0s linear 400ms both;');
    const quadros = bloco('@keyframes chegada-libera-toque');
    expect(quadros).toContain('from { pointer-events: none; }');
    expect(quadros).toContain('to { pointer-events: auto; }');
    // Fora de qualquer consulta de movimento: quem pede menos movimento também dá toque duplo.
    const antes = semComentarios.slice(
      0,
      semComentarios.indexOf(".chegada-tela[data-tela='comecar'] .chegada-rodape"),
    );
    const abertas = (antes.match(/\{/g) ?? []).length - (antes.match(/\}/g) ?? []).length;
    expect(abertas).toBe(0);
  });
});

describe('o CSS da Chegada: o botão do Google (as cores são as das diretrizes dele)', () => {
  const claro = [
    '--g-fundo: #ffffff;',
    '--g-borda: #747775;',
    '--g-texto: #1f1f1f;',
    '--g-apoio: #444746;',
  ];
  const escuro = [
    '--g-fundo: #131314;',
    '--g-borda: #8e918f;',
    '--g-texto: #e3e3e3;',
    '--g-apoio: #c4c7c5;',
  ];

  it('claro de dia, escuro à noite, nos três blocos de tema (o do sistema e o forçado)', () => {
    const base = bloco('dialog.dialogo-chegada');
    for (const declaracao of claro) expect(base).toContain(declaracao);
    const sistema = bloco(
      ":root:not([data-tema='claro']) dialog.dialogo-chegada",
      dentroDe('@media (prefers-color-scheme: dark)'),
    );
    expect(sistema).toBe(escuro.join(' '));
    expect(bloco(":root[data-tema='escuro'] dialog.dialogo-chegada")).toBe(escuro.join(' '));
  });

  it('o botão lê só as variáveis do bloco: nada de cor solta', () => {
    const botao = bloco('dialog.dialogo-chegada .botao-google');
    expect(botao).toContain('background: var(--g-fundo);');
    expect(botao).toContain('border: 1px solid var(--g-borda);');
    expect(botao).toContain('color: var(--g-texto);');
    expect(botao).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    // A linha de baixo ("e ter sincronização automática") lê a cor de apoio do Google, que tem contraste nos dois mundos.
    expect(bloco('dialog.dialogo-chegada .botao-google .chegada-opcao-apoio')).toBe(
      'color: var(--g-apoio);',
    );
  });
});

describe('o CSS da Chegada: os dois botões de conta do Começar (Gabriel, 30/10)', () => {
  it('os dois levam a mesma regra, com o seletor do <dialog> na frente (o .botao do app tem a mesma especificidade)', () => {
    const opcao = bloco('dialog.dialogo-chegada .chegada-opcao');
    expect(opcao).toContain('flex-direction: column;');
    expect(opcao).toContain('min-height: 3.5rem;');
    // Sem a frente, o `.botao` global ganharia pela ordem do pacote: o espaço, o recuo e a altura sumiriam.
    expect(semComentarios).not.toMatch(/(^|[{}])\s*\.chegada-opcao\s*\{/);
  });

  it('a ação é a linha em negrito e a de baixo é texto comum, de no mínimo 14 px', () => {
    expect(bloco('.chegada-opcao-apoio')).toContain('font-size: 0.875rem;');
    expect(bloco('.chegada-opcao-apoio')).toContain('font-weight: 400;');
    expect(bloco('.chegada-opcao-apoio')).toContain('color: var(--texto-atenuado);');
    // O botão cheio (a única saída do Começar sem a conta) leva a cor do texto dele também embaixo.
    expect(bloco('.principal .chegada-opcao-apoio')).toBe('color: inherit;');
  });

  it('com a conta ligada a folha inteira rola e o corpo ocupa o que sobra (tela baixa e fonte ampliada)', () => {
    expect(bloco('.chegada-tela[data-conta]')).toContain('overflow-y: auto;');
    const corpo = bloco('.chegada-tela[data-conta] .chegada-corpo');
    expect(corpo).toContain('flex: 1 0 auto;');
    expect(corpo).toContain('overflow: visible;');
  });

  it('o aviso do aceite e a nota do convite são parágrafos separados, e a nota quebra equilibrada', () => {
    expect(bloco('.chegada-notas')).toContain('display: grid;');
    expect(bloco('.chegada-nota')).toContain('text-wrap: balance;');
  });
});

/** As regras sem regra dentro (de qualquer nível: dentro de `@media` e `@container` também). */
function regrasFolha(origem = semComentarios): Array<{ seletor: string; corpo: string }> {
  const regras: Array<{ seletor: string; corpo: string }> = [];
  let inicio = 0;
  for (let i = 0; i < origem.length; i += 1) {
    if (origem[i] === '{') {
      const fim = origem.indexOf('}', i);
      const meio = origem.slice(i + 1, fim);
      if (meio.includes('{')) {
        inicio = i + 1;
      } else {
        regras.push({
          seletor: origem.slice(inicio, i).replace(/\s+/g, ' ').trim(),
          corpo: meio.replace(/\s+/g, ' ').trim(),
        });
        i = fim;
        inicio = fim + 1;
      }
    } else if (origem[i] === '}') {
      inicio = i + 1;
    }
  }
  return regras;
}

describe('o CSS da Chegada: a saudação das Boas-vindas vai sempre inteira (D-D11)', () => {
  it('nenhuma regra do título e da frase os esconde, corta ou limita em linhas', () => {
    const doTexto = regrasFolha().filter(({ seletor }) =>
      /\.chegada-texto|\.chegada-titulo/.test(seletor),
    );
    // Acha as regras de verdade: o título, o texto, a frase e o título da tela baixa.
    expect(doTexto.map(({ seletor }) => seletor)).toEqual(
      expect.arrayContaining(['.chegada-titulo', '.chegada-texto h2', '.chegada-texto p']),
    );
    for (const { seletor, corpo } of doTexto) {
      expect(corpo, seletor).not.toMatch(
        /display:\s*none|visibility:\s*hidden|line-clamp|text-overflow|overflow(-[xy])?:\s*(hidden|clip)|max-height|max-block-size|clip-path|(^|;)\s*clip:/,
      );
    }
  });

  it('o título e a frase quebram equilibrados, a palavra comprida quebra em vez de vazar e a frase tem largura de leitura', () => {
    const titulo = bloco('.chegada-titulo');
    expect(titulo).toContain('text-wrap: balance;');
    expect(titulo).toContain('overflow-wrap: anywhere;');
    const frase = bloco('.chegada-texto p');
    expect(frase).toContain('max-width: 24em;');
    // Sem isso a frase de 31/10 deixava um "como!" sozinho na segunda linha, numa tela larga.
    expect(frase).toContain('text-wrap: balance;');
  });

  it('o corpo da tela rola por dentro: se a saudação não cabe, a tela rola antes de perder uma palavra', () => {
    expect(bloco('.chegada-corpo')).toContain('overflow-y: auto;');
    expect(bloco('.chegada-corpo')).toContain('min-height: 0;');
    // E o texto nunca fica fora dele: sem posição fixa nem absoluta no título e na frase.
    expect(bloco('.chegada-titulo')).not.toMatch(/position:/);
    expect(bloco('.chegada-texto p')).not.toMatch(/position:/);
  });
});

describe('o CSS da Chegada: a primeira vez, com a luz da Abertura a caminho (M3b)', () => {
  /** O corpo do primeiro `@media (prefers-reduced-motion: no-preference)` que contém `trecho`. */
  function liberado(trecho: string): string {
    const achado = [
      ...semComentarios.matchAll(/@media \(prefers-reduced-motion: no-preference\) \{/g),
    ]
      .map((m) => interior(semComentarios, m.index))
      .find((corpo) => corpo.includes(trecho));
    if (achado === undefined) throw new Error(`nenhum movimento liberado traz: ${trecho}`);
    return achado;
  }

  it('na espera o <dialog> é invisível e não pega toque, e o véu do fundo só vem quando a luz pousa', () => {
    expect(bloco('dialog.dialogo-chegada.dialogo-chegada-espera')).toBe(
      'opacity: 0; pointer-events: none;',
    );
    expect(bloco('dialog.dialogo-chegada.dialogo-chegada-espera::backdrop')).toBe(
      'background: transparent;',
    );
  });

  it('da espera à tela pronta ele esmaece em 200 ms; ao pousar a luz aparece na hora, e o véu vem em 360 ms', () => {
    const solto = liberado('dialogo-chegada-desenha');
    expect(bloco('dialog.dialogo-chegada', solto)).toBe(
      'transition: opacity 200ms cubic-bezier(0.2, 0.7, 0.2, 1);',
    );
    expect(bloco('dialog.dialogo-chegada.dialogo-chegada-desenha', solto)).toBe(
      'transition: none;',
    );
    expect(bloco('dialog.dialogo-chegada::backdrop', solto)).toBe(
      'transition: background-color 360ms ease;',
    );
  });

  it('o texto e o botão esperam o contorno chegar à metade e então sobem 6 px em 220 ms', () => {
    expect(semComentarios).toMatch(
      /\.chegada-tela\[data-entrada='espera'\] \.revela,\s*\.chegada-tela\[data-entrada='desenhar'\]:not\(\[data-revelado\]\) \.revela \{\s*opacity: 0;\s*transform: translateY\(6px\);\s*\}/,
    );
    const subida = bloco(".chegada-tela[data-entrada='desenhar'] .revela", liberado('.revela'));
    expect(subida).toContain('opacity 220ms cubic-bezier(0.2, 0.7, 0.2, 1)');
    expect(subida).toContain('transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1)');
  });

  it('escondidos, o texto e o botão não pegam toque (o "Vamos" invisível não leva ao passeio)', () => {
    expect(semComentarios).toMatch(
      /\.chegada-tela\[data-entrada='espera'\] \.revela,\s*\.chegada-tela\[data-entrada='desenhar'\]:not\(\[data-revelado\]\) \.revela \{\s*pointer-events: none;\s*\}/,
    );
  });

  it('o Calmo só esmaece; com movimento reduzido nada fica escondido: texto indispensável não depende de animação', () => {
    expect(bloco("html[data-perfil='calmo'] .chegada-tela[data-entrada] .revela")).toBe(
      'transform: none;',
    );
    const reduzido = dentroDe('@media (prefers-reduced-motion: reduce)');
    expect(bloco(':root .chegada-tela[data-entrada] .revela', reduzido)).toBe(
      'opacity: 1; transform: none;',
    );
  });
});
