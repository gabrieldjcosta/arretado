import { AREAS } from '../../areas';
import {
  BOAS_VINDAS,
  COMECAR,
  CONTROLES,
  ENTRADA_DIRETA,
  PASSEIO_NA_CONTA,
  PASSOS,
  progressoDoPasso,
} from './passos';

describe('os textos do Passeio (D-D10, contrato §7)', () => {
  it('são os do Gabriel, palavra por palavra', () => {
    expect(BOAS_VINDAS).toEqual({
      titulo: 'Boas-vindas ao Arretado!',
      frase: 'Bora conhecer a ferramenta que vai facilitar de verdade seus estudos?',
      vamos: 'Vamos',
      agoraNao: 'Agora não',
    });
    expect(PASSOS.map((p) => [p.nome, p.frase, p.itens])).toEqual([
      [
        'Hoje',
        'Aqui você vê o que tem pra fazer, sem agonia pra decidir.',
        [
          'No botão + você monta seu caderno de erros. Errou? Traga a Frase correta pra revisar e lembrar depois.',
          'Leitura, Cartões e Frases ficam marcados como feitos quando você lê, revisa ou fixa.',
        ],
      ],
      [
        'Trilha',
        'O edital em Pontos, montado pelo catálogo ou trazido por você.',
        ['Você também pode definir ciclos de estudo aqui na Trilha.'],
      ],
      [
        'Fixar',
        'Suas Frases e Cartões, com a Revisão de cada dia.',
        [
          'Gosta de cartões de revisão? Aqui você pode montar os seus para se testar.',
          'Dica: depois do passeio, faça cinco questões e registre o que precisa lembrar.',
        ],
      ],
      [
        'Biblioteca',
        'Onde ficam as normas pra ler e os seus resumos.',
        [
          'Termos-chave de cada lei já destacados pra você.',
          'Modo foco para ver só o artigo que está lendo.',
          'O Mapa da norma mostra o que mais cai e te guia pela leitura.',
        ],
      ],
    ]);
    expect(COMECAR).toEqual({
      titulo: 'Vamo começar?',
      google: 'Entrar com o Google',
      nota: 'Em fase de teste: por enquanto só e-mails convidados entram.',
      semConta: 'Experimentar sem conta e salvar seus dados manualmente',
    });
    expect(PASSEIO_NA_CONTA).toEqual({
      titulo: 'Passeio pelos menus',
      apoio: 'Os quatro menus, um por vez, quando você quiser.',
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

  it('um passo por menu, com o nome e o ícone da aba (a mesma fonte da navegação)', () => {
    expect(PASSOS).toHaveLength(AREAS.length);
    PASSOS.forEach((passo, i) => {
      expect(passo.nome).toBe(AREAS[i]?.nome);
      expect(passo.icone).toBe(AREAS[i]?.icone);
    });
  });

  it('os passos não têm atalho para outra tela e não chamam Cartões de passo', () => {
    const todos = PASSOS.flatMap((p) => [p.nome, p.frase, ...p.itens]).join(' ');
    expect(todos).not.toMatch(/https?:|#\/|href/);
    expect(PASSOS.map((p) => p.nome)).not.toContain('Cartões');
  });

  it('o progresso conta de 1 e usa o total de passos', () => {
    expect(progressoDoPasso(0)).toBe('Passo 1 de 4');
    expect(progressoDoPasso(3)).toBe('Passo 4 de 4');
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
    BOAS_VINDAS.titulo,
    BOAS_VINDAS.frase,
    COMECAR.titulo,
    COMECAR.nota,
    COMECAR.semConta,
    COMECAR.google,
    ...Object.values(ENTRADA_DIRETA),
    PASSEIO_NA_CONTA.titulo,
    PASSEIO_NA_CONTA.apoio,
    PASSEIO_NA_CONTA.acao,
    ...PASSOS.flatMap((p) => [p.frase, ...p.itens]),
    ...Object.values(CONTROLES),
  ]
    // As palavras soltas ("Seguir", "Voltar") moram em nomes de função, como `aoSeguir`: só as frases contam.
    .filter((frase) => frase.length >= 12);
  const componentes = Object.entries(COMPONENTES);

  it('há os sete componentes a conferir', () => {
    expect(componentes.map(([nome]) => nome).sort()).toEqual([
      '../../conta/LinhaDoPasseio.tsx',
      '../Chegada.tsx',
      './BoasVindas.tsx',
      './BotaoGoogle.tsx',
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
