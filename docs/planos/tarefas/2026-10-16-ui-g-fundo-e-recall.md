# Tarefa: Fundo de areia com pontinhos e orientação no Recall
Índice: [`2026-10-16-ui-feedback-indice.md`](2026-10-16-ui-feedback-indice.md) (anotações 2 e 9) · Nível **B** · Construtor: Antigravity · Revisor: Gemini (muda o sistema visual)
Branch: `claude/ui-g-fundo-e-recall` · Base: `integracao` · PR para a `integracao` com auto-merge.
Regras comuns: `AGENTS.md`; skill `arretado-design-principles`; só tokens de cor (nada de cor literal); alvos de 44 px; vocabulário obrigatório; nada obrigatório além do mínimo.
**Antes de começar:** avisar a thread de UI (mexe em `estilos.css`).

## Objetivo
O fundo do app ganha textura de areia pontilhada sem atrapalhar a leitura; o Recall explica em uma frase para que serve.

## Escopo
Arquivos permitidos: `src/apresentacao/estilos.css` (tokens e fundo da página), `src/apresentacao/recall/RecallInicio.tsx` e teste, `docs/design/decisoes-design.md` (registrar a decisão), `docs/design/sistema-visual.md` (o token novo), `e2e/` visual, se houver.
Não alterar: `Shell.tsx`, `hoje/*`, `Drill.tsx`, Leitor.

## O que fazer
1. **Fundo (2).** Fundo da página cor de areia (token de superfície existente ou um novo derivado da paleta D-D4) com pontinhos finos: `radial-gradient` de um ponto de ~1 px num token de tinta com opacidade baixa, repetido a cada ~14–18 px. Só no fundo da página: cartões, Leitor, Drill e campos ficam lisos. Versão do tema escuro com o mesmo desenho. Com `prefers-contrast: more`, sem pontinhos. Registrar como decisão nova (D-D5) em `decisoes-design.md`.
2. **Orientação no Recall (9).** Ao lado do título (abaixo dele em tela estreita), em tom de dica: "Errou ou chutou uma questão? Registre a frase ou a alternativa certa. Assim você acerta da próxima vez." Se o pacote I (nomes do Recall) já estiver mesclado, usar os nomes novos.

## Critérios de aceite
- [ ] pontinhos visíveis no fundo e ausentes dentro de cartões e do Leitor (capturas nos 2 temas)
- [ ] axe sem violação de contraste nos 2 temas e nos 3 aparelhos
- [ ] orientação visível no início do Recall, sem empurrar a ação principal para fora da primeira tela no celular

## Verificação
`npm run check` verde · E2E da tela afetada verde, com axe nos 2 temas e nos 3 aparelhos · evidência: capturas antes/depois no relatório.

## Pare e pergunte se
- precisar de esquema, dependência nova, sync, sanitização, segurança, CI ou hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
