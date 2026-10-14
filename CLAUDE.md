# Arretado — instruções para o Claude Code

## O que é este repositório
Plataforma pessoal de preparação para concursos jurídicos (usuário principal: Gabriel, TDAH, banca FCC, Defensoria/SP).
**Direção de produto (09/10/2026):** o Arretado é a plataforma de estudo para quem tem dificuldade de concentração, pensada para, no futuro, ser cobrada e crescer; é um produto só, não dois. Regra de dados e de comunicação: diagnóstico (TDAH, autismo etc.) nunca é perguntado nem guardado e é orientação interna; a fala pública parte do comportamento ("dificuldade de concentração", "não sei por onde começar"), sem rótulo clínico nem promessa de tratamento. Plano único (fonte única; vale em divergência): `docs/planos/plano-mestre.md`; planos antigos em `docs/planos/arquivo/`.
Nome provisório "Arretado" (antes "Acumen"; "Acumen v2" = protótipo anterior em Firestore). Decisão de 23/09/2026: nada do Acervo nem do Acumen v2 é importado; conteúdo recomeça do zero.

## Estado
Especificação concluída; decisões técnicas em `docs/decisoes-tecnicas.md` (T1–T24); **F0 e F1 implementadas** (portões em `docs/portoes/`); **F2 em execução** (plano e andamento em `docs/planos/F2.md`). **Começar toda sessão por `docs/proxima-sessao.md`** (estado, próxima atividade e pendências).

Leitura sempre: `docs/proxima-sessao.md` e `README.md` (uma página). Ordem das etapas: `docs/planos/plano-mestre.md` (§9, próximas atividades; a fase da atividade, sob demanda). Leitura sob demanda, só a seção que a tarefa pede:
1. `docs/especificacao-parte1.md` §19 — decisões D1–D25 (não reabrir sem motivo explícito do Gabriel); §5 e §15 — modelo de dados e fases.
2. `docs/especificacao-parte2.md` §10.6 — Legislação (regras do estruturador, leitor, editor), ao tocar nesse módulo.
3. `docs/superpowers/specs/2026-10-10-acervo-sumulas-teses-design.md` e o plano ao lado (`plans/`) — só ao trabalhar no programa do acervo, das súmulas e das teses, ou na estrela discreta e no palco do foco.
4. `docs/planos/F2.md` — só a etapa em execução, os "Fatos das fontes" e a rotina de pronto, ao trabalhar na F2.
5. `docs/glossario.md` — vocabulário → identificadores de código, ao criar ou renomear entidade, evento, pasta ou termo.
6. `docs/solucao-de-problemas.md` — sintomas, causas e soluções conhecidas; consultar ao topar com falha, antes de investigar do zero.

## Economia de contexto (meta: cada sessão em até ~200 mil tokens)
- Uma sessão por atividade ou por pequeno grupo de atividades do plano. Ao fechar o bloco: atualizar `docs/proxima-sessao.md`, fazer o commit (se autorizado) e avisar o Gabriel para abrir sessão nova, em vez de seguir numa conversa longa.
- Nunca abrir inteiros os arquivos grandes: `corpus/normas/*.html` (MB cada), `package-lock.json`, relatórios do Playwright. Usar `git grep`, `head`, leitura por faixa de linhas ou um script Node que imprima só o necessário.
- Saída de comando longa vai para arquivo e é filtrada (`npm run check > saida.txt`, depois procurar as falhas), sem despejar tudo no contexto.
- Buscas amplas pelo código vão para um subagente, que devolve só a conclusão.

- Ao fechar uma atividade, avisar o Gabriel se a próxima exigir modelo acima do Sonnet 5.5 em esforço médio. Exigem: Frases 1 (esquema v6), 11.7, 10.4, planejamento e execução da F3/F4, `/code-review` das etapas 8, 9 e 11. Esforço alto no mesmo modelo: 11.9, 13.1, 12.2 se estourar. As demais cabem em Sonnet 5.5 médio.

## Passagem de bastão (ao parar, por limite ou por troca de sessão)
Registrar no fim de `docs/proxima-sessao.md` (ou no PR), separando "feito" de "verificado":
`Tarefa · Branch · Último commit · Alterações não commitadas · Feito · Verificado (com o comando) · Não verificado · Falha atual e como reproduzir · Próxima ação exata · Arquivos a ler · Decisões que não se reabrem`.
Quem retoma confere branch, commit e alterações locais antes de editar; se não bater com o resumo, para e avisa o Gabriel. Mesma falha duas vezes: parar de editar e diagnosticar. Risco alto (migração, reancoragem, sincronização, sanitização): revisão independente em outra sessão antes do merge.

## Regras de trabalho neste projeto
- Fases são sequenciais: F0 fundamentos → F1 Recall (MVP) → F2 Legislação → F3 Hoje/Plano → F4 sync. Não antecipar funcionalidade de fase posterior. Exceção decidida pelo Gabriel em 23/09/2026: a F2 roda em paralelo ao uso real da F1 (o portão da F1 continua sendo medido); o portão da F2 foi fechado em 13/10/2026 e a F3 está liberada; medições em uso real e testes com outras pessoas ficam na V1 (depois das contas), sem bloquear fase.
- Toda entrega de fase inclui o item de segurança/LGPD descrito na Parte 1 §15.
- Vocabulário obrigatório na interface e no código: Aparelho (equipamento), Problema (falha da plataforma), Erro (só estudo), Dispositivo (só unidade da lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- Nada obrigatório além do mínimo nos formulários; na captura de erro só a frase correta é obrigatória (D25; implementado nas Frases 1, esquema v6).
- Local-first: nenhuma funcionalidade pode depender de rede; o remoto (Supabase) é espelho.
- Nunca renderizar HTML colado sem sanitizar.
- Escolhas técnicas: seguir T1–T24 (`docs/decisoes-tecnicas.md`); nova escolha técnica relevante é decidida com o Gabriel e registrada lá.
- Definição de pronto: `npm run check` verde (lint, tipos, testes, auditoria); E2E verde quando houver tela; problemas encontrados (e os previsíveis da próxima etapa) registrados em `docs/solucao-de-problemas.md`; termo ou identificador novo registrado em `docs/glossario.md`.

## Git
Identidade global configurada (Gabriel Costa <gabrieldjcosta@gmail.com>). Remoto privado: https://github.com/gabrieldjcosta/arretado (origin, branch main). GitHub CLI autenticado como gabrieldjcosta.
Fluxo diário (decidido em 10/10/2026; detalhes em `docs/planos/fluxo-diario.md`): o Claude faz commit e push sozinho quando `npm run check` está verde (o hook bloqueia o commit se estiver vermelho), abre o PR de cada atividade para o branch `integracao` (não para o `main`) e liga o auto-merge nele (a `integracao` exige CI verde; método "Create a merge commit"; se recusado, mergeia à mão com o CI verde) (um merge por atividade, nunca squash). **O merge da `integracao` no `main` é só do Gabriel, uma vez por dia**; nunca push direto no `main` nem force push. Backup: branch `backup/AAAA-MM-DD` criado pelo hook no início do dia. Atividade independente sai da `integracao`; dependente de outra empilha sobre o branch dela. Ao fim de cada bloco de trabalho, ou perto do limite de uso, salvar com `git commit -m "wip: ..."` e push (pula o check); a rotina "Retomar Arretado" continua a atividade parada quando o limite reseta.

## Relacionado
Skill `acumen-extrair-normas` (extração de leis do Planalto/ALESP): base conceitual do estruturador da F2, só como lições (armadilhas já registradas em `docs/planos/F2.md`). O código dela (`extrair_lei.js`) não é usado nem copiado (Gabriel, 23/09/2026).
