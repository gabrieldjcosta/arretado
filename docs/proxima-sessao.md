# Próxima sessão — ponto de partida

Atualizado em 13/10/2026 (Frases 1 feita e **revisada em sessão independente**; esquema v6 na `integracao`, **backup manual do Gabriel obrigatório antes do merge no `main`**). Ler antes de qualquer trabalho, junto com o `CLAUDE.md`. Ordem, fases e decisões abertas: [`planos/plano-mestre.md`](planos/plano-mestre.md) (fonte única). Resumo simples: [`planos/proximos-passos.md`](planos/proximos-passos.md). Problemas conhecidos: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário: [`glossario.md`](glossario.md). Histórico das sessões até 13/10/2026 (cada etapa feita, suposições a confirmar): [`planos/arquivo/proxima-sessao-ate-2026-10-13.md`](planos/arquivo/proxima-sessao-ate-2026-10-13.md).

## Estado

- **F0** com portão fechado; **F1** implementada, portão em medição (14 dias com revisão em ≥ 10).
- **F2 em execução.** Feitas: etapas 7, 8, 9, 10 (10.1–10.4), 11 (11.1–11.9), 12.1, 13.1, 13.2, 13.3, 13.5; programa do acervo (Peças 1–6a, esquema v5), súmulas, teses curadas (155/169); redesign fatias 1–6; `/code-review` das etapas 8, 9 e 11 (relatório em [`revisoes/f2-etapas-8-9-11.md`](revisoes/f2-etapas-8-9-11.md)).
- **`main`** tem tudo até o PR #81 (merge #82, 11/10/2026). **Só na `integracao`:** PR #83 (`/code-review`) e a consolidação do plano-mestre. Nenhum dos dois sobe o esquema (sem backup).
- Falta para o portão da F2: 12.3/6b (a 12.2 foi verificada em 13/10/2026: rota no ar, LEP/CF/CC/ALESP respondem 200, sem estouro), 13.4 e 2 semanas de uso real.

## Próxima atividade

**Revisão independente das Frases 1 (13/10/2026, PR #100, esquema v6): segura para o `main` depois da correção abaixo e do backup manual.** Conferido: (1) a subida v5→v6 só cria `frases`/`revisoesFrase`, sem índice novo nem registro transformado; `migrarFrasesDosErros` roda uma vez (marca em `meta`), numa transação, idempotente (reabrir e rodar à mão não duplicam; duas abas serializam na transação); erros, cartões, normas, grifos, estrelas e acervo ficam iguais (`migracao.test.ts` compara tabela a tabela). (2) Backup: v6 vai e volta (modo 6) sem perder erro, Frase nem revisão de frase; v5 restaurado (modo 6) recria as Frases; pacote só de `legislacao` (13.3) não é afetado. **Bug achado e corrigido:** "Substituir módulos" (modo 5) com backup v5 excluía todas as Frases locais e a migração não as recriava; agora a Frase de quem fica é a mesma (id e histórico), a do erro que sai sai junto, e erro excluído depois do backup volta com Frase (`importar.ts`, `migracao-frases.ts`; 3 testes em `pacote-v2.test.ts`). (3) D25: só a frase correta é obrigatória na captura e no leitor; disciplina e ponto opcionais, lembrados no aparelho (`localStorage`, só ids). (4) Nada depende de rede (porta de IA nula). (5) Vocabulário certo ("Dispositivo" só da lei). (6) Nenhum HTML novo renderizado (texto puro). Não verificado: banco v5 real do Gabriel (não há cópia no repositório; o backup manual cobre). `npm run check` verde (1624 testes).


**Frases 1 (v6) já está na `integracao` (PR #100) e revisada (acima).** Falta só o backup manual do Gabriel (Conta › Dados › Exportar) antes do merge da `integracao` no `main`, e recarregar as abas depois (R10). Atividade seguinte: **4c Frases 2** (Sonnet 5.5 médio), a partir da `integracao`.

**Frases 1 feita (13/10/2026), esquema v6.** Modelo: coleções `frases` (`Frase`: texto, disciplina e ponto opcionais, `origemTipo` `erro`/`trecho`/`manual`/`ia`, `erroId`, `trecho` = dispositivo + intervalo, `estado` `ativa`/`arquivada`, `proximaRevisao`) e `revisoesFrase` (append-only, `li`/`de_novo`; a tela vem na 4c); `Erro.oQueFoi` opcional; `Cartao.fraseId`, `tipo` (`pergunta`/`lacuna`), `ocultos` e origens `frase`/`ia` — o esquema das Frases 2 e 3 já está todo aqui, para não subir de novo. Migração: o upgrade só cria as coleções; `migrarFrasesDosErros` cria a Frase de cada erro antigo com frase correta ao abrir (uma vez, marca em `meta`) e ao importar pacote < v6. Espelho remoto: `supabase/migrations/20261013000000_colecoes_frases.sql` (**não aplicada no Supabase**; só arquivo, como as anteriores até a F4). Captura (`RegistrarErro.tsx`): só "Frase correta" obrigatória; "Disciplina (opcional)" e "Ponto do edital (opcional)" fora de "Mais detalhes", lembrados no aparelho; resultado e "o que foi" em "Mais detalhes"; cartão só é oferecido com "o que foi". O formulário do leitor (Ações › Registrar erro) segue a mesma regra. Porta nula `ServicoDeIA` em `src/core/ia`. Suposições (reversíveis): excluir o erro exclui a Frase dele (o cartão fica); apagar a frase correta arquiva a Frase; Frase nova vence amanhã, a migrada vence hoje; descartado vira Frase `arquivada`; a escolha de disciplina/ponto fica em `localStorage` (só ids).

Passagem de bastão (Frases 1): Tarefa 4b · Branch `claude/frases-1` · Último commit: ver o PR · Alterações não commitadas: nenhuma · Feito: modelo v6, migração, captura, leitor, docs · Verificado: `npm run check` verde (1621 testes); `npx playwright test` nos 3 aparelhos com axe nos 2 temas (ver o PR) · Não verificado: abrir no aparelho real um banco v5 com dados reais (é o que o backup protege) · Falha atual: nenhuma · Próxima ação exata: revisão independente do PR em outra sessão; depois backup do Gabriel; depois merge · Arquivos a ler: `src/core/modelo/recall.ts`, `src/core/persistencia/migracao-frases.ts`, `src/dominios/recall/servico.ts`, `src/apresentacao/recall/RegistrarErro.tsx` · Decisões que não se reabrem: D25, T22.

**Direção nova (13/10/2026):** registrar erro passa a exigir só a **frase correta** (disciplina e ponto facultativos e lembrados); revisão em dois modos (**Revisar frases** e **Revisar cartões**); cartão com oclusão; trecho da lei → "Enviar às frases"; Biblioteca = fontes dos outros, Frases = o que você quer lembrar. Encaixada logo depois da 13.5, antes da 12.2 e da 13.4 (plano-mestre §1 "Frases" e §3 D; D25; T22).

**Ajustes A feita (13/10/2026), sem subida de esquema:** (a) modo foco por artigo centra o cartão na vertical e na horizontal (`estilos.css`, `.leitor.em-foco`; rola por dentro só se exceder; E2E 11.8 mede o centro). Revisar frases ainda não existe: a 4c aplica o mesmo palco. (b) Acervo: cada item não adicionado mostra "Disciplina: …" com "Mudar" (várias; "Outros" = sem disciplina); `aderirAoItem(..., { disciplinas })`, `aderirEmLote(..., { disciplinasPorItem })`; Normas ganhou "Mudar disciplina" (`mudarDisciplinas` em `dominios/acervo/vinculos.ts`). A atualização 6a não reescreve vínculos, então a escolha sobrevive (teste). Suposição: "Outros" grava vínculo sem `disciplinaId` nem sugestão; mostra "Sem disciplina" em Normas.

**13.5 feita (13/10/2026), sem subida de esquema:** itens 2–4 e 6 já tinham teste (axe e alvos de 44 px em `acessibilidade.spec.ts`; grifos que sobrevivem em `atualizacao.test.ts` e no E2E 11.7; erro a partir do leitor e posição intacta no E2E 11.5; ida e volta do backup na 13.3). Item 1: E2E novo (tamanho em Conta › Aparência, "Continuar leitura", recarregar). Item 5 era lacuna: o leitor (`.procedencia`) e a Biblioteca passaram a mostrar fonte, data da coleta, versão (vigência) e "Editado à mão" (`procedenciaDaVersao`, em `rotulos.ts`). Sem defeito de posição de leitura.

**13.2 feita (13/10/2026), sem subida de esquema:** Orientações v1 ganhou as seções `legislacao` (leitor) e `importar-lei` (importador); `secaoDeAjuda` aponta `/biblioteca/importar*` e `/biblioteca*` para elas; teste de rotas em `App.test.tsx`.

**13.3 feita (13/10/2026), sem subida de esquema:** pacote só de `legislacao` leva os anexos das fontes (`exportar.ts`, `ler.ts`, `importar.ts`); `backup-corpus.test.ts` prova ida e volta com o CP inteiro (integral e só `legislacao`, rascunho retomado). Sem tela nova.

## Depois (em ordem)

| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| ✔ 4b | Frases 1 feita e revisada; **falta o backup antes do merge no `main`** | — | — |
| 4c | Frases 2: Revisar frases e Revisar cartões, com oclusão | Sonnet 5.5 médio | nuvem |
| 4d | Frases 3: "Enviar às frases" no leitor | Sonnet 5.5 médio | nuvem |
| 5 | ~~12.2 Worker com chamada real~~ (feita e verificada em 13/10/2026; ver `solucao-de-problemas.md`) | — | — |
| 6 | 12.3 Campo URL; depois 6b | Sonnet 5.5 médio | nuvem, depois da 12.2 |
| 7 | 13.4 Portão da F2 (documento) | Sonnet 5.5 médio | nuvem |
| 8 | Uso real: 2 semanas lendo lei no Arretado | — | **Gabriel** |
| 9 | Planejamento da F3 | **Opus 5.5** | nuvem, só depois do portão |

Sem bloquear: lotes com rede (SV 30, 3b/3d, 63 normas a converter; precisa de rede) e busca de súmula pelo índice (Sonnet 5.5 médio, nuvem). Relato de problema do uso real fura a fila.

## Pendências do Gabriel

Decisões (plano-mestre §10): 14 teses com número repetido; sumário da importação refletir a edição; critério dos gabaritos no portão (reconferência virou rotina de estudo); suposições reversíveis das atividades 8.7 a 11.6 (no histórico). Ações: **backup (Conta › Dados › Exportar) antes do merge da `integracao` no `main` (esquema v6; revisão independente já feita)**; merge da `integracao` no `main`; 12.2 com rede; lotes com rede; capturas "antes/depois" do redesign se quiser.

## Como abrir a próxima sessão

Sessão nova por atividade, pelo comando `/proxima` ou pelo Despacho (ver [`planos/fluxo-diario.md`](planos/fluxo-diario.md)): branch a partir da `integracao`, `npm run check` verde, commits `wip:` com push a cada bloco, PR para a `integracao` com auto-merge (merge commit). O `main` é só do Gabriel. Meta: até ~200 mil tokens por sessão; nunca abrir inteiros `corpus/normas/*.html`, `package-lock.json` nem relatórios do Playwright.

## Referência

Cloudflare (Worker `arretado`), projeto Supabase, comandos de validação e mapa do código: [`referencia.md`](referencia.md).
