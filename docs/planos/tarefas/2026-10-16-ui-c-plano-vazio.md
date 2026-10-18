# Tarefa: Plano vazio convidativo, com prompt para IA e "colar o resultado"
Índice: [`2026-10-16-ui-feedback-indice.md`](2026-10-16-ui-feedback-indice.md) (anotações 3 e 4) · Nível **B** · Construtor: Antigravity · Revisor: Gemini
Branch: `claude/ui-c-plano-vazio` · Base: `integracao` · PR para a `integracao` com auto-merge.
Regras comuns: `AGENTS.md`; skill `arretado-design-principles`; só tokens existentes de cor (nada de cor literal); alvos de 44 px; vocabulário obrigatório; nada obrigatório além do mínimo.

## Objetivo
Quem chega no Plano sem pontos entende os dois caminhos e, sem saber montar planilha, consegue trazer o edital pela própria IA.

## Escopo
Arquivos permitidos: `src/apresentacao/plano/Plano.tsx`, `ImportarPontos.tsx`, os testes ao lado, uma folha de estilo do plano (nova ou existente), `e2e/` do plano.
Harmonizado com a D-D5 e a D-D6 (17/10/2026, `docs/design/decisoes-design.md`): ícones são SVG de um só traço (nunca glifos Unicode), a matéria é etiqueta Argila (nunca cor por disciplina nem faixa colorida na borda), botões e campos têm raio 14 e um só botão Sol por tela.
Não alterar: `src/integracoes/pontos/` (o leitor de CSV já aceita `;`, tab e `,`), `src/core/`, `src/dominios/`.

## O que fazer
1. **Espaço (3).** `section.cartao-bloco` de importar fica afastada do vazio de cima (margem do token de espaçamento médio ou maior).
2. **Texto do vazio (4).** Título e texto mais acolhedores, no tom do `docs/design/guia-de-voz.md`. Base: "Monte seu plano do seu jeito" / "Você pode importar as disciplinas e os pontos do seu edital ou montar o plano a partir do nosso catálogo de concursos." Dois caminhos lado a lado, com o mesmo peso visual, ambos botões secundários: "Montar pelo catálogo" (o link atual) e "Trazer meu edital" (rola até a importação). O botão Sol (um só na tela) fica na própria importação ("Ler o texto colado" e a confirmação da prévia). Na navegação, a tela é a Trilha depois da F2; aqui o rótulo de tela não muda.
3. **Orientação para IA.** Dentro da importação, um `<details>` "Não sabe montar a planilha?" com: "Copie o texto abaixo, cole na sua IA preferida junto com o conteúdo programático do edital e traga o resultado para cá." e o prompt num bloco de texto com botão "Copiar" (`navigator.clipboard`; se falhar, seleciona o texto). Prompt, literal:

```text
Transforme o conteúdo programático do edital abaixo numa tabela para eu importar numa plataforma de estudo.

Regras:
1. Use só o que está no texto do edital. Não invente, não resuma, não junte nem acrescente assuntos.
2. Uma linha por ponto do conteúdo programático. Se um ponto tiver subitens numerados (por exemplo 3.1, 3.2), cada subitem vira uma linha.
3. Três colunas, nesta ordem, separadas por ponto e vírgula: Disciplina;Ponto;Código
   - Disciplina: o nome da matéria como aparece no edital.
   - Ponto: o texto completo do assunto, sem a numeração.
   - Código: a numeração do edital (por exemplo 3.2); deixe vazio se não houver.
4. A primeira linha é o cabeçalho: Disciplina;Ponto;Código
5. Se algum texto tiver ponto e vírgula, coloque esse campo entre aspas duplas.
6. Se o edital tiver mais de um cargo, use só o conteúdo do cargo: [escreva aqui o seu cargo].
7. Responda só com a tabela, dentro de um bloco de código, sem comentário antes ou depois.

Conteúdo programático do edital:
[cole aqui]
```

4. **Colar o resultado.** Ao lado do "Arquivo CSV", um campo "Ou cole o resultado da IA" (`textarea`) e o botão "Ler o texto colado", que passa pelo mesmo `lerCsvPontos` e pela mesma prévia (`PreviaImportacao`) do arquivo. Antes de ler, tirar as cercas de bloco de código (linhas que começam com três crases) e espaços em volta. Erro de leitura usa a mesma mensagem do arquivo.

## Critérios de aceite
- [ ] colar o exemplo de resposta (fixture no teste, com cercas ```) leva à mesma prévia que o arquivo equivalente
- [ ] "Copiar" copia o prompt exato acima (teste compara o texto)
- [ ] o caminho por arquivo continua igual (testes existentes verdes)
- [ ] o vazio mostra os dois caminhos; nenhum campo obrigatório novo

## Verificação
`npm run check` verde · E2E da tela afetada verde, com axe nos 2 temas e nos 3 aparelhos · evidência: capturas antes/depois no relatório.

## Pare e pergunte se
- precisar de esquema, dependência nova, sync, sanitização, segurança, CI ou hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
