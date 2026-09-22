# Arretado — instruções para o Claude Code

## O que é este repositório
Plataforma pessoal de preparação para concursos jurídicos (usuário principal: Gabriel, TDAH, banca FCC, Defensoria/SP).
Nome provisório "Arretado" (antes "Acumen"; "Acumen v2" = protótipo anterior em Firestore, a ser importado).

## Estado
Especificação concluída; **nenhum código ainda**. Antes de qualquer implementação, ler:
1. `README.md` — contexto em uma página.
2. `docs/especificacao-parte1.md` §19 — decisões D1–D24 (não reabrir sem motivo explícito do Gabriel).
3. `docs/especificacao-parte1.md` §5 e §15 — modelo de dados e fases.
4. `docs/especificacao-parte2.md` §10.6 — Legislação (regras do estruturador, leitor, editor) quando for tocar nesse módulo.

## Regras de trabalho neste projeto
- Fases são sequenciais: F0 fundamentos → F1 Recall (MVP) → F2 Legislação → F3 Hoje/Plano → F4 sync. Não antecipar funcionalidade de fase posterior.
- Toda entrega de fase inclui o item de segurança/LGPD descrito na Parte 1 §15.
- Vocabulário obrigatório na interface e no código: Aparelho (equipamento), Problema (falha da plataforma), Erro (só estudo), Dispositivo (só unidade da lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- Nada obrigatório além do mínimo nos formulários; captura de erro tem exatamente 2 campos obrigatórios.
- Local-first: nenhuma funcionalidade pode depender de rede; o remoto (Supabase) é espelho.
- Nunca renderizar HTML colado sem sanitizar.
- Escolhas técnicas ainda em aberto (linguagem, framework de UI, biblioteca de IndexedDB, formato do pacote): decidir com o Gabriel, obedecendo D1–D24.

## Git
Identidade global configurada (Gabriel Costa <gabrieldjcosta@gmail.com>). Remoto privado: https://github.com/gabrieldjcosta/arretado (origin, branch main). GitHub CLI autenticado como gabrieldjcosta.
Commits só quando o Gabriel pedir; push para origin/main após cada commit aprovado.

## Relacionado
Skill `acumen-extrair-normas` (extração de leis do Planalto/ALESP): base conceitual do estruturador da F2.
