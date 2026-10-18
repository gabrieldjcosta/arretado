# Política de privacidade — versão 3

Versão que vale quando há conta (login). Escrita em 18/10/2026, com as contas da F4-A, antes de qualquer convidado entrar. Para quem usa sem conta, nada muda: continua valendo a versão 2, que fica como histórico ao lado ([`politica-de-privacidade-v2.md`](politica-de-privacidade-v2.md)).

Revisão por pessoa habilitada é recomendada antes de convidar quem não seja conhecido. Enquanto não houver revisão, o Arretado só convida pessoas conhecidas, com o aviso de versão de teste ([`termos-de-teste-v1.md`](termos-de-teste-v1.md)).

## Resumo

- Sem conta, nada muda em relação à versão 2: seus dados ficam neste Aparelho e nada sai dele.
- Com conta, sai do Aparelho só o essencial para manter a sua conta: o seu e-mail, os dados que o provedor de login informa e, se você pedir, uma cópia cifrada dos seus dados.
- Nada do seu estudo vai para o servidor, salvo dentro da cópia cifrada que você pedir.
- Na fase de teste, o cadastro é só por convite: e-mail não convidado não entra.
- Não perguntamos nem guardamos diagnóstico. Nenhum campo para isso existe, no Aparelho ou no servidor.
- Não há rastreadores nem estatísticas de uso.
- Você pode sair, exportar tudo e excluir a conta a qualquer momento. A exclusão é imediata e definitiva.

## Quem cuida dos seus dados

O responsável pelo tratamento (o "controlador") é o Gabriel, criador do Arretado. [A DEFINIR PELO GABRIEL: se o controlador é pessoa física ou empresa.]

O contato do encarregado (a pessoa que atende você sobre os seus dados): [A DEFINIR PELO GABRIEL: contato do encarregado.]

Operadores — empresas que tratam dados por conta do Arretado, cada uma só no que faz:

| Operador   | O que faz                                                              | Onde trata                  |
| --------- | ---------------------------------------------------------------------- | --------------------------- |
| Supabase  | Guarda o essencial da conta e as cópias cifradas da nuvem              | Projeto na região São Paulo |
| Cloudflare | Publica o app e busca a página da lei quando você importa por endereço | Rede global da Cloudflare   |
| Google    | Provedor de login, quando você entra com Google                        | Rede global do Google       |

## O que sai do Aparelho quando você entra

1. O seu e-mail.
2. Os dados que o provedor de login informa: com Google, o nome e a foto da sua conta Google. Isso não dá para impedir e o Supabase guarda junto com a conta.
3. Só quando você pedir, uma cópia cifrada dos seus dados (veja "Cópia cifrada na nuvem").

Nada mais. Erros, Cartões, Normas, grifos, notas, Revisões, Sessões e preferências ficam no Aparelho. O relato de Problema também fica no Aparelho nesta versão.

## Onde cada dado fica (servidor)

| Dado                                                            | Onde                                            | Por quê                   |
| --------------------------------------------------------------- | ----------------------------------------------- | ------------------------- |
| E-mail, provedor de login, nome e foto (se o Google informar)   | Conta do login no Supabase                      | Identificar a sua conta   |
| Versão dos termos aceitos e data do aceite; o que a conta pode usar | Seu perfil, que só você lê                  | Saber o que você aceitou  |
| E-mail convidado, data do convite e data de uso                 | Lista de convites, sem acesso pelo app          | Controlar quem entra no teste |
| Cópia cifrada dos seus dados                                    | Arquivos do Supabase Storage, pasta só sua     | A cópia que você pedir    |

As tabelas de registros de estudo e de alterações ficam vazias nesta versão: a sincronização automática entre Aparelhos ainda não existe.

## Cópia cifrada na nuvem

Você pede, o Arretado cifra e envia. A cifra acontece no Aparelho (AES-256-GCM, chave derivada da sua frase por PBKDF2): a frase nunca sai dele, e o servidor guarda bytes que não dizem nada sem a frase.

- Sem a frase, nem o Arretado abre a cópia. Perdeu a frase, perdeu a cópia — isso é dito antes de cifrar.
- São mantidas as 3 últimas cópias; as mais velhas saem.
- As cópias apagam junto com a conta.
- Para restaurar, o Arretado baixa, pede a frase, mostra uma prévia e cria um ponto de restauração antes de aplicar.

## Bases legais

- Consentimento: entrar com conta, aceitar os termos de teste e guardar cópia cifrada na nuvem.
- Execução do serviço: guardar o essencial para manter a sua conta funcionando (login, perfil, convite, cópia que você pediu).

Você pode revogar o consentimento: sair e excluir a conta (veja "Direitos do titular").

## Transferência para fora do Brasil

Os dados do servidor ficam na região São Paulo do Supabase. Duas exceções:

- Entrar com Google: o seu e-mail passa pelo Google, provedor global, e pode ser tratado fora do Brasil.
- Cloudflare: a publicação do app e a busca da página da lei usam a rede global dela.

Nenhum conteúdo de estudo sai do Aparelho nesses caminhos, salvo a cópia cifrada que você pedir, guardada no Supabase.

## Retenção e exclusão

- Os dados ficam enquanto a conta existir.
- Excluir a conta (Conta › Dados) apaga na hora, de forma definitiva: perfil, registros da conta, histórico e cópias da nuvem. Não há prazo de "arrependimento": isso é dito antes de confirmar, e a confirmação é digitada.
- Sair apaga os dados do Aparelho se você escolher "Apagar daqui" (recomendado em Aparelho emprestado).
- Os convites guardam o e-mail convidado e as datas enquanto durar o teste; saem quando o convite é apagado.
- Cópia do provedor: no plano gratuito atual, o Supabase não mantém cópias diárias próprias do banco. Se o plano mudar, as cópias do provedor passam a existir e expiram na janela dele; esta política dirá a janela real quando isso acontecer.
- O que você guarda fora do app (exportação e backups seus) é responsabilidade sua.

## Direitos do titular e como exercer

| Direito                              | Como no Arretado                                                         |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Confirmar que há tratamento         | Esta política e a tela Conta › Privacidade                               |
| Acesso e portabilidade             | "Exportar" em Conta › Dados (arquivo .arretado)                           |
| Correção                           | Editar o registro no app; o e-mail, trocar na conta do provedor de login |
| Eliminação                         | "Excluir conta" em Conta › Dados (imediata e definitiva)                 |
| Saber com quem os dados são tratados | Os operadores listados acima; ninguém mais recebe os seus dados        |
| Revogar o consentimento            | Sair e excluir a conta                                                    |
| Falar com o encarregado            | [A DEFINIR PELO GABRIEL: contato do encarregado.]                        |

## O que continua igual

- O Arretado funciona sem internet e sem conta; o estudo nunca depende de rede.
- "Usar sem conta" continua existindo.
- Texto colado de páginas externas é limpo antes de ser usado.
- Importar lei por endereço envia só o endereço, para a Cloudflare buscar a página no site de origem (Planalto ou ALESP).
- O relato de Problema leva a descrição, a tela, a versão do app e o Aparelho — nunca conteúdo de estudo.
- Não há rastreadores, estatísticas de uso nem propaganda.

## Versões e mudanças

Esta é a versão 3. Mudança que faça dado novo sair do Aparelho vem com aviso na tela antes de valer. A versão 2 fica como histórico ao lado. Termos do teste: [`termos-de-teste-v1.md`](termos-de-teste-v1.md). Texto da tela de entrada: [`consentimento-login-backup.md`](consentimento-login-backup.md).
