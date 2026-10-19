# Texto de consentimento — tela de entrada e cópia na nuvem

Trecho pronto para a tela de login/backup (F4-A). Curto, sem culpa nem pressa: cinco linhas na primeira entrada, link para a política e a saída sempre visível.

## Primeira entrada (o que sai do Aparelho)

1. Ao entrar, o Arretado recebe o seu e-mail e os dados que o provedor de login informa (nome e foto, se você entrar com Google). Só isso sai do Aparelho.
2. Nada do seu estudo sai: Erros, Cartões, Normas, grifos e notas ficam neste Aparelho.
3. Só se você pedir, uma cópia cifrada dos seus dados vai para a nuvem. A frase de cifra fica só com você; sem ela, nem o Arretado abre a cópia.
4. Não perguntamos nem guardamos diagnóstico, e não há rastreadores nem estatísticas de uso.
5. Sair e apagar tudo ficam em Conta › Dados, a qualquer momento. A exclusão da conta é imediata e definitiva. Não quer entrar agora? Continue sem conta, como até agora.

Ler a política inteira: Conta › Privacidade (versão 3).
Botões: "Entrar" (aceito) · "Usar sem conta".

O aceite é registrado no Aparelho (política v3, com a data), assim que o banco da conta abre; o servidor guarda só o aceite dos termos de teste (`teste-1`), até a decisão sobre o aceite da v3 no servidor.

## Guardar cópia na nuvem (tela de backup)

A cópia sai do Aparelho já cifrada (AES-256-GCM), com uma frase que só você conhece. O servidor guarda bytes opacos: sem a frase, nem o Arretado abre a cópia. Perdeu a frase, perdeu a cópia — dito agora, sem jeito de recuperar.

São mantidas as 3 últimas cópias. Apagar a conta apaga as cópias.

Antes do primeiro envio a pessoa marca (caixa vazia por padrão) "Entendi e aceito…"; o aceite `v3:backup-nuvem` fica gravado no Aparelho e não é pedido de novo na mesma versão.

Botões: "Cifrar e guardar" · "Só exportar para o meu Aparelho".
