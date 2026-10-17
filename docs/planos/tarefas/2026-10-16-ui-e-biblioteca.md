# Tarefa: Biblioteca — normas por disciplina e começo conforme o plano
Índice: [`2026-10-16-ui-feedback-indice.md`](2026-10-16-ui-feedback-indice.md) (anotações 10 e 18) · Nível **B** · Construtor: Sonnet ou Antigravity · Revisor: Gemini
Branch: `claude/ui-e-biblioteca` · Base: `integracao` · PR para a `integracao` com auto-merge.
Regras comuns: `AGENTS.md`; skill `arretado-design-principles`; só tokens existentes de cor (nada de cor literal); alvos de 44 px; vocabulário obrigatório; nada obrigatório além do mínimo.

## Objetivo
A aba Normas (`#/biblioteca`) mostra as normas organizadas por disciplina, fáceis de achar, e o vazio oferece o começo que faz sentido para o plano da pessoa.

## Escopo
Arquivos permitidos: `src/apresentacao/biblioteca/Normas.tsx` e testes, `Biblioteca.test.tsx`, uma folha de estilo da biblioteca (nova ou existente), `e2e/` da biblioteca; leitura (sem alterar) de `src/dominios/plano/` e do índice do acervo.
Harmonizado com a D-D5 e a D-D6 (17/10/2026, `docs/design/decisoes-design.md`): ícones são SVG de um só traço (nunca glifos Unicode), a matéria é etiqueta Argila (nunca cor por disciplina nem faixa colorida na borda), botões e campos têm raio 14 e um só botão Sol por tela.
Não alterar: `Acervo.tsx` (pacote A), `src/core/`, `src/dominios/`, `acervo/`, `public/acervo/`.

## O que fazer
1. **Começo conforme o plano (10).** No vazio (linhas ~220 e ~412), o botão "Tudo do edital da DPE-SP" só aparece quando o edital do plano da pessoa (`editalId` dos Pontos/Disciplinas) tem normas vinculadas no índice do acervo, e com o nome desse edital ("Tudo do edital de <nome>"). Sem plano, com edital próprio (importado) ou com edital sem vínculo no acervo: mostrar só "Escolher no acervo" (o índice), "Importar norma" e, se a tela de importar já tiver os modos, atalhos para "Importar pelo link" e "Colar o texto". Não criar modo de importação novo.
2. **Lista por disciplina (18).** Com normas, agrupar por disciplina em seções retráteis (`<details>`, nome + contagem; abertas por padrão até 3 disciplinas, fechadas acima disso; estado aberto/fechado lembrado enquanto a página estiver aberta). Norma em mais de uma disciplina aparece em cada uma; sem disciplina vai para "Outras". O cabeçalho do grupo leva nome e contagem em neutro (`--superficie-2` ou `--quente`), **sem cor por disciplina e sem faixa colorida na borda** (D-D6); onde a linha da norma mostra a matéria, ela é a etiqueta Argila com texto Marinho. A seta do `<details>` é SVG.
3. **Buscar e filtrar.** Manter a busca "Buscar norma" (por título e título curto, sem acento) e acrescentar um filtro por disciplina (chips ou `select`). Busca ativa abre os grupos com resultado e mostra "N normas"; sem resultado, "Nenhuma norma com esse nome" e "Limpar busca".

## Critérios de aceite
- [ ] sem plano: nenhum botão de edital; com plano do edital DPE-SP: "Tudo do edital de …" (testes com os dois casos)
- [ ] normas agrupadas por disciplina, retráteis por teclado; o selo "Há versão nova" continua aparecendo
- [ ] busca e filtro combinam; limpar volta ao estado inicial
- [ ] Súmulas, Teses, Resumos e Precedentes não mudam

## Verificação
`npm run check` verde · E2E da tela afetada verde, com axe nos 2 temas e nos 3 aparelhos · evidência: capturas antes/depois no relatório.

## Pare e pergunte se
- precisar de esquema, dependência nova, sync, sanitização, segurança, CI ou hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
