# Tarefa: Acervo — itens como botão e avisos compactos
Índice: [`2026-10-16-ui-feedback-indice.md`](2026-10-16-ui-feedback-indice.md) (anotações 11, 12, 13, 16) · Nível **B** · Construtor: Antigravity · Revisor: Gemini
Branch: `claude/ui-a-acervo` · Base: `integracao` · PR para a `integracao` com auto-merge.
Regras comuns: `AGENTS.md`; skill `arretado-design-principles`; só tokens existentes de cor (nada de cor literal); alvos de 44 px; vocabulário obrigatório; nada obrigatório além do mínimo.

## Objetivo
A lista de `#/biblioteca/acervo` fica mais fácil de escolher e mais leve de ler.

## Escopo
Arquivos permitidos: `src/apresentacao/biblioteca/Acervo.tsx`, `Acervo.test.tsx`, `EscolherDisciplinas.tsx` (se o botão de disciplina morar lá), uma folha `src/apresentacao/biblioteca/estilos-acervo.css` (nova ou existente), `e2e/` do acervo.
Não alterar: `src/core/`, `src/dominios/`, `acervo/`, `public/acervo/`, `estilos.css`.

## O que fazer
1. **Item como botão (11).** Cada norma vira um botão de alternar (`<button aria-pressed>`) com o título e o tamanho; tocar no título escolhe ou desfaz. Escolhido: fundo mais cheio (token de destaque já existente) e um ícone ✓ antes do título, para o estado não depender só da cor. Sem a caixinha de marcar colada no texto. Teclado: Tab chega, Espaço/Enter alterna, foco visível.
2. **"Alterar disciplina" (12).** O botão "Mudar" passa a dizer "Alterar disciplina", em tamanho menor (variante compacta de botão, se existir; senão botão-texto), mantendo alvo de 44 px pela área de toque. `aria-label` continua dizendo de qual norma.
3. **"Disciplinas sugeridas:" (13)** no lugar de "Disciplina:".
4. **Avisos compactos (16).** Os avisos de cada norma (`i.avisos`) saem do bloco amarelo grande: uma linha pequena com ícone ⓘ e texto em tamanho de dica; quando há mais de um, vão juntos numa lista curta. O aviso de estado da página (`role="status"`, linha ~272) não muda.

## Critérios de aceite
- [ ] escolher e desfazer pelo título, com mouse, toque e teclado; o contador/ação de adicionar continua igual
- [ ] estado escolhido visível sem depender de cor (✓ + `aria-pressed`)
- [ ] "Alterar disciplina" e "Disciplinas sugeridas:" na tela; testes atualizados
- [ ] um item com 2 avisos ocupa no máximo ~2 linhas de dica a mais que um item sem aviso

## Verificação
`npm run check` verde · E2E da tela afetada verde, com axe nos 2 temas e nos 3 aparelhos · evidência: capturas antes/depois no relatório.

## Pare e pergunte se
- precisar de esquema, dependência nova, sync, sanitização, segurança, CI ou hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
