# F3-A em pacotes paralelos + preparação da F3-B

Partição de 13/10/2026 do plano-mestre §4 (F3-A) e §5 (F3-B). Cada pacote vira **uma thread/sessão** (Opus 5.5, pelo CLAUDE.md), sem arquivo em comum com os que rodam junto. O portão da F2 está fechado (plano-mestre §3); nada aqui espera medição de uso real.

## Regras de convivência

1. **No máximo 2 pacotes de código ao mesmo tempo.** Testes de tempo falham com a máquina carregada (`solucao-de-problemas.md`); cada sessão roda `npm run check` e E2E sozinha na vez. Pacote só de documento ou script não conta. Subir a próxima onda só com a anterior mergeada na `integracao`.
2. **P0 vem primeiro e sozinho.** Ele cria contratos, rotas, "encaixes" e **a única subida de esquema (v7)**; os demais não mexem em `src/core/modelo/`, `src/core/persistencia/`, `App.tsx`, `Shell.tsx`, nem em `Areas.tsx` depois do P0 (R10: uma só revisão independente e um só backup).
3. **Dono de arquivo.** Um pacote só edita a sua pasta (tabela abaixo). Arquivo compartilhado (`glossario.md`, `proxima-sessao.md`, `proximos-passos.md`, `solucao-de-problemas.md`, `orientacoes/conteudo.ts`): editar **só por acréscimo de linha/seção própria**, no fim do PR, relendo a `integracao` antes de commitar.
4. **Camada visual é da thread "Ajuste de UI do Arretado".** Ela é dona de `src/apresentacao/estilos.css`, tokens, `Aparencia.tsx`, `componentes/AcaoAgora.tsx` e do desenho final de Hoje/Sessão (rodadas do Stitch; a D-D2 "Sol e anil" ainda espera a palavra do Gabriel). Os pacotes aqui: (a) usam só tokens e classes existentes, **sem cor literal**; (b) estilo novo vai em CSS próprio do pacote (`estilos-<pacote>.css`, importado no componente); (c) mantêm a estrutura em componentes pequenos com `className` semântico, para a troca de tokens e o repaginado não exigirem reescrita; (d) acessibilidade (axe, alvos de 44 px, 3 aparelhos, 2 temas) é critério do pacote.
5. Regras do CLAUDE.md valem: local-first, vocabulário obrigatório, sem diagnóstico, nada obrigatório além do mínimo, `npm run check` verde, glossário e solução de problemas atualizados. Duração de sessão nunca é tratada como aprendizado.

## Pacote 0 — Fundação (sequencial; Opus 5.5, **revisão independente + backup do Gabriel antes do merge no `main`**)

Entrega o que os outros precisam para não colidir:

- **Esquema v7** (uma subida só, com `supabase/migrations/…` só como arquivo): estende `Sessao` (`alvo`, `fronteira`, `proximoPasso`, `estacionamento[]`, origem da `ProximaAcao`), cria `TarefaDeEstudo` (título, `pontoId?`, `fonte?`, `estado` aberta/feita/adiada/dividida, `paiId?`, `ordem`, `estimativaMin?`, manual ou sugerida) e `PerfilDeEstudo` nas preferências. Inclui já tudo da F3-B pacote 2 para não subir de novo. Migração testada v6→v7 (tabela a tabela, como em `migracao.test.ts`).
- **Contratos de domínio**: `src/dominios/hoje/contrato.ts` (`ProximaAcao`: tipo, alvo, razão, estimativa) e `src/dominios/sessao/contrato.ts` (assinaturas de iniciar, pausar, retomar, encerrar, restaurar, estacionar). Só tipos e funções que lançam "não implementado"; os pacotes preenchem.
- **Encaixes de tela**: `Hoje` em `src/apresentacao/hoje/Hoje.tsx` como composição de blocos (Agora, Depois, Revisões, Captura, Retorno), cada bloco um arquivo vazio de um pacote; rotas `/sessao/*` e `/plano/*` registradas; `Areas.tsx` e `App.tsx` ficam fechados depois disso.
- Glossário (Sessão, Tarefa de estudo, Próxima ação, Estacionamento, Perfil) e T-nova em `decisoes-tecnicas.md`.

## Ondas e pacotes

| Onda | Pacote | Pasta que possui | Depende de | Observação |
|---|---|---|---|---|
| 0 | **P0 Fundação** | `src/core/modelo`, `persistencia`, `contratos`, `App.tsx`, `Areas.tsx` | — | sozinho |
| 0 | **B0 Catálogo: formato e validador** (só doc/script) | `scripts/catalogo.mjs`, `corpus/catalogo/`, `docs/planos/catalogo-formato.md` | CSV do Perplexity | pode rodar durante a P0; não conta no limite |
| 1 | **A1 Uma próxima ação** | `src/dominios/hoje/`, `src/apresentacao/hoje/Agora*.tsx`, `EstadoVazio.tsx` | P0 | domínio puro: revisão vencida → leitura salva (reaproveita "Continuar leitura") → vazio com 3 começos; "Escolher outra coisa". O botão de começar só leva a `/sessao/iniciar` |
| 1 | **A2 Sessão leve** | `src/dominios/sessao/`, `src/apresentacao/sessao/` | P0 | começar em um toque, alvo/fronteira opcionais, pausar sem falha, fechar com próximo passo pré-preenchido, restaurar sessão aberta ao voltar |
| 2 | **A3a Alavancas na sessão** | `src/apresentacao/sessao/alavancas/`, `src/dominios/sessao/estacionamento.ts` | A2 | estacionamento de distração, temporizador opcional (nunca bloqueia), modo "só estudo" |
| 2 | **A3b Retorno e fechar o Dia** | `src/dominios/dia/`, `src/apresentacao/hoje/Retorno*.tsx`, `FecharDia*.tsx` | P0 (usa `Sessao` já gravada) | mensagem de retorno sem dívida nem sequência quebrada; fechar o Dia |
| 3 | **A4 Perfis** (opcional, por último) | `src/core/preferencias/perfis.ts`, `src/apresentacao/conta/Perfis*.tsx` | A1–A3 | Calmo/Guiado/Leitura com prévia e volta; nada obrigatório |
| 2 | **B1 Catálogo no app** | `src/dominios/catalogo/` | B0, P0 | JSON versionado por carreira, local-first, rótulo "baseado no edital X de AAAA"; reusa `aplicar` e a prévia de `src/integracoes/pontos` |
| 3 | **B2 Onboarding do plano** | `src/apresentacao/plano/onboarding/` | B1, A1 | uma pergunta por tela, disciplinas pré-marcadas, assuntos recolhidos, "sem edital", termina em "Comece por aqui" (ação da A1); texto sem jargão; tudo reversível |
| 3 | **B3 Pontos do programa** | `src/dominios/pontos/`, `src/apresentacao/plano/pontos/` | P0 | editar disciplinas e pontos, prioridade separada do status, atividade sem alegar domínio |
| 4 | **B4 Tarefas pequenas e sugestões** | `src/dominios/tarefas/`, `src/apresentacao/plano/tarefas/` | B3, A1 | só depois do portão F3-A; sugestão determinística com "por quê" |
| 5 | **C1 Resumo manual** | `src/dominios/notas/`, `src/apresentacao/biblioteca/notas/` | PR do Filtro da Biblioteca, B4 | Nota tipo resumo, sanitizada, leitura com grifo/anotação e "Enviar às frases"; sem esquema novo. Detalhe: `ordem-resumos-precedentes.md` |
| 5 | **C2 Precedentes e vínculos** | `src/dominios/precedentes/`, `src/apresentacao/biblioteca/precedentes/` | C1 | **esquema v8**; trecho-chave, vínculo a dispositivo e entre precedentes, acervo como precedente, favoritos discretos; backup do Gabriel antes do merge e revisão independente; modelo acima de Sonnet 5.5 médio no desenho |

Ondas com 2 pacotes de código: **0** P0 (+B0 doc), **1** A1+A2, **2** A3a+A3b (B1 espera vaga ou entra no lugar da A3b se o Gabriel preferir catálogo antes), **3** B2+B3 (A4 entra quando houver vaga), **4** B4. Dentro de uma onda, um merge por pacote, sem squash, nunca no `main`.

## Reuso da thread "Onboarding dos planos sem edital"

- Prompt do Perplexity: [`/mnt/project-files/planos/prompt-perplexity-catalogo.md`](../../../mnt/project-files/planos/prompt-perplexity-catalogo.md) (cópia a versionar em `docs/planos/` pelo B0). Saída em CSV (`carreira, orgao, uf, banca, ano_edital, cargo, fase, disciplina, …, fonte_url`); o B0 valida por script (URL de fonte obrigatória, "NÃO LOCALIZADO" sem assuntos, `faixa` só com base) e converte em JSON versionado por carreira.
- Decisões dessa thread: catálogo é dado do app, não backend; rótulo honesto de fonte e ano; "ainda sem edital" cai em carreira genérica; atualizador diário e upload de edital ficam depois; sem esquema para versão de edital agora.
- Desenho de fluxo (prioridade 2, 5 e 1 da thread): disciplinas já marcadas, valor imediato ("Comece por aqui"), uma pergunta por tela; "Altíssima" fora do onboarding (sugerida pelo catálogo, corrigida depois).

## Entrada e saída de cada pacote

Entrada: a sessão lê `CLAUDE.md`, `docs/proxima-sessao.md`, este arquivo (só a linha do pacote) e o plano-mestre §4/§5. Saída: PR para a `integracao` com `npm run check` verde, E2E da tela nova nos 3 aparelhos, axe nos 2 temas, passagem de bastão no PR. O agente de verificação ([`agente-verificacao.md`](agente-verificacao.md)) passa a incluir o roteiro de cada pacote quando ele mergeia.
