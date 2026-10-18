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
      'Os cartões voltam em 1, 3, 7, 15, 30 e 60 dias. Na revisão, mostre a resposta e diga como foi: "De novo" volta ao começo, "Difícil" repete o intervalo, "Fácil" avança. No teclado: espaço mostra a resposta; 1, 2 e 3 respondem.',
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
    id: 'conta-e-privacidade',
    titulo: 'Conta e política de privacidade v3',
    paragrafos: [
      'A conta é opcional: dá para usar tudo sem entrar. Quando você entra com uma conta, passa a valer a política de privacidade v3, no lugar da v2.',
      'Ao entrar, só o seu e-mail e os dados que o provedor de login informa (nome e foto) saem do Aparelho. Nada do seu estudo sai, salvo a cópia cifrada que você pedir.',
      'O servidor (Supabase, região de São Paulo) guarda só o essencial da conta e, se houver, as cópias cifradas da nuvem. A frase de cifra fica só com você: sem ela, nem o Arretado abre a cópia.',
      'Sair, trocar de conta e excluir tudo ficam em Conta › Dados. A exclusão da conta é imediata e definitiva. Não perguntamos nem guardamos diagnóstico; não há rastreadores nem estatísticas de uso.',
      'Leia a política v3 inteira em Conta › Privacidade.',
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

/**
 * Política de privacidade v3 (vale com conta). Espelha docs/politica/politica-de-privacidade-v3.md;
 * as tabelas viram uma linha por item. Os marcadores [A DEFINIR PELO GABRIEL] ficam visíveis até
 * ele definir controlador e contato — não preencher aqui por conta própria.
 */
export const POLITICA_V3: Secao[] = [
  {
    id: 'v3-resumo',
    titulo: 'Resumo',
    paragrafos: [
      'Sem conta, nada muda em relação à versão 2: seus dados ficam neste Aparelho e nada sai dele.',
      'Com conta, sai do Aparelho só o essencial para manter a sua conta: o seu e-mail, os dados que o provedor de login informa e, se você pedir, uma cópia cifrada dos seus dados.',
      'Nada do seu estudo vai para o servidor, salvo dentro da cópia cifrada que você pedir.',
      'Na fase de teste, o cadastro é só por convite: e-mail não convidado não entra.',
      'Não perguntamos nem guardamos diagnóstico. Nenhum campo para isso existe, no Aparelho ou no servidor.',
      'Não há rastreadores nem estatísticas de uso.',
      'Você pode sair, exportar tudo e excluir a conta a qualquer momento. A exclusão é imediata e definitiva.',
    ],
  },
  {
    id: 'v3-quem-cuida',
    titulo: 'Quem cuida dos seus dados',
    paragrafos: [
      'O responsável pelo tratamento (o "controlador") é o Gabriel, criador do Arretado. [A DEFINIR PELO GABRIEL: se o controlador é pessoa física ou empresa.]',
      'O contato do encarregado (a pessoa que atende você sobre os seus dados): [A DEFINIR PELO GABRIEL: contato do encarregado.]',
      'Operadores — empresas que tratam dados por conta do Arretado, cada uma só no que faz:',
      'Supabase: guarda o essencial da conta e as cópias cifradas da nuvem, em projeto na região São Paulo.',
      'Cloudflare: publica o app e busca a página da lei quando você importa por endereço, na rede global dela.',
      'Google: provedor de login, quando você entra com Google, na rede global dele.',
    ],
  },
  {
    id: 'v3-o-que-sai',
    titulo: 'O que sai do Aparelho quando você entra',
    paragrafos: [
      '1. O seu e-mail.',
      '2. Os dados que o provedor de login informa: com Google, o nome e a foto da sua conta Google. Isso não dá para impedir e o Supabase guarda junto com a conta.',
      '3. Só quando você pedir, uma cópia cifrada dos seus dados (veja "Cópia cifrada na nuvem").',
      'Nada mais. Erros, Cartões, Normas, grifos, notas, Revisões, Sessões e preferências ficam no Aparelho. O relato de Problema também fica no Aparelho nesta versão.',
    ],
  },
  {
    id: 'v3-onde-fica',
    titulo: 'Onde cada dado fica (servidor)',
    paragrafos: [
      'E-mail, provedor de login, nome e foto (se o Google informar): na conta do login no Supabase, para identificar a sua conta.',
      'Versão dos termos aceitos e data do aceite; o que a conta pode usar: no seu perfil, que só você lê, para saber o que você aceitou.',
      'E-mail convidado, data do convite e data de uso: na lista de convites, sem acesso pelo app, para controlar quem entra no teste.',
      'Cópia cifrada dos seus dados: em arquivos do Supabase Storage, em pasta só sua, a cópia que você pedir.',
      'As tabelas de registros de estudo e de alterações ficam vazias nesta versão: a sincronização automática entre Aparelhos ainda não existe.',
    ],
  },
  {
    id: 'v3-copia-cifrada',
    titulo: 'Cópia cifrada na nuvem',
    paragrafos: [
      'Você pede, o Arretado cifra e envia. A cifra acontece no Aparelho (AES-256-GCM, chave derivada da sua frase por PBKDF2): a frase nunca sai dele, e o servidor guarda bytes que não dizem nada sem a frase.',
      'Sem a frase, nem o Arretado abre a cópia. Perdeu a frase, perdeu a cópia — isso é dito antes de cifrar.',
      'São mantidas as 3 últimas cópias; as mais velhas saem. As cópias apagam junto com a conta.',
      'Para restaurar, o Arretado baixa, pede a frase, mostra uma prévia e cria um ponto de restauração antes de aplicar.',
    ],
  },
  {
    id: 'v3-bases-legais',
    titulo: 'Bases legais',
    paragrafos: [
      'Consentimento: entrar com conta, aceitar os termos de teste e guardar cópia cifrada na nuvem.',
      'Execução do serviço: guardar o essencial para manter a sua conta funcionando (login, perfil, convite, cópia que você pediu).',
      'Você pode revogar o consentimento: sair e excluir a conta (veja "Direitos do titular").',
    ],
  },
  {
    id: 'v3-fora-do-brasil',
    titulo: 'Transferência para fora do Brasil',
    paragrafos: [
      'Os dados do servidor ficam na região São Paulo do Supabase. Duas exceções: ao entrar com Google, o seu e-mail passa pelo Google, provedor global, e pode ser tratado fora do Brasil; e a Cloudflare usa a rede global dela para publicar o app e buscar a página da lei.',
      'Nenhum conteúdo de estudo sai do Aparelho nesses caminhos, salvo a cópia cifrada que você pedir, guardada no Supabase.',
    ],
  },
  {
    id: 'v3-retencao',
    titulo: 'Retenção e exclusão',
    paragrafos: [
      'Os dados ficam enquanto a conta existir.',
      'Excluir a conta (Conta › Dados) apaga na hora, de forma definitiva: perfil, registros da conta, histórico e cópias da nuvem. Não há prazo de "arrependimento": isso é dito antes de confirmar, e a confirmação é digitada.',
      'Sair apaga os dados do Aparelho se você escolher "Apagar daqui" (recomendado em Aparelho emprestado).',
      'Os convites guardam o e-mail convidado e as datas enquanto durar o teste; saem quando o convite é apagado.',
      'Cópia do provedor: no plano gratuito atual, o Supabase não mantém cópias diárias próprias do banco. Se o plano mudar, as cópias do provedor passam a existir e expiram na janela dele; esta política dirá a janela real quando isso acontecer.',
      'O que você guarda fora do app (exportação e backups seus) é responsabilidade sua.',
    ],
  },
  {
    id: 'v3-direitos',
    titulo: 'Direitos do titular e como exercer',
    paragrafos: [
      'Confirmar que há tratamento: esta política e a tela Conta › Privacidade.',
      'Acesso e portabilidade: "Exportar" em Conta › Dados (arquivo .arretado).',
      'Correção: editar o registro no app; o e-mail, trocar na conta do provedor de login.',
      'Eliminação: "Excluir conta" em Conta › Dados (imediata e definitiva).',
      'Saber com quem os dados são tratados: os operadores listados acima; ninguém mais recebe os seus dados.',
      'Revogar o consentimento: sair e excluir a conta.',
      'Falar com o encarregado: [A DEFINIR PELO GABRIEL: contato do encarregado.]',
    ],
  },
  {
    id: 'v3-continua-igual',
    titulo: 'O que continua igual',
    paragrafos: [
      'O Arretado funciona sem internet e sem conta; o estudo nunca depende de rede. "Usar sem conta" continua existindo.',
      'Texto colado de páginas externas é limpo antes de ser usado.',
      'Importar lei por endereço envia só o endereço, para a Cloudflare buscar a página no site de origem (Planalto ou ALESP).',
      'O relato de Problema leva a descrição, a tela, a versão do app e o Aparelho — nunca conteúdo de estudo.',
      'Não há rastreadores, estatísticas de uso nem propaganda.',
    ],
  },
  {
    id: 'v3-versoes',
    titulo: 'Versões e mudanças',
    paragrafos: [
      'Esta é a versão 3. Mudança que faça dado novo sair do Aparelho vem com aviso na tela antes de valer. A versão 2, que vale para quem usa sem conta, fica logo abaixo como versão anterior.',
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
