# Próxima sessão — ponto de partida

Atualizado em 13/10/2026 (13.5 feita). Ler antes de qualquer trabalho, junto com o `CLAUDE.md`. Ordem, fases e decisões abertas: [`planos/plano-mestre.md`](planos/plano-mestre.md) (fonte única). Resumo simples: [`planos/proximos-passos.md`](planos/proximos-passos.md). Problemas conhecidos: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário: [`glossario.md`](glossario.md). Histórico das sessões até 13/10/2026 (cada etapa feita, suposições a confirmar): [`planos/arquivo/proxima-sessao-ate-2026-10-13.md`](planos/arquivo/proxima-sessao-ate-2026-10-13.md).

## Estado

- **F0** com portão fechado; **F1** implementada, portão em medição (14 dias com revisão em ≥ 10).
- **F2 em execução.** Feitas: etapas 7, 8, 9, 10 (10.1–10.4), 11 (11.1–11.9), 12.1, 13.1, 13.2, 13.3, 13.5; programa do acervo (Peças 1–6a, esquema v5), súmulas, teses curadas (155/169); redesign fatias 1–6; `/code-review` das etapas 8, 9 e 11 (relatório em [`revisoes/f2-etapas-8-9-11.md`](revisoes/f2-etapas-8-9-11.md)).
- **`main`** tem tudo até o PR #81 (merge #82, 11/10/2026). **Só na `integracao`:** PR #83 (`/code-review`) e a consolidação do plano-mestre. Nenhum dos dois sobe o esquema (sem backup).
- Falta para o portão da F2: 12.2/12.3/6b (a 12.2 pede o Gabriel com rede), 13.4 e 2 semanas de uso real.

## Próxima atividade

**12.2 — Worker com chamada real (LEP, CF, CC)**: pede o Gabriel, com rede. Sem rede, a próxima da nuvem é a **13.4** (portão da F2, depois da 12.2 ou com a importação por URL registrada como pendente). Detalhe em [`planos/plano-mestre.md`](planos/plano-mestre.md) §3 A.

**13.5 feita (13/10/2026), sem subida de esquema:** itens 2–4 e 6 já tinham teste (axe e alvos de 44 px em `acessibilidade.spec.ts`; grifos que sobrevivem em `atualizacao.test.ts` e no E2E 11.7; erro a partir do leitor e posição intacta no E2E 11.5; ida e volta do backup na 13.3). Item 1: E2E novo (tamanho em Conta › Aparência, "Continuar leitura", recarregar). Item 5 era lacuna: o leitor (`.procedencia`) e a Biblioteca passaram a mostrar fonte, data da coleta, versão (vigência) e "Editado à mão" (`procedenciaDaVersao`, em `rotulos.ts`). Sem defeito de posição de leitura.

**13.2 feita (13/10/2026), sem subida de esquema:** Orientações v1 ganhou as seções `legislacao` (leitor) e `importar-lei` (importador); `secaoDeAjuda` aponta `/biblioteca/importar*` e `/biblioteca*` para elas; teste de rotas em `App.test.tsx`.

**13.3 feita (13/10/2026), sem subida de esquema:** pacote só de `legislacao` leva os anexos das fontes (`exportar.ts`, `ler.ts`, `importar.ts`); `backup-corpus.test.ts` prova ida e volta com o CP inteiro (integral e só `legislacao`, rascunho retomado). Sem tela nova.

## Depois (em ordem)

| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| 5 | 12.2 Worker com chamada real (LEP, CF, CC) | Sonnet 5.5 médio (alto se estourar) | **Gabriel, com rede** |
| 6 | 12.3 Campo URL; depois 6b | Sonnet 5.5 médio | nuvem, depois da 12.2 |
| 7 | 13.4 Portão da F2 (documento) | Sonnet 5.5 médio | nuvem |
| 8 | Uso real: 2 semanas lendo lei no Arretado | — | **Gabriel** |
| 9 | Planejamento da F3 | **Opus 5.5** | nuvem, só depois do portão |

Sem bloquear: lotes com rede (SV 30, 3b/3d, 63 normas a converter; precisa de rede) e busca de súmula pelo índice (Sonnet 5.5 médio, nuvem). Relato de problema do uso real fura a fila.

## Pendências do Gabriel

Decisões (plano-mestre §10): 14 teses com número repetido; sumário da importação refletir a edição; critério dos gabaritos no portão (reconferência virou rotina de estudo); suposições reversíveis das atividades 8.7 a 11.6 (no histórico). Ações: merge da `integracao` no `main`; 12.2 com rede; lotes com rede; capturas "antes/depois" do redesign se quiser.

## Como abrir a próxima sessão

Sessão nova por atividade, pelo comando `/proxima` ou pelo Despacho (ver [`planos/fluxo-diario.md`](planos/fluxo-diario.md)): branch a partir da `integracao`, `npm run check` verde, commits `wip:` com push a cada bloco, PR para a `integracao` com auto-merge (merge commit). O `main` é só do Gabriel. Meta: até ~200 mil tokens por sessão; nunca abrir inteiros `corpus/normas/*.html`, `package-lock.json` nem relatórios do Playwright.

## Referência

Cloudflare (Worker `arretado`), projeto Supabase, comandos de validação e mapa do código: [`referencia.md`](referencia.md).
