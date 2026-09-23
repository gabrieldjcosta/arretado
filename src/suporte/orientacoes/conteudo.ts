/**
 * Orientações (D23): conteúdo estático, versionado com o app, em linguagem simples e com o
 * vocabulário canônico (D24). O "?" de cada tela aponta para uma destas seções.
 *
 * Critério de aceite (§17): alguém sem familiaridade consegue exportar e restaurar seguindo só isto.
 */
export interface SecaoDeOrientacao {
  id: string;
  titulo: string;
  paragrafos: string[];
}

export const VERSAO_DAS_ORIENTACOES = "1";

export const ORIENTACOES: SecaoDeOrientacao[] = [
  {
    id: "como-funciona",
    titulo: "Como o Arretado funciona",
    paragrafos: [
      "O Arretado guarda tudo neste aparelho. Ele não precisa de internet para funcionar: você pode estudar no ônibus, no avião ou com o telefone sem sinal.",
      "São quatro áreas. Hoje responde “o que faço agora?”. Plano mostra onde você está em relação ao edital e à prova. Recall guarda o que você erra e o que está revisando. Biblioteca guarda o conteúdo: normas, precedentes e notas.",
      "Conta e Ajustes fica fora dessas quatro áreas, no ícone ao lado delas. É lá que ficam a aparência, seus dados e estas orientações.",
    ],
  },
  {
    id: "seus-dados",
    titulo: "Cuidados com os seus dados",
    paragrafos: [
      "Como tudo fica neste aparelho, quem perde o aparelho perde os dados. Por isso exporte de vez em quando e guarde o arquivo em outro lugar.",
      "Em Conta e Ajustes › Dados, o botão “Exportar” cria um arquivo com tudo o que você registrou. Guarde-o onde quiser: pen drive, nuvem, e-mail para você mesmo.",
      "Se guardar o arquivo em serviço de outra empresa, marque “proteger com senha” ao exportar. Sem a senha ninguém abre o arquivo — nem você, nem o Arretado. Não existe recuperar senha.",
      "Para voltar os dados, use “Importar”. Antes de mudar qualquer coisa, o Arretado mostra uma prévia dizendo o que vai criar, atualizar e apagar, e guarda um ponto de restauração para você desfazer com um clique.",
      "Um arquivo editado fora do aplicativo não passa na conferência e não é restaurável. Isso é proposital: é o que garante que o arquivo chegou inteiro.",
    ],
  },
  {
    id: "exportar-e-restaurar",
    titulo: "Exportar e restaurar, passo a passo",
    paragrafos: [
      "Para exportar: abra Conta e Ajustes, vá em Dados, escolha se quer senha e toque em Exportar. O arquivo é salvo pelo navegador, como qualquer download.",
      "Para restaurar: abra Conta e Ajustes › Dados, toque em Importar e escolha o arquivo. Escolha o modo — se está recuperando tudo depois de perder o aparelho, use “Restaurar integral”.",
      "Leia a prévia antes de confirmar. Ela diz quantos itens serão criados, atualizados e apagados.",
      "Se algo sair diferente do esperado, use “Desfazer” logo abaixo, em Dados. O ponto de restauração fica guardado.",
    ],
  },
  {
    id: "seguranca-pessoal",
    titulo: "Segurança pessoal",
    paragrafos: [
      "O Arretado não pede senha para abrir. Quem pegar seu aparelho desbloqueado vê seus dados de estudo — use bloqueio de tela.",
      "Nada do que você escreve é enviado para fora deste aparelho. Quando a sincronização existir, você precisará entrar com uma conta e será avisado do que vai para o servidor.",
      "Ao relatar um problema pelo “!”, escreva só o que aconteceu. O relato não leva nada do seu estudo junto.",
    ],
  },
  {
    id: "vocabulario",
    titulo: "As palavras que o Arretado usa",
    paragrafos: [
      "Aparelho é o equipamento onde o app roda: seu computador, seu celular.",
      "Erro é sempre coisa de estudo: uma questão que você errou ou acertou sem certeza. Falha do próprio aplicativo chama-se Problema, e é isso que o “!” relata.",
      "Dispositivo é a unidade de uma norma: artigo, parágrafo, inciso, alínea. Nunca é o seu equipamento.",
      "Ponto é o item do edital. Dia e Sessão são o que você estudou. Cartão e Revisão são a repetição espaçada. Estrela marca o que mais cai na prova.",
    ],
  },
];

export const orientacao = (id: string): SecaoDeOrientacao | undefined =>
  ORIENTACOES.find((secao) => secao.id === id);
