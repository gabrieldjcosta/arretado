# Arretado — instruções para o Claude Code

## O que é este repositório
Plataforma pessoal de preparação para concursos jurídicos (usuário principal: Gabriel, TDAH, banca FCC, Defensoria/SP).
**Direção de produto (09/10/2026):** o Arretado é a plataforma de estudo para quem tem dificuldade de concentração, pensada para, no futuro, ser cobrada e crescer; é um produto só, não dois. Regra de dados e de comunicação: diagnóstico (TDAH, autismo etc.) nunca é perguntado nem guardado e é orientação interna; a fala pública parte do comportamento ("dificuldade de concentração", "não sei por onde começar"), sem rótulo clínico nem promessa de tratamento. Curso de ação único: `docs/planos/curso-de-acao.md`; guia simples de sessões e uso de outras IAs: `docs/planos/guia-pratico.md`.
Nome provisório "Arretado" (antes "Acumen"; "Acumen v2" = protótipo anterior em Firestore). Decisão de 23/09/2026: nada do Acervo nem do Acumen v2 é importado; conteúdo recomeça do zero.

## Estado
Especificação concluída; decisões técnicas em `docs/decisoes-tecnicas.md` (T1–T18); **F0 e F1 implementadas** (portões em `docs/portoes/`); **F2 em execução** (plano e andamento em `docs/planos/F2.md`). **Começar toda sessão por `docs/proxima-sessao.md`** (estado, próxima atividade e pendências).

Leitura sempre: `docs/proxima-sessao.md` e `README.md` (uma página). Ordem das etapas: `docs/planos/curso-de-acao.md` (só a tabela da linha do tempo). Leitura sob demanda, só a seção que a tarefa pede:
1. `docs/especificacao-parte1.md` §19 — decisões D1–D24 (não reabrir sem motivo explícito do Gabriel); §5 e §15 — modelo de dados e fases.
2. `docs/especificacao-parte2.md` §10.6 — Legislação (regras do estruturador, leitor, editor), ao tocar nesse módulo.
3. `docs/planos/F2.md` — só a etapa em execução, os "Fatos das fontes" e a rotina de pronto, ao trabalhar na F2.
4. `docs/glossario.md` — vocabulário → identificadores de código, ao criar ou renomear entidade, evento, pasta ou termo.
5. `docs/solucao-de-problemas.md` — sintomas, causas e soluções conhecidas; consultar ao topar com falha, antes de investigar do zero.

## Economia de contexto (meta: cada sessão em até ~200 mil tokens)
- Uma sessão por atividade ou por pequeno grupo de atividades do plano. Ao fechar o bloco: atualizar `docs/proxima-sessao.md`, fazer o commit (se autorizado) e avisar o Gabriel para abrir sessão nova, em vez de seguir numa conversa longa.
- Nunca abrir inteiros os arquivos grandes: `corpus/normas/*.html` (MB cada), `package-lock.json`, relatórios do Playwright. Usar `git grep`, `head`, leitura por faixa de linhas ou um script Node que imprima só o necessário.
- Saída de comando longa vai para arquivo e é filtrada (`npm run check > saida.txt`, depois procurar as falhas), sem despejar tudo no contexto.
- Buscas amplas pelo código vão para um subagente, que devolve só a conclusão.

- Ao fechar uma atividade, avisar o Gabriel se a próxima exigir modelo acima do Sonnet 5.5 em esforço médio. Exigem: 11.7, 10.4, planejamento e execução da F3/F4, `/code-review` das etapas 8, 9 e 11. Esforço alto no mesmo modelo: 11.9, 13.1, 12.2 se estourar. As demais cabem em Sonnet 5.5 médio.

## Regras de trabalho neste projeto
- Fases são sequenciais: F0 fundamentos → F1 Recall (MVP) → F2 Legislação → F3 Hoje/Plano → F4 sync. Não antecipar funcionalidade de fase posterior. Exceção decidida pelo Gabriel em 23/09/2026: a F2 roda em paralelo ao uso real da F1 (o portão da F1 continua sendo medido); a F3 só começa depois do portão da F2.
- Toda entrega de fase inclui o item de segurança/LGPD descrito na Parte 1 §15.
- Vocabulário obrigatório na interface e no código: Aparelho (equipamento), Problema (falha da plataforma), Erro (só estudo), Dispositivo (só unidade da lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- Nada obrigatório além do mínimo nos formulários; captura de erro tem exatamente 2 campos obrigatórios.
- Local-first: nenhuma funcionalidade pode depender de rede; o remoto (Supabase) é espelho.
- Nunca renderizar HTML colado sem sanitizar.
- Escolhas técnicas: seguir T1–T18 (`docs/decisoes-tecnicas.md`); nova escolha técnica relevante é decidida com o Gabriel e registrada lá.
- Definição de pronto: `npm run check` verde (lint, tipos, testes, auditoria); E2E verde quando houver tela; problemas encontrados (e os previsíveis da próxima etapa) registrados em `docs/solucao-de-problemas.md`; termo ou identificador novo registrado em `docs/glossario.md`.

## Git
Identidade global configurada (Gabriel Costa <gabrieldjcosta@gmail.com>). Remoto privado: https://github.com/gabrieldjcosta/arretado (origin, branch main). GitHub CLI autenticado como gabrieldjcosta.
Commits só quando o Gabriel pedir; push logo após cada commit aprovado. O trabalho de cada etapa vai num branch com PR para o `main`, e o merge é do Gabriel. Enquanto houver PR empilhado sobre outro, o merge é por "Create a merge commit", nunca squash.

## Relacionado
Skill `acumen-extrair-normas` (extração de leis do Planalto/ALESP): base conceitual do estruturador da F2, só como lições (armadilhas já registradas em `docs/planos/F2.md`). O código dela (`extrair_lei.js`) não é usado nem copiado (Gabriel, 23/09/2026).
