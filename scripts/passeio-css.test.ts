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

describe('o CSS da Chegada: o botão do Google (as cores são as das diretrizes dele)', () => {
  const claro = ['--g-fundo: #ffffff;', '--g-borda: #747775;', '--g-texto: #1f1f1f;'];
  const escuro = ['--g-fundo: #131314;', '--g-borda: #8e918f;', '--g-texto: #e3e3e3;'];

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
  });
});
