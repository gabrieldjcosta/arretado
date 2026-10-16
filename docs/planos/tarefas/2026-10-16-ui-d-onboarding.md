# Tarefa: Onboarding do plano — árvore bonita e acrescentar disciplina/assunto
Índice: [`2026-10-16-ui-feedback-indice.md`](2026-10-16-ui-feedback-indice.md) (anotações 5 e 6) · Nível **B** · Construtor: Sonnet · Revisor: Claude
Branch: `claude/ui-d-onboarding` · Base: `integracao` · PR para a `integracao` com auto-merge.
Regras comuns: `AGENTS.md`; skill `arretado-design-principles`; só tokens existentes de cor (nada de cor literal); alvos de 44 px; vocabulário obrigatório; nada obrigatório além do mínimo.

## Objetivo
No passo "Quais matérias entram no plano?" (`#/plano/onboarding`, 3 de 4), a lista deixa de parecer crua e a pessoa pode completar o que o catálogo não trouxe.

## Escopo
Arquivos permitidos: `src/apresentacao/plano/onboarding/*` (incl. `estilos-onboarding.css` e testes), `e2e/` do onboarding; em `src/dominios/catalogo/` ou `src/dominios/plano/`, só funções puras novas, se precisar, com teste.
Não alterar: `src/core/modelo/`, `src/core/persistencia/`, `src/integracoes/catalogo/` (o arquivo do catálogo).

## O que fazer
1. **Árvore (5).** Cada disciplina é um cartão: caixa de marcar + nome em cima; embaixo, o `<summary>` "Assuntos" com seta que gira ao abrir e a contagem num selo (`N de M` quando houver assunto desmarcado). Aberto, os assuntos ficam recuados com uma linha-guia à esquerda (o "galho"), cada um com sua caixa de marcar e o código do edital em tom de dica. Disciplina desmarcada esmaece o galho. Respeitar `prefers-reduced-motion` na seta.
2. **Acrescentar (6).** Dentro de cada disciplina aberta: "+ Acrescentar assunto" (campo de texto + "Acrescentar"; Enter confirma). No fim da lista: "+ Acrescentar disciplina" (nome; abre já com o campo de assunto). Itens acrescentados aparecem marcados, com um selo "seu" e um botão "Tirar". Vazio ou repetido (mesma `chave` sem acento) não entra, com aviso curto.
3. **Gravação.** Os itens acrescentados entram no mesmo caminho que hoje cria Disciplina e Ponto ao concluir o onboarding (descobrir onde; provavelmente `Passos.tsx` → função de montar o plano). Ponto acrescentado vai sem `codigo` e sem `faixa`, com o `editalId` do edital escolhido (ou nenhum, no caminho "Pular, não tenho edital"). Se isso exigir campo novo no modelo, **pare e pergunte**.

## Critérios de aceite
- [ ] acrescentar disciplina e assunto, concluir, e ver os dois no Plano (E2E)
- [ ] desmarcar assunto atualiza o selo `N de M`; desmarcar disciplina esmaece o galho
- [ ] teclado: abrir/fechar com Enter/Espaço, campos com rótulo, foco volta ao campo depois de acrescentar
- [ ] o fluxo atual sem acréscimos gera exatamente o mesmo plano (teste existente verde)

## Verificação
`npm run check` verde · E2E da tela afetada verde, com axe nos 2 temas e nos 3 aparelhos · evidência: capturas antes/depois no relatório.

## Pare e pergunte se
- precisar de esquema, dependência nova, sync, sanitização, segurança, CI ou hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
