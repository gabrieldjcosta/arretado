# Guia prático — como seguir (versão simples)

Atualizado em 09/10/2026. Detalhes e motivos: [`curso-de-acao.md`](curso-de-acao.md).

## O caminho em 6 passos

1. **Cara nova** — fatia 1 (cores, fontes).
2. **Casca nova** — fatia 2 (barra inferior, **+**, "Agora/Depois").
3. **Ler artigo por artigo** — 11.8.
4. **Revisar em 1 toque** — fatia 3 (cota de 10, dias dos últimos 7).
5. **Fechar a leitura e o acabamento** — 11.9 + fatia 4, depois fatia 5.
6. **Terminar a F2 e seguir** — reconferência, etapa 10, 11.7, 13, portão (2 semanas lendo lei) → F3 → testar com 3 a 5 pessoas → F4 → decidir se cobra.

Uma coisa em destaque por vez: o passo 1. Relato de problema do uso das férias fura a fila.

## Rotina de toda sessão com o Claude (barata e previsível)

1. Abra sessão **nova** no repositório. Uma atividade por sessão.
2. Cole: `Leia docs/proxima-sessao.md e execute a próxima atividade seguindo a rotina de pronto do plano. Ao terminar, atualize proxima-sessao.md e solucao-de-problemas.md e me avise. Não faça commit sem eu pedir.`
3. Ao fim, confira o resumo, peça "commit, push e PR", faça o merge no GitHub e **feche a sessão**.
4. Se algo travar, não insista na mesma sessão: peça ao Claude para registrar o ponto em `proxima-sessao.md` e abra outra.

## Dividindo o trabalho entre as IAs

| Ferramenta | Use para | Não use para |
|---|---|---|
| **Claude Code** | Escrever e alterar código, rodar `npm run check` e E2E, revisar o PR, decidir arquitetura | Pesquisa aberta, ler documentos longos, redigir textos de marketing, escolher entre opções de design |
| **Perplexity Pro** | Pesquisa com fontes: LGPD (dado sensível, termos de uso, política de privacidade), licença de fontes e pacotes, preços e concorrentes, regras do Planalto | Decisão final, código do projeto |
| **Gemini Pro** | Ler textos grandes (editais, leis, relatórios), rascunhar copy ("Você tem dificuldade de concentração?"), criticar capturas de tela, gerar variações de texto | Alterar o repositório, rodar testes |

**Como migrar sem dor: o repositório é a memória.** Nenhuma IA guarda estado; todas leem os mesmos arquivos.

- **Enviar contexto:** cole o bloco de [`../ia/briefing-externo.md`](../ia/briefing-externo.md) no início da conversa com o Gemini ou o Perplexity. Tem o que é o produto, as regras e o que não pode ser dito. Não cole backup, dados de estudo, chaves nem e-mail.
- **Trazer o resultado:** peça a resposta em até 1 página, com fontes, e salve em `docs/pesquisas/AAAA-MM-DD-assunto.md`. Na sessão do Claude, diga só: "Leia docs/pesquisas/<arquivo> e aplique à atividade X". O Claude lê 1 página em vez de pesquisar.
- **Decisão ou texto vindo de fora** só vira regra depois de registrada em `decisoes-tecnicas.md`, `curso-de-acao.md` ou `CLAUDE.md`.

## Onde cada ferramenta entra no caminho

| Passo | Fora do Claude (antes) | No Claude |
|---|---|---|
| 1 Cara nova | Perplexity: confirmar licença OFL de Atkinson Hyperlegible Next e Literata. Gemini: opinar sobre as capturas | Implementar e testar |
| 2–5 | Gemini: revisar textos de botões e mensagens (voz nova) | Código |
| 6 Antes de cobrar | Perplexity: LGPD e dado sensível, o que termos e política devem conter. Gemini: rascunho da copy pública | Só implementar o que for decidido; revisão de segurança |
| Validação | Gemini: ajudar a sintetizar as respostas das pessoas | Nada |

## Regras para gastar menos

- Sessões curtas, uma atividade, começando por `proxima-sessao.md`.
- Nunca peça ao Claude para "ler tudo" ou abrir `corpus/normas/*.html`, `package-lock.json` ou relatórios do Playwright.
- Pesquisa, comparação e redação ficam fora; o Claude entra para código, testes, revisão e decisões que mexem em dados.
- Peça respostas curtas e, no fim da sessão, o resumo de uma linha por mudança.
