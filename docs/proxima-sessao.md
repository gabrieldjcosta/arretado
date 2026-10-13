# Próxima sessão — ponto de partida

Atualizado em 13/10/2026 (13.5 feita). Ler antes de qualquer trabalho, junto com o `CLAUDE.md`. Ordem, fases e decisões abertas: [`planos/plano-mestre.md`](planos/plano-mestre.md) (fonte única). Resumo simples: [`planos/proximos-passos.md`](planos/proximos-passos.md). Problemas conhecidos: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário: [`glossario.md`](glossario.md). Histórico das sessões até 13/10/2026 (cada etapa feita, suposições a confirmar): [`planos/arquivo/proxima-sessao-ate-2026-10-13.md`](planos/arquivo/proxima-sessao-ate-2026-10-13.md).

## Estado

- **F0** com portão fechado; **F1** implementada, portão em medição (14 dias com revisão em ≥ 10).
- **F2 em execução.** Feitas: etapas 7, 8, 9, 10 (10.1–10.4), 11 (11.1–11.9), 12.1, 13.1, 13.2, 13.3, 13.5; programa do acervo (Peças 1–6a, esquema v5), súmulas, teses curadas (155/169); redesign fatias 1–6; `/code-review` das etapas 8, 9 e 11 (relatório em [`revisoes/f2-etapas-8-9-11.md`](revisoes/f2-etapas-8-9-11.md)).
- **`main`** tem tudo até o PR #81 (merge #82, 11/10/2026). **Só na `integracao`:** PR #83 (`/code-review`) e a consolidação do plano-mestre. Nenhum dos dois sobe o esquema (sem backup).
- Falta para o portão da F2: 12.2/12.3/6b (a 12.2 pede o Gabriel com rede), 13.4 e 2 semanas de uso real.

## Próxima atividade

**Direção nova (13/10/2026, nenhum código mudou ainda):** registrar erro passa a exigir só a **frase correta** (disciplina e ponto facultativos e lembrados); revisão em dois modos (**Revisar frases** e **Revisar cartões**); cartão com oclusão; trecho da lei → "Enviar às frases"; Biblioteca = fontes dos outros, Frases = o que você quer lembrar. Encaixada logo depois da 13.5, antes da 12.2 e da 13.4 (plano-mestre §1 "Frases" e §3 D; D25; T22).

**Ajustes A — foco centralizado; escolher a disciplina ao trazer norma do acervo** (Sonnet 5.5 médio; nuvem, sem rede). Detalhe em [`planos/plano-mestre.md`](planos/plano-mestre.md) §3 D. Depois, Frases 1 (Opus 5.5; esquema v6, **backup antes do merge**).

**13.5 feita (13/10/2026), sem subida de esquema:** itens 2–4 e 6 já tinham teste (axe e alvos de 44 px em `acessibilidade.spec.ts`; grifos que sobrevivem em `atualizacao.test.ts` e no E2E 11.7; erro a partir do leitor e posição intacta no E2E 11.5; ida e volta do backup na 13.3). Item 1: E2E novo (tamanho em Conta › Aparência, "Continuar leitura", recarregar). Item 5 era lacuna: o leitor (`.procedencia`) e a Biblioteca passaram a mostrar fonte, data da coleta, versão (vigência) e "Editado à mão" (`procedenciaDaVersao`, em `rotulos.ts`). Sem defeito de posição de leitura.

**13.2 feita (13/10/2026), sem subida de esquema:** Orientações v1 ganhou as seções `legislacao` (leitor) e `importar-lei` (importador); `secaoDeAjuda` aponta `/biblioteca/importar*` e `/biblioteca*` para elas; teste de rotas em `App.test.tsx`.

**13.3 feita (13/10/2026), sem subida de esquema:** pacote só de `legislacao` leva os anexos das fontes (`exportar.ts`, `ler.ts`, `importar.ts`); `backup-corpus.test.ts` prova ida e volta com o CP inteiro (integral e só `legislacao`, rascunho retomado). Sem tela nova.

## Depois (em ordem)

| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| 4a | Ajustes A: foco centralizado; disciplina ao trazer do acervo (§3 D) | Sonnet 5.5 médio | nuvem, sem rede |
| 4b | Frases 1: modelo e captura, esquema v6 (**backup antes do merge**) | **Opus 5.5** | nuvem |
| 4c | Frases 2: Revisar frases e Revisar cartões, com oclusão | Sonnet 5.5 médio | nuvem |
| 4d | Frases 3: "Enviar às frases" no leitor | Sonnet 5.5 médio | nuvem |
| 5 | 12.2 Worker com chamada real (LEP, CF, CC) | Sonnet 5.5 médio (alto se estourar) | **Gabriel, com rede** |
| 6 | 12.3 Campo URL; depois 6b | Sonnet 5.5 médio | nuvem, depois da 12.2 |
| 7 | 13.4 Portão da F2 (documento) | Sonnet 5.5 médio | nuvem |
| 8 | Uso real: 2 semanas lendo lei no Arretado | — | **Gabriel** |
| 9 | Planejamento da F3 | **Opus 5.5** | nuvem, só depois do portão |

Sem bloquear: lotes com rede (SV 30, 3b/3d; normas a converter: 59 de 63 feitas em 13/10/2026, faltam os provimentos CGJ-TJSP 18/2012, 16/2013 e 21/2013 e a Res. CONDEGE 1/2024, ver `acervo/a-converter.md`) e busca de súmula pelo índice (Sonnet 5.5 médio, nuvem). Relato de problema do uso real fura a fila.

## Pendências do Gabriel

Decisões (plano-mestre §10): 14 teses com número repetido; sumário da importação refletir a edição; critério dos gabaritos no portão (reconferência virou rotina de estudo); suposições reversíveis das atividades 8.7 a 11.6 (no histórico). Ações: merge da `integracao` no `main`; **backup antes do merge das Frases 1 (esquema v6)**; 12.2 com rede; lotes com rede; capturas "antes/depois" do redesign se quiser.

## Como abrir a próxima sessão

Sessão nova por atividade, pelo comando `/proxima` ou pelo Despacho (ver [`planos/fluxo-diario.md`](planos/fluxo-diario.md)): branch a partir da `integracao`, `npm run check` verde, commits `wip:` com push a cada bloco, PR para a `integracao` com auto-merge (merge commit). O `main` é só do Gabriel. Meta: até ~200 mil tokens por sessão; nunca abrir inteiros `corpus/normas/*.html`, `package-lock.json` nem relatórios do Playwright.

## Referência

Cloudflare (Worker `arretado`), projeto Supabase, comandos de validação e mapa do código: [`referencia.md`](referencia.md).
