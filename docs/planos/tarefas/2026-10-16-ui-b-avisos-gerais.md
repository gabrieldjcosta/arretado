# Tarefa: Acervo — tirar os avisos que só valem para o edital da DPE-SP
Índice: [`2026-10-16-ui-feedback-indice.md`](2026-10-16-ui-feedback-indice.md) (anotações 14 e 15) · Nível **C** · Construtor: DeepSeek ou OpenCode · Revisor: Claude (diff)
Branch: `claude/ui-b-avisos-gerais` · Base: `integracao` · PR para a `integracao` com auto-merge.

## Objetivo
O acervo serve a qualquer concurso. Avisos sobre o rótulo do edital da DPE-SP saem; avisos sobre o próprio texto da norma ficam.

## Escopo
Arquivos permitidos: `acervo/curadoria.json`, `scripts/acervo-curadoria-do-csv.mjs`, `public/acervo/indice.json` (só regenerado pelo script de construção do acervo, nunca editado à mão), testes de `scripts/acervo/` se algum contar avisos.
Não alterar: `src/`, `acervo/fontes/` (o CSV de origem fica como registro), textos das normas.

## O que fazer
1. Em `acervo/curadoria.json`, remover dos `avisos` todo texto que começa com "DIVERGÊNCIA" (6 hoje) e o "Conferir a norma indicada com o edital." (1 hoje). Contar antes e depois.
2. Em `scripts/acervo-curadoria-do-csv.mjs` (linhas ~46–48), parar de gerar esses dois tipos de aviso, para não voltarem na próxima geração.
3. Regenerar `public/acervo/indice.json` pelo comando do acervo (ver `package.json` / `scripts/acervo/construir.ts`).
Ficam (exemplos): "Transcrito à mão do PDF escaneado…", "Texto compilado do CNJ…", "Só a resolução, sem os formulários…", "Artigos 33 a 35 ausentes…", "Texto do Anexo…".

## Critérios de aceite
- [ ] `git grep -c "DIVERG" -- acervo/curadoria.json public/acervo/indice.json` = 0
- [ ] número total de avisos cai exatamente pelos removidos (relatório com antes/depois)
- [ ] nenhum outro campo do índice muda (diff do `indice.json` só em `avisos`)

## Verificação
`npm run check` verde · comando de construção do acervo sem erro · evidência: as contagens acima.

## Pare e pergunte se
- precisar de esquema, dependência nova, sync, sanitização, segurança, CI ou hooks
- precisar sair dos arquivos permitidos
- a mesma falha repetir duas vezes

## Relatório final
resumo · arquivos · comandos e resultado · capturas (2 temas) · riscos · SHA · link do PR
