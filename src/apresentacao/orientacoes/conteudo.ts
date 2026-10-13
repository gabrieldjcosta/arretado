// Orientações v1 (D23): conteúdo estático, versionado com o app, em linguagem simples e
// com o vocabulário canônico. O "?" de cada tela aponta para uma seção daqui.

export const VERSAO_ORIENTACOES = '1';

export interface Secao {
  id: string;
  titulo: string;
  paragrafos: string[];
}

export const SECOES: Secao[] = [
  {
    id: 'como-funciona',
    titulo: 'Como o Arretado funciona',
    paragrafos: [
      'O Arretado transforma erros, questões e leitura de lei em uma próxima ação de estudo. São quatro áreas: Hoje (o que fazer agora), Plano (onde você está no edital), Recall (seus erros e revisões) e Biblioteca (normas e demais conteúdos).',
      'As áreas ganham funções aos poucos, em fases. Nesta versão estão prontos o Recall (erros, cartões e revisões), a leitura e a importação de leis na Biblioteca, o backup e a restauração, as Orientações e o relato de problemas.',
      'Nada é obrigatório além do mínimo: você completa os detalhes quando quiser.',
    ],
  },
  {
    id: 'recall',
    titulo: 'Recall: erros, cartões e revisões',
    paragrafos: [
      'Registrar um erro leva um passo: escreva a frase correta, o certo em uma linha. Disciplina e ponto do edital são opcionais e ficam escolhidos para o registro seguinte. O botão "Registrar erro" está em todas as telas; no teclado, a tecla E também abre o registro.',
      'O resto é opcional, em "Mais detalhes" ou depois: se errou ou acertou sem certeza, o que foi, a causa, a convicção, a fonte da questão. Quando o texto dá pistas, o Arretado sugere uma causa — ela só vale quando você confirma.',
      'Se você escreveu o que foi, o Arretado pergunta se quer um cartão. O cartão nunca é criado sozinho. A frente é o que foi; o verso é a frase correta.',
      'Os cartões voltam em 1, 3, 7, 15, 30 e 60 dias. Na revisão, mostre a resposta e diga como foi: "Errei" volta ao começo, "Difícil" repete o intervalo, "Fácil" avança. No teclado: espaço mostra a resposta; 1, 2 e 3 respondem.',
      'Em "Frases" ficam todas as frases corretas, para uma leitura rápida em qualquer momento. Suspender um cartão tira ele da fila sem perder o progresso.',
    ],
  },
  {
    id: 'legislacao',
    titulo: 'Legislação: ler e estudar a lei',
    paragrafos: [
      'Em Biblioteca ficam as Normas. Abra uma Norma para lê-la por Dispositivo (artigo, parágrafo, inciso, alínea). O Arretado lembra até onde você leu.',
      'A Estrela marca um Dispositivo para voltar depois. Marcar um trecho do texto (grifo ou anotação) é opcional e fica só neste aparelho.',
      'Dentro da Norma, use a busca para achar um artigo ou uma palavra e o filtro para ver só o que importa (por exemplo, só os marcados com Estrela). Os botões A− e A+ mudam o tamanho do texto.',
      'Notas de vigência (revogado, redação dada por outra lei) aparecem à parte e podem ser mostradas ou escondidas. O texto anterior de um Dispositivo alterado continua disponível.',
      'Para registrar um Erro sobre um Dispositivo, use a ação dele: o vínculo fica guardado e o artigo mostra os Erros ligados a ele.',
      "Achou um erro de digitação no texto da lei? Use 'Corrigir o texto' no Dispositivo. A correção cria uma versão nova; o texto de antes fica guardado e dá para voltar a ele.",
      "As remissões ('art. 5º', 'nos termos do art. 121') viram link: toque para ver uma prévia sem sair da página.",
    ],
  },
  {
    id: 'importar-lei',
    titulo: 'Importar uma lei',
    paragrafos: [
      'Em Biblioteca › Importar há três caminhos: colar o texto da lei, informar o endereço (URL) do Planalto ou da ALESP, ou escrever do zero.',
      'Colar não envia nada a ninguém. Pelo endereço, só o endereço da lei é enviado para buscar a página (veja a política de privacidade).',
      'Antes de publicar, o Arretado mostra a estrutura encontrada, os avisos e o que ficou de fora. Nada vira Norma até você revisar e publicar; o rascunho fica guardado e pode ser retomado.',
      "Na revisão, confirme os Dispositivos que o Arretado marcou como 'a confirmar'. Dá para corrigir o texto, trocar o tipo, juntar com o de cima ou dividir. Tudo é salvo sozinho.",
      "Colar a mesma lei de novo não duplica: o Arretado reconhece a Norma e oferece atualizá-la. Seus Erros, Estrelas e marcações continuam ligados; o que não puder ser religado vai para 'Para reler'.",
      'Todo o conteúdo importado entra no backup (Conta › Dados).',
    ],
  },
  {
    id: 'pontos',
    titulo: 'Importar os pontos do edital',
    paragrafos: [
      'Em Plano, "Importar pontos do edital" lê uma planilha salva como CSV (no Excel ou no Google Planilhas: Arquivo › Salvar como / Fazer download › CSV).',
      'A primeira linha precisa ter as colunas Disciplina e Ponto. Opcionais: Faixa (Altíssima, Alta, Média ou Extra) e Código. Exemplo de linha: Execução Penal; 3; Progressão de regime; Alta.',
      'Importar a mesma planilha de novo não duplica nada: só entram os pontos novos. Como toda importação, dá para desfazer em Conta › Dados.',
      'Nesta fase os pontos servem para vincular erros. Mudar faixas e receber a sugestão do próximo ponto chegam com o Plano completo.',
    ],
  },
  {
    id: 'seus-dados',
    titulo: 'Onde ficam os seus dados',
    paragrafos: [
      'Tudo o que você registra fica guardado neste aparelho, no banco de dados do navegador. Nada é enviado para servidor algum nesta versão, e não há rastreadores nem estatísticas de uso.',
      'O Arretado funciona sem internet. Se a conexão cair, uma faixa discreta avisa, e tudo continua funcionando.',
      'Limpar os dados do navegador, desinstalar o navegador ou usar janela anônima apaga os dados deste aparelho. Por isso, faça backups.',
    ],
  },
  {
    id: 'backup',
    titulo: 'Backup e restauração',
    paragrafos: [
      'Em Conta › Dados, "Exportar" gera um arquivo .arretado com os seus dados. Guarde-o fora do aparelho (pen drive, e-mail para você mesmo, nuvem de sua confiança).',
      'Se for guardar o backup em nuvem de terceiros, marque "Proteger com senha". O Arretado não guarda a senha: sem ela, não há como abrir o arquivo.',
      'Para trazer dados de volta, use "Importar". Antes de qualquer alteração você vê uma prévia do que vai mudar, e o Arretado cria um ponto de restauração: se algo não sair como esperado, "Desfazer" volta ao estado anterior.',
      'Em aparelho novo ou depois de apagar tudo, escolha "Restaurar integral". Para dados de ferramentas antigas, prefira "Importar para espaço separado": você confere antes de misturar.',
      'Arquivos alterados fora do aplicativo não passam na validação e não podem ser importados. Use sempre o arquivo original.',
    ],
  },
  {
    id: 'privacidade',
    titulo: 'Privacidade e segurança (política v2)',
    paragrafos: [
      'Guardamos só o que você registra para estudar e as suas preferências. O relato de problema leva apenas a sua descrição, a tela, a versão do app e o aparelho — nunca conteúdo de estudo.',
      'Texto colado de páginas externas é limpo antes de ser usado: nenhum script ou formatação escondida é executado.',
      'Importar uma lei por endereço (URL) envia só o endereço da lei, para o servidor do Arretado na Cloudflare, que busca a página no site de origem (Planalto ou ALESP). Esses dois serviços podem registrar a chamada, como qualquer acesso a um site; nenhum dado de estudo sai do aparelho nessa busca. Só endereços do Planalto e da ALESP são aceitos, e o tamanho de cada importação é limitado.',
      'Colar a lei não envia nada a ninguém: a página é limpa e guardada só neste aparelho.',
      'Você pode exportar tudo e apagar tudo a qualquer momento em Conta › Dados.',
      'Quando existir login e sincronização (fase futura), esta política será atualizada e você será avisado antes de qualquer dado sair do aparelho.',
    ],
  },
  {
    id: 'seguranca-pessoal',
    titulo: 'Cuidados com seus dados',
    paragrafos: [
      'Faça backup com frequência, por exemplo uma vez por semana.',
      'Em computador compartilhado, use um perfil de navegador só seu.',
      'Guarde a senha do backup num lugar seguro. Sem ela o arquivo protegido não abre — nem por nós.',
    ],
  },
  {
    id: 'relatar-problema',
    titulo: 'Relatar um problema',
    paragrafos: [
      'O botão "!" abre o relato de problema: descreva em poucas palavras o que aconteceu. Um relato por dia.',
      'Nesta versão o relato fica guardado neste aparelho, aguardando envio. Ele será enviado quando a sincronização existir.',
    ],
  },
  {
    id: 'vocabulario',
    titulo: 'Palavras que o Arretado usa',
    paragrafos: [
      'Erro: um erro ou acerto inseguro seu, numa questão de estudo.',
      'Problema: uma falha do próprio Arretado (use o "!").',
      'Aparelho: o computador, tablet ou celular onde você usa o Arretado.',
      'Dispositivo: uma unidade da lei (artigo, parágrafo, inciso, alínea…).',
      'Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta: aparecem nas áreas à medida que as funções chegam.',
    ],
  },
];

/** Seção de ajuda contextual para cada tela (o "?"). */
export function secaoDeAjuda(caminho: string): string {
  if (caminho.startsWith('/conta/dados')) return 'backup';
  if (caminho.startsWith('/conta/privacidade')) return 'privacidade';
  if (caminho.startsWith('/conta')) return 'seus-dados';
  if (caminho.startsWith('/orientacoes')) return 'como-funciona';
  if (caminho.startsWith('/recall')) return 'recall';
  if (caminho.startsWith('/plano')) return 'pontos';
  if (caminho.startsWith('/biblioteca/importar')) return 'importar-lei';
  if (caminho.startsWith('/biblioteca')) return 'legislacao';
  return 'como-funciona';
}
