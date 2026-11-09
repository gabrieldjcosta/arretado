import { AREAS } from '../../areas';
import { LUGARES } from '../../fio/lugares';
import {
  BOAS_VINDAS,
  COMECAR,
  CONTA,
  CONTROLES,
  ENTRADA_DIRETA,
  PASSEIO_NA_CONTA,
  PASSOS,
  progressoDoPasso,
} from './passos';

/** Tudo o que os passos dizem, numa linha só. */
const textoDosPassos = PASSOS.flatMap((p) => [
  p.nome,
  p.frase,
  ...p.ferramentas.flatMap((f) => [f.destaque, f.apoio ?? '']),
  ...p.itens,
]).join(' ');

describe('os textos do Passeio (D-D10, contrato §7)', () => {
  it('são os do Gabriel, palavra por palavra', () => {
    expect(BOAS_VINDAS).toEqual({
      nome: 'Boas-vindas ao Arretado!',
      titulo: 'Rapadura é doce, mas não é mole.',
      frase: 'A gente quebra em pedaços pra você. Vou te mostrar como!',
      vamos: 'Vamos',
      agoraNao: 'Agora não',
    });
    expect(PASSOS.map((p) => [p.nome, p.frase, p.ferramentas, p.itens])).toEqual([
      [
        'Agora',
        'Aqui você vê o que fazer agora, sem agonia pra decidir.',
        [
          {
            destaque: 'Seus erros viram acertos e Cartões.',
            apoio: 'No botão +, traga a Frase correta pra lembrar depois.',
          },
        ],
        ['Leitura, Cartões e Frases ficam marcados como feitos quando você lê, revisa ou fixa.'],
      ],
      [
        'Destino',
        'Quanto da prova já é seu, com o edital em Pontos.',
        [{ destaque: 'Ciclos de estudo facilitados.', apoio: 'Você define os seus aqui.' }],
        [],
      ],
      [
        'Varal',
        'Suas normas, súmulas, Frases e Cartões.',
        [
          { destaque: 'Destaques automáticos contra pegadinhas.' },
          { destaque: 'Leis atualizadas e mapeadas.' },
          { destaque: 'Link entre leis e súmulas.' },
          { destaque: 'Transforme rapidamente um artigo em cartão.' },
        ],
        [],
      ],
    ]);
    expect(COMECAR).toEqual({ titulo: 'Vamo começar?' });
    expect(CONTA).toEqual({
      google: 'Entrar com o Google',
      googleApoio: 'e ter sincronização automática',
      semConta: 'Continuar sem conta',
      semContaApoio: 'e salvar meus dados manualmente',
      nota: 'Em fase de teste: por enquanto só e-mails convidados entram.',
    });
    expect(PASSEIO_NA_CONTA).toEqual({
      titulo: 'Passeio pelos menus',
      apoio: 'Os três lugares, um por vez, quando você quiser.',
      acao: 'Fazer o passeio',
    });
    expect(Object.values(CONTROLES)).toEqual([
      'Seguir',
      'Concluir',
      'Voltar',
      'Voltar às boas-vindas',
      'Voltar ao app',
      'Pular o passeio',
    ]);
  });

  it('um passo por lugar, com o nome da pílula do Fio e um ícone de linha cada', () => {
    expect(PASSOS).toHaveLength(LUGARES.length);
    PASSOS.forEach((passo, i) => {
      expect(passo.nome).toBe(LUGARES[i]?.nome);
      expect(passo.icone).toMatch(/^M[\d. -]/);
      expect(AREAS.map((a) => a.icone)).not.toContain(passo.icone);
    });
  });

  it('os passos não têm atalho para outra tela e não chamam Cartões de passo', () => {
    expect(textoDosPassos).not.toMatch(/https?:|#\/|href/);
    expect(PASSOS.map((p) => p.nome)).not.toContain('Cartões');
  });

  it('as seis ferramentas que o Gabriel pediu (03/11) estão em evidência, cada uma no seu menu', () => {
    const onde = (trecho: string) =>
      PASSOS.filter((p) => p.ferramentas.some((f) => f.destaque.includes(trecho))).map(
        (p) => p.nome,
      );
    expect(onde('erros viram acertos')).toEqual(['Agora']);
    expect(onde('Ciclos de estudo')).toEqual(['Destino']);
    expect(onde('artigo em cartão')).toEqual(['Varal']);
    expect(onde('Destaques automáticos')).toEqual(['Varal']);
    expect(onde('atualizadas e mapeadas')).toEqual(['Varal']);
    expect(onde('leis e súmulas')).toEqual(['Varal']);
    expect(PASSOS.flatMap((p) => p.ferramentas)).toHaveLength(6);
  });

  it('não promete o que o app não faz: sem "banca" (o destaque não olha a banca) e sem "grifo" (é a marca da pessoa)', () => {
    expect(textoDosPassos).not.toMatch(/banca|grifo/i);
  });

  it('o progresso conta de 1 e usa o total de passos', () => {
    expect(progressoDoPasso(0)).toBe('Passo 1 de 3');
    expect(progressoDoPasso(2)).toBe('Passo 3 de 3');
  });
});

/** O código sem os comentários: as frases podem ser citadas neles, nunca escritas na tela. */
const semComentarios = (codigo: string) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Os componentes do Passeio como texto (o `?raw` do Vite: src/ não tem os tipos do Node). */
const COMPONENTES = import.meta.glob<string>(
  ['./*.tsx', '!./*.test.tsx', '../Chegada.tsx', '../../conta/LinhaDoPasseio.tsx'],
  { query: '?raw', import: 'default', eager: true },
);

describe('uma fonte só: nenhum componente repete uma frase do Passeio', () => {
  const frases = [
    BOAS_VINDAS.nome,
    BOAS_VINDAS.titulo,
    BOAS_VINDAS.frase,
    COMECAR.titulo,
    ...Object.values(CONTA),
    ...Object.values(ENTRADA_DIRETA),
    PASSEIO_NA_CONTA.titulo,
    PASSEIO_NA_CONTA.apoio,
    PASSEIO_NA_CONTA.acao,
    ...PASSOS.flatMap((p) => [
      p.frase,
      ...p.ferramentas.flatMap((f) => [f.destaque, ...(f.apoio === undefined ? [] : [f.apoio])]),
      ...p.itens,
    ]),
    ...Object.values(CONTROLES),
  ]
    // As palavras soltas ("Seguir", "Voltar") moram em nomes de função, como `aoSeguir`: só as frases contam.
    .filter((frase) => frase.length >= 12);
  const componentes = Object.entries(COMPONENTES);

  it('há os oito componentes a conferir', () => {
    expect(componentes.map(([nome]) => nome).sort()).toEqual([
      '../../conta/LinhaDoPasseio.tsx',
      '../Chegada.tsx',
      './BoasVindas.tsx',
      './BotaoGoogle.tsx',
      './BotoesDaConta.tsx',
      './IconeDoPasso.tsx',
      './PassoDoPasseio.tsx',
      './TelaComecar.tsx',
    ]);
  });

  it.each(componentes)('%s lê os textos de passos.ts', (_nome, codigo) => {
    const repetidas = frases.filter((frase) => semComentarios(codigo).includes(frase));
    expect(repetidas).toEqual([]);
  });
});
