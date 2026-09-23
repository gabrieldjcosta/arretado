# Arretado — instruções para o Claude Code

## O que é este repositório
Plataforma pessoal de preparação para concursos jurídicos (usuário principal: Gabriel, TDAH, banca FCC, Defensoria/SP).
Nome provisório "Arretado" (antes "Acumen"; "Acumen v2" = protótipo anterior em Firestore). Decisão de 23/09/2026: nada do Acervo nem do Acumen v2 é importado; conteúdo recomeça do zero.

## Estado
Especificação concluída; decisões técnicas em `docs/decisoes-tecnicas.md` (T1–T17); **F0 e F1 implementadas** (portões em `docs/portoes/`); **F2 planejada** (`docs/planos/F2.md`). **Começar toda sessão por `docs/proxima-sessao.md`** (estado, pendências e armadilhas).. Antes de qualquer implementação, ler:
1. `README.md` — contexto em uma página.
2. `docs/especificacao-parte1.md` §19 — decisões D1–D24 (não reabrir sem motivo explícito do Gabriel).
3. `docs/especificacao-parte1.md` §5 e §15 — modelo de dados e fases.
4. `docs/especificacao-parte2.md` §10.6 — Legislação (regras do estruturador, leitor, editor) quando for tocar nesse módulo.
5. `docs/planos/F2.md` — etapas e atividades da F2 (7.1–13.4), decisões T16–T17 e critérios do portão, ao trabalhar na F2.

## Regras de trabalho neste projeto
- Fases são sequenciais: F0 fundamentos → F1 Recall (MVP) → F2 Legislação → F3 Hoje/Plano → F4 sync. Não antecipar funcionalidade de fase posterior. Exceção decidida pelo Gabriel em 23/09/2026: a F2 roda em paralelo ao uso real da F1 (o portão da F1 continua sendo medido); a F3 só começa depois do portão da F2.
- Toda entrega de fase inclui o item de segurança/LGPD descrito na Parte 1 §15.
- Vocabulário obrigatório na interface e no código: Aparelho (equipamento), Problema (falha da plataforma), Erro (só estudo), Dispositivo (só unidade da lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- Nada obrigatório além do mínimo nos formulários; captura de erro tem exatamente 2 campos obrigatórios.
- Local-first: nenhuma funcionalidade pode depender de rede; o remoto (Supabase) é espelho.
- Nunca renderizar HTML colado sem sanitizar.
- Escolhas técnicas: seguir T1–T17 (`docs/decisoes-tecnicas.md`); nova escolha técnica relevante é decidida com o Gabriel e registrada lá.
- Definição de pronto: `npm run check` verde (lint, tipos, testes, auditoria); E2E verde quando houver tela.

## Git
Identidade global configurada (Gabriel Costa <gabrieldjcosta@gmail.com>). Remoto privado: https://github.com/gabrieldjcosta/arretado (origin, branch main). GitHub CLI autenticado como gabrieldjcosta.
Commits só quando o Gabriel pedir; push para origin/main após cada commit aprovado.

## Relacionado
Skill `acumen-extrair-normas` (extração de leis do Planalto/ALESP): base conceitual do estruturador da F2.
