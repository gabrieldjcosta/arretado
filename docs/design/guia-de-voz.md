# Guia de voz regional — proposta (14/10/2026)

Gabriel aprovou a direção em 14/10/2026 ("Gostei"; pediu "danado" em recompensa e coisas pontuais). Os textos abaixo são propostas até a implementação.

## Regras

1. **Estrutura neutra:** áreas, Cartão, Revisão, Sessão, Erro, Norma, Ponto, Dia e todo o vocabulário obrigatório do `CLAUDE.md` não mudam.
2. **Sotaque só em momento leve:** começo, fim de rodada, retorno, pausa, estado vazio. Nunca em Problema, backup, privacidade, apagar dados, conflito de sincronização, erro de IA.
3. **No máximo uma expressão regional por tela**, curta e inteligível para quem é de fora.
4. **Recompensa só por conclusão, nunca por acerto, nem sequência.** Nunca depois de "Errei". Sem confete, sem som.
5. **Rotação:** cada frase aparece em cerca de 1 de 3 conclusões (o resto usa o texto neutro) para não virar ruído. Respeitar o perfil "Calmo" (desliga as variações).
6. Sem caricatura (nada de "oxente" repetido, nada de sotaque escrito).
7. Texto de tela fica em constantes num só lugar (`textos`), para trocar sem caçar no código.

## Frases propostas

| Momento | Neutro (padrão) | Com sotaque |
|---|---|---|
| Botão do cartão Agora | Começar | Bora |
| Fim de rodada de Revisão | Rodada feita. | Danado de bom! Rodada feita. |
| Fim da fila do dia | Nada pendente hoje. | Tá em dia, visse? |
| Fechar o Dia | Dia fechado. | Dia fechado, danado de bom. |
| Concluir leitura até o fim de uma Norma | Você chegou ao fim. | Leu até o fim, arretado! |
| Retorno depois de pausa | Que bom te ver de volta. Sem pressa. | Que bom te ver de volta. Sem pressa, viu? |
| Sessão pausada | Pausada. Sem pressa. | Pausada. Respire, a gente continua. |
| Estado vazio do Hoje | Nada pendente por aqui. | Nada pendente por aqui. Bora escolher um começo? |
| Primeiro Erro registrado | Primeiro Erro registrado. | Primeiro Erro guardado. Já é um passo. |

## Onde fica a recompensa (pontual)

- Fim de rodada do Drill e de Frases (com o mascote, único lugar fixo).
- Fechar o Dia.
- Fim de leitura de uma Norma.
- Primeiro Erro e primeira Revisão da vida do aparelho.

Em nenhum outro lugar. Revisão em andamento e leitor ficam sem recompensa, para não quebrar a atenção.

## Implementação (14/10/2026)

`src/apresentacao/voz.ts` guarda os textos e o sorteio (1 em 3; uma vez por tela; desligado quando o perfil de estudo é Calmo **ou ausente**, que é o padrão). Aplicado em: fim de rodada dos cartões e das frases ("Danado de bom! Rodada feita." no lugar de "Feito.") e "Dia fechado, danado de bom.". Ainda não aplicado: fim de leitura da Norma, primeiro Erro, estado vazio, "Bora", retorno e pausa (botões e títulos que testes e leitores de tela usam pelo nome entram numa fatia própria, junto do redesenho). Para ver o sotaque, escolha o perfil Guiado ou Leitura em Conta › Perfis.
