# Política de privacidade — versão 4 (RASCUNHO)

**Rascunho de trabalho (B4 da F4-B, 25/10/2026).** Os `[A DEFINIR PELO GABRIEL]` e a revisão por pessoa habilitada são do Gabriel. Esta versão só passa a valer quando for publicada; até lá, com conta vale a versão 3 ([`politica-de-privacidade-v3.md`](politica-de-privacidade-v3.md)) e a sincronização entre Aparelhos fica atrás do aceite `v4:sincronizar`, que só pode ser pedido a pessoas conhecidas, com o aviso de teste. **Nenhum `main` pode sair com o envio ligado antes de esta versão estar publicada** (plano F4-B, §13b e §15).

O que muda da versão 3: com a sincronização ligada, os dados de estudo passam a ser guardados na conta. O resto (operadores, direitos, exclusão) fica como na versão 3; o texto abaixo repete só as seções que mudam.

## Resumo

- Sem conta, nada muda: seus dados ficam neste Aparelho.
- Com conta e a sincronização ligada, o que você estuda **é guardado na sua conta no servidor** e aparece em todos os seus Aparelhos: Erros, Cartões, Normas, grifos, notas, Revisões, Sessões, Dias e preferências de estudo.
- Esses dados ficam **legíveis só por você** (regras de acesso no banco impedem que outra conta os veja). Por não serem cifrados com uma frase sua, **a equipe que administra o serviço consegue tecnicamente lê-los**; só acessamos para manter o serviço e quando você pedir ajuda. [A DEFINIR PELO GABRIEL: quem administra, em que situações acessa, como fica registrado.]
- Não pedimos nem guardamos diagnóstico. **Não escreva dados de saúde nas suas notas**: elas vão para o servidor.
- A sincronização é um aceite à parte, dado em Conta › Sincronização. Quem não liga continua com a conta como na versão 3 (login e cópia cifrada).
- Você escolhe: sem conta, nada sai. Pode sair a qualquer momento e excluir a conta; a exclusão apaga na hora, de forma definitiva, tudo o que está na conta.

## O que sai do Aparelho com a sincronização ligada

1. O que já saía na versão 3 (e-mail, dados do provedor de login, cópia cifrada quando você pede).
2. Cada mudança nos seus dados de estudo, conforme você faz: Erros, Cartões, Normas e seus Dispositivos, grifos, notas, Revisões, Sessões, Dias, pontos do plano e preferências de estudo.
3. **Não sobem:** o conteúdo das leis, súmulas e teses do acervo (só a referência: qual norma, qual versão); tema, letra, régua de leitura e demais ajustes de aparência (ficam em cada Aparelho); os pontos de restauração; os consentimentos (são de cada Aparelho).
4. Anexos (arquivos que você junta a um Erro ou nota): entram numa etapa seguinte, com limite de 10 MB por arquivo; esta política será atualizada quando isso existir.

## Onde cada dado fica (servidor)

| Dado | Onde | Quem lê | Por quanto tempo |
| --- | --- | --- | --- |
| Estado atual de cada registro de estudo | Tabela `registros`, uma linha por registro | Só a sua conta (regra de acesso no banco) | Enquanto a conta existir |
| Cada mudança enviada por um Aparelho | Tabela `alteracoes` (o log) | Só a sua conta | 30 dias depois de todos os seus Aparelhos a receberem |
| Qual Aparelho está editando agora | Tabela `posse_aparelho` | Só a sua conta | Enquanto a conta existir |
| Até onde cada Aparelho já recebeu | Tabela `aparelhos_sync` | Só a sua conta | Aparelho parado há 90 dias sai da lista |
| Versão desta política aceita para sincronizar e a data | Seu perfil | Só você | Enquanto a conta existir |

## Cópia cifrada na nuvem

Continua existindo como **cópia extra opcional**, só com a sua frase. **Ela não é necessária para sincronizar**: a sincronização usa as tabelas acima, legíveis só pela sua conta, sem frase.

## Cópias do provedor

No plano gratuito atual o Supabase não mantém cópias diárias próprias do banco. Se o plano mudar para o Pro, o provedor passa a fazer cópia diária; ao excluir a conta, o dado some do banco na hora e das cópias do provedor em até [CONFERIR: janela de retenção do Supabase Pro, hoje 7 dias].

## Bases legais

- Consentimento: ligar a sincronização (aceite específico, separado do aceite do login).
- Execução do serviço: guardar os registros e o log enquanto a sincronização estiver ligada.

Você revoga o consentimento saindo da conta ou excluindo-a (Conta › Dados).

## Aparelho emprestado

"Sair e apagar daqui" apaga os dados deste Aparelho; os dados continuam na conta e voltam quando você entrar em outro Aparelho.

## O que continua igual

- O Arretado funciona sem internet: sem rede, você estuda como sempre e o envio espera a rede.
- Nada do que vem do servidor vira HTML sem limpeza; o texto colado continua passando pelo sanitizador.
- Sem rastreadores, sem estatísticas de uso, sem venda de dados e **sem treino de inteligência artificial com os seus dados** (não existe IA no servidor).

## Versões e mudanças

Esta é a versão 4 (rascunho). A versão 3 fica como histórico ao lado. Termos do teste: a versão 2 dos termos ([`termos-de-teste-v1.md`](termos-de-teste-v1.md) é a atual; a v2 troca a linha "Seus dados de estudo ficam no seu Aparelho. Não há sincronização" por "os dados ficam no Aparelho e na sua conta quando a sincronização estiver ligada; é uma função de teste, pode falhar; guarde uma cópia mesmo assim"). Texto da tela que liga a sincronização: `src/apresentacao/sincronizacao/Sincronizacao.tsx` (`O_QUE_MUDA`).
