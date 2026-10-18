# Tarefa: T6 Revisão independente do conjunto F4-A (só leitura)
Atividade: F4-A, A8 (revisão do conjunto) · Nível de risco: **A** (auth, RLS, privacidade, migração) · Revisor: Claude **Opus 5.5** em modo revisão, sessão nova que não construiu nada da F4-A (conta `claude`; alternativa: `cline`) · Construtor: nenhum (não edita)
Branch: nenhum para código; relatório num branch só de docs `claude/f4a-t6-revisao` (`docs/revisoes/f4a-conjunto.md`) · Base: `integracao` com T1–T5 mesclados

## Objetivo
Revisar a F4-A inteira contra `docs/planos/f4a-contas.md` (§5, §6, §7, §10), os critérios do portão em `docs/planos/f4a-pacotes.md` e o `docs/portoes/F4A.md` da T5, procurando o que os PRs isolados não pegam: costuras entre pacotes (A3 × A4 × A5 × A6 × A7), `VITE_CONTA=0` deixando o app idêntico, isolamento entre contas, consentimento, CSP, nada de conteúdo de estudo saindo do Aparelho.

## Escopo
Pode ler todo o repositório (nunca abrir inteiros `corpus/normas/*.html`, `package-lock.json`, relatórios do Playwright) e rodar comandos locais. Pode escrever só `docs/revisoes/f4a-conjunto.md`.
Não fazer: editar código, aplicar migração, chamar o Supabase real, aplicar rótulo, mesclar.

## Roteiro mínimo
1. `npm run check` e `npx playwright test` (saída para arquivo).
2. `VITE_CONTA=0`: build sem `supabase-js` no bundle inicial e CSP sem origem nova (comando e evidência).
3. Fluxos ponta a ponta no código: entrar → aceite gravado → migrar → cópia na nuvem com consentimento → sair e apagar → entrar em outra conta → excluir conta. Para cada um: onde está o teste, o que não tem teste.
4. RLS e Storage: `supabase/migrations/*f4a*`, `rls.test.ts`, `contas.test.ts`, políticas de `storage.objects`; `verificacao-rls-remota.sql` cobre os critérios do portão?
5. Edge Function `excluir-conta`: chave de serviço só em segredo; ordem objetos → usuário; falha não apaga nada local.
6. Pelo menos 3 mutações em pontos críticos (isolamento, consentimento, verificação da migração) com o resultado.

## Critérios de aceite
- [ ] Relatório com veredito (APROVAR / APROVAR COM AJUSTES / BLOQUEAR), achados com severidade, arquivo:linha e cenário de falha.
- [ ] Seção "o que não foi verificado" (o que só a fumaça mede).
- [ ] Recomendação sobre o merge `integracao`→`main` (D8) e o que fazer antes.

## Verificação
Os comandos do roteiro, com a saída relevante citada.

## Pare e pergunte se
- achar segredo, chave ou dado de estudo no repositório (pare e avise na hora);
- precisar de rede ou do projeto real para concluir um ponto (marque "não verificado");
- a mesma falha de comando repetir duas vezes.

## Relatório final
veredito · achados · comandos e resultado · não verificado · SHA · link do PR do relatório
