# Plano-mestre do Arretado

Consolidado em 13/10/2026 a partir do rascunho do Perplexity, da direção de UI/UX (insumos arquivados em [`arquivo/insumos-plano-mestre/`](arquivo/insumos-plano-mestre/)) e de todos os planos anteriores (curso de ação, F2, redesign, acabamento, próximos passos, próxima sessão, programa do acervo, T1–T21, D1–D24, `CLAUDE.md`).

**Fonte única.** Em divergência com qualquer outro plano, vale este documento. Não reabre as decisões D1–D24 (Parte 1 §19) nem as regras do `CLAUDE.md`; quando algo aqui parece contrariá-las, valem elas e este documento está errado. Os detalhes técnicos de cada etapa da F2 (fatos das fontes, rotina de pronto, critérios do portão) continuam em [`F2.md`](F2.md); o processo de branches e merges, em [`fluxo-diario.md`](fluxo-diario.md).

Como usar: no início da sessão, ler [`../proxima-sessao.md`](../proxima-sessao.md) (estado e próxima atividade) e, daqui, só a fase da atividade. Ao fechar uma atividade, atualizar `proxima-sessao.md` e [`proximos-passos.md`](proximos-passos.md); este documento muda só ao fechar uma fase, ao mudar a ordem ou com decisão nova do Gabriel.

---

## 1. Produto e regras permanentes

### O ciclo que toda funcionalidade fortalece

```text
retomar → ler ou responder → registrar o erro → confirmar a correção → revisar → retomar
```

Proposta em uma frase: **volte exatamente de onde parou e faça uma coisa por vez.** A unidade do produto é um ciclo de estudo recuperável, não uma conversa com IA.

### Regras (valem em todas as fases)

| # | Regra | Origem |
|---|---|---|
| R1 | Leitura, captura manual, revisão, planejamento e exportação funcionam sem conta e sem rede; o remoto é espelho | D1, `CLAUDE.md` |
| R2 | Quatro áreas fixas: **Hoje, Plano, Recall, Biblioteca**; mais captura, busca, menu **Ajuda** e Conta fora da navegação | D6 |
| R3 | Captura com **um único campo obrigatório: a frase correta**; disciplina e ponto do edital são facultativos e ficam escolhidos em registros em sequência; resultado (errou / acertou inseguro), "o que foi", imagem, fonte, classificação e IA são opcionais e aparecem sob demanda. *Até as Frases 1 serem implementadas, valem os 2 campos de hoje* | D9, **D25** (Gabriel, 13/10/2026) |
| R4 | IA externa só produz **rascunho** editável, com fonte, "Desfazer" e aprovação; nunca texto jurídico autoritativo nem alteração automática | novo (A2) |
| R5 | Todo material importado, extraído ou gerado é aprovado pelo usuário antes de virar conteúdo de estudo | D13, R4 |
| R6 | Fim de assinatura **nunca apaga dado nem bloqueia exportação** ou estudo manual | novo (C1) |
| R7 | **Diagnóstico nunca é perguntado nem guardado** (nem campo, nem filtro, nem rótulo, nem telemetria); fala pública parte do comportamento; nenhuma promessa clínica | `CLAUDE.md`, curso de ação |
| R8 | Proveniência da fonte, histórico de versões e conflitos sempre explícitos | D11, D14, D17 |
| R9 | Uma mudança significativa de fluxo por vez | — |
| R10 | Subida de esquema: backup manual do Gabriel antes do merge no `main`, recarregar as abas depois, instruções de recuperação no PR | F2 (9.1, 8.10) |
| R11 | Segurança e LGPD como critério de aceite de toda fase; HTML colado nunca renderizado sem sanitizar | D18, `CLAUDE.md` |
| R12 | Vocabulário obrigatório: Aparelho, Problema, Erro (só estudo), Dispositivo (só lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta, **Frase** (o que se quer lembrar), **Revisar frases** e **Revisar cartões** (os dois modos da Revisão) | D24, D25, `CLAUDE.md` |
| R13 | Fases sequenciais; nada de fase posterior é antecipado no código. Exceção vigente: a F2 roda em paralelo ao uso real da F1 | D5, `CLAUDE.md` |

### Frases (decidido pelo Gabriel em 13/10/2026; reabre D9 e D10 — ver D25)

- **Biblioteca × Frases.** *Biblioteca = o que os outros escreveram* (leis, súmulas, teses e, no futuro, resumos e jurisprudência): lida, grifada, anotada. *Frases = o que você quer lembrar*: curtas, suas, revisadas. Ponte única: selecionar um trecho de qualquer fonte → "Enviar às frases"; a frase guarda o link de volta (dispositivo + intervalo).
- **Entidade `Frase`** (coleção `frases`): texto, `disciplinaId?`, `pontoId?`, origem (`erro`, `trecho`, `manual`, futuro `ia`), `erroId?`, link da fonte, estado, próxima revisão. `Erro.fraseCorreta` permanece por compatibilidade e a migração cria uma Frase dos erros existentes. **Esquema v6** (R10: backup antes do merge, recarregar as abas). `Erro.resultado` e `Erro.oQueFoi` passam a opcionais (padrão `errou`).
- **Revisão em dois modos separados, cada um com cota própria:** *Revisar frases* (ler a frase; "li" ou "de novo"; espaçamento mais simples) e *Revisar cartões* (o Drill atual: Errei / Difícil / Fácil e as 6 caixas — D10 vale para cartões).
- **Cartão opcional, nunca automático**, criado a partir da frase: pergunta×resposta ou **lacuna com oclusão** (seleciona-se o termo ou trecho a esconder; um ou vários; `Cartao.tipo`).
- **Código:** Recall e Legislação não se importam; o botão "Enviar às frases" fica na tela do leitor, que conhece os dois. Modelo e decisões técnicas: T22.
- **Estética:** as telas novas seguem o sistema visual vigente (abaixo) e chegam com axe nos 2 temas e capturas arquivadas nos 3 aparelhos.

### Ordem dos portões (não negociável)

**F2 → F3 → V1 (validação externa) → F4 (conta e sincronização)** e só depois **A1 (OCR), A2 (IA), C1 (cobrança), voz e G1**. O que exige rede, conta, cota de uso ou cobrança espera a F4. Relato de problema do uso real fura a fila de qualquer etapa.

### Conflitos resolvidos nesta consolidação

| Tema | Rascunho / direção de UI | Fica valendo |
|---|---|---|
| Marca-texto amarelo | Amarelo "para trechos e estado de retomada" | Amarelo **só nos grifos do leitor** (conteúdo do usuário, `--grifo-1..3`). Retomada, "agora" e seleção usam sálvia (fatia 6, aprovada em 11/10/2026) |
| "Agora" do Hoje | Card dominante "Retomar" com destaque próprio | O **cartão sálvia aprovado** (`AcaoAgora`: `--agora-fundo`, `--agora-borda`, botão 50 px). "Retomar" é o conteúdo desse cartão, não um componente novo |
| Tela Hoje | 5 blocos (Retomar, Agora, Depois, Revisões, Captura rápida) | **4 blocos fixos** (D8): Agora (com a retomada), Depois (até 2), Revisões esperando, Captura rápida |
| Perfis Calmo / Guiado / Leitura | Onboarding pergunta "o que mais atrapalha" | Só entram se **nada for obrigatório**: pular é o caminho padrão, cada ajuste tem prévia e volta atrás, a resposta configura a ênfase e não é guardada como característica da pessoa (R7). Entram na F3-A, pacote 4, depois do essencial |
| Botões do drill | Lembrei / Quase / Não lembrei | Mantém **Errei / Difícil / Fácil** com texto e borda (fatia 6) e as 6 caixas (D10) |
| Seleção no leitor | Destacar, Anotar, **Explicar**, Criar questão | Destacar e Anotar já existem (11.4); "Criar cartão deste trecho" é candidata do fechamento da F2 (§3, pacote B); **Explicar** é IA e só entra na A2 |
| "Estou travado" | Botão de IA que decompõe a meta | Versão manual na F3-B ("Dividir esta tarefa"); versão com IA só na A2 |
| Leitura em voz alta, captura por fala | Segunda/terceira entrega | Depois da F4 (G1), com revisão de privacidade e acessibilidade |
| OCR | "Núcleo estável" bastava | Depois do portão da F4 (A1), mesmo sendo local, para não abrir frente nova antes da validação |
| Criar cartão do leitor | "Criar cartão deste trecho" como candidata do fechamento da F2 (§3 B) | Substituída por **"Enviar às frases"** (Frases 3, §3 D); o cartão nasce da frase |
| Teses curadas | "Próxima tarefa, aguarda decisão" | **Entregues** (155 de 169, PR #72, no `main`); só a decisão das 14 de número repetido segue aberta |
| Onde está cada entrega | Fatia 6, 10.x e 11.7 "no `main` via #80/#81" e fatia 6 "aguardando merge" | Ver §2: tudo até o PR #81 está no `main` (merge #82, 11/10/2026 17h17); o PR #83 (`/code-review`) está **só na `integracao`** |

### Direção de interface (resumo da direção de UI/UX, filtrada)

- Três princípios por tela: **continuidade antes de descoberta**, **reconhecimento antes de memória** (mostrar matéria, artigo, último ponto), **ação antes de configuração**.
- Uma ação dominante por tela; "Depois" visualmente menor; nada de vermelho punitivo, sequência perdida, culpa por dia ruim, mascote obrigatório, chat vazio na abertura ou painel de métricas antes do hábito.
- Registro de erro: painel lateral no desktop, folha inferior no celular, contexto (norma, dispositivo, trecho) já preenchido, "Voltar à leitura" como ação dominante depois de salvar.
- Revisão: fila finita, um cartão por vez, origem visível, "Abrir no texto", fim com evidência concreta ("7 erros revisitados; 3 voltam amanhã").
- Sistema visual vigente: papel esverdeado, sálvia como única cor de ação, grifos como único amarelo, Atkinson Hyperlegible Next (interface) e Literata (leitor) embutidas (T19), movimento 150–220 ms respeitando redução de movimento, ícone sempre com rótulo nas ações importantes, estado nunca só por cor.
- IA, quando chegar (A2), é **verbo contextual** ("Explique este trecho", "Transforme em cartão"), nunca uma aba ou destino.
- Métricas de eficácia (para a V1): tempo até começar, retomada no ponto certo, erros registrados sem sair do texto, recuperação após interrupção, sessão com resultado útil, "sei o que fazer agora". Tempo no app não é métrica.

---

## 2. Estado real (verificado no git em 13/10/2026)

| Onde | O que está |
|---|---|
| **`main`** (publicado em https://arretado.gabrieldjcosta.workers.dev; último merge #82, 11/10/2026) | F0 e F1 completas; F2 etapas 7, 8, 9, 10.1–10.4, 11.1–11.9, 12.1 (Worker, ainda sem chamada real); programa do acervo (Peças 1, 2, 3a–3c, 4, 5, 6a; esquema **v5**); teses curadas (155/169, PR #72); redesign fatias 1–6 (6a e 6b, PRs #76 e #77); 11.7 (PR #81) |
| **Só na `integracao`** (falta o merge diário do Gabriel) | PR #83, `/code-review` das etapas 8, 9 e 11 (14 achados corrigidos; relatório em [`../revisoes/f2-etapas-8-9-11.md`](../revisoes/f2-etapas-8-9-11.md)); esta consolidação. **Sem subida de esquema**: não pede backup |
| **Portões** | F0 fechado (23/09/2026). F1 em medição (14 dias com revisão em ≥ 10; linha de base em `docs/redesign/linha-de-base.md`). F2 aberto |
| **Verificação** | `npm run check` verde (1.593 testes no fechamento do #83); E2E dos specs tocados verde nos 3 aparelhos |

### Fases

| Fase | Entrega | Depende de | Estado |
|---|---|---|---|
| F0 | Fundamentos | — | ✅ portão fechado |
| F1 | Recall (MVP) e pontos | F0 | ✅ implementada; portão em medição |
| **F2** | Legislação: importar, estruturar, revisar, publicar, ler, corrigir; acervo, súmulas, teses | F1 (paralela ao uso) | **Em execução**: falta etapa 12 (12.2, 12.3, 6b), etapa 13 e o uso real |
| F1+ Frases | Captura pela frase correta, Revisar frases e Revisar cartões, oclusão, trecho da lei → frases (§1, §3 D) | F1; roda dentro do fechamento da F2 (exceção do R13) | decidida em 13/10/2026; não iniciada |
| F3-A | Hoje, Sessão e retorno após pausa | portão F2 | não iniciada |
| F3-B | Plano acionável e sugestões explicáveis | F3-A | não iniciada |
| V1 | Validação com 3 a 5 pessoas | F3 | não iniciada (roteiro: item 5.5 do redesign, arquivado) |
| F4 | Conta, sincronização, backup remoto, instalável offline | V1 | não iniciada |
| A1 | Captura de imagem com OCR local | F4 | não iniciada |
| A2 | Assistência opcional de IA | F4 (conta, cota, servidor) e A1 para o item 3 | não iniciada |
| C1 | Piloto pago e cobrança | F4, V1 e prontidão comercial | não iniciada |
| I1 | Exportações e integrações | esquemas estáveis (depois da F4) | não iniciada |
| M1 | Apps Android e iPhone (Capacitor) | F4 e V1/C1 | futuro, depois do básico |
| G1 | Extensões exploratórias | uso sustentado | backlog |

---

## 3. F2 — fechar a Legislação

Detalhe de cada atividade, fatos e rotina de pronto: [`F2.md`](F2.md) (etapas 12 e 13, "Critérios do portão").

### A. O que falta para o portão

| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| 13.1 ✔ 13/10/2026 | Segurança e LGPD da fase: payloads maliciosos no fluxo completo (colar e URL), tamanho máximo, vigilância de CSP; política de privacidade v2 (a busca por URL envia só o endereço da lei ao Cloudflare e ao site de origem) | Sonnet 5.5 **alto** | nuvem, sem rede |
| 13.2 ✔ 13/10/2026 | Orientações › Legislação e "Ajuda sobre esta tela" no leitor e no importador (menu Ajuda, D6) | Sonnet 5.5 médio | nuvem, sem rede |
| 13.3 ✔ 13/10/2026 | Backup com normas: exportar → apagar → restaurar idêntico com o CP inteiro; pacote só de `legislacao` com a fonte das versões | Sonnet 5.5 médio | nuvem, sem rede |
| 13.5 ✔ 13/10/2026 | Verificação de fechamento (pacote B abaixo) | Sonnet 5.5 médio | nuvem, sem rede |
| 12.2 | Publicar a rota `/api/buscar-norma` e chamar de verdade LEP, CF/88 (1,8 MB) e CC; conferir o limite de processamento; se estourar, plano B da T17 | Sonnet 5.5 médio (alto se estourar) | **Gabriel, com rede** |
| 12.3 | Campo URL na tela Importar (decodifica no aparelho, hash do sanitizado, oferece colar se falhar) | Sonnet 5.5 médio | nuvem, depois da 12.2 |
| 6b | Verificar atualização no site oficial pelo aparelho (D16), depois da 12.2 | Sonnet 5.5 médio | nuvem, depois da 12.2 |
| 13.4 | `portoes/F2.md` com cada critério ligado a um teste; README e `CLAUDE.md` | Sonnet 5.5 médio | nuvem, depois de 13.1–13.3 e 13.5 |
| — | **Uso real: 2 semanas lendo lei no Arretado** | — | **Gabriel** |

A etapa 12 não bloqueia a 13.1–13.3 nem a 13.5; se a 12.2 atrasar, a 13.4 registra a importação por URL como "pendente, com o colar como caminho principal" e o portão segue (D13: colar é o preferencial).

### B. Verificação de fechamento (13.5; verificar e estender, não reconstruir)

Cada item vira teste ou E2E quando ainda não houver; o que já está coberto é só apontado no portão.

1. Abre no dispositivo salvo; trocar tamanho de fonte e modo (texto/artigo) não perde a posição; recarregar, "Voltar" do navegador e aba restaurada no celular também não.
2. Alvos de toque ≥ 44 px, teclado, leitor de tela, sobreposições; axe nos dois temas nos 3 aparelhos.
3. Grifos e estrelas sobrevivem à correção do texto (11.7) e à atualização do acervo (6a): exata → aproximada → pendente em "Para reler".
4. Registrar erro a partir do leitor mantém o contexto; salvar ou cancelar volta ao mesmo dispositivo.
5. Fonte, data de coleta, versão e "editado à mão" visíveis no leitor e na Biblioteca.
6. Backup e restauração com dados representativos (com a 13.3).

**Candidatas, só se o uso real das 2 semanas pedir** (cada uma é atividade própria, Sonnet 5.5 médio): prévia editável do cartão antes de salvar; "Criar cartão deste trecho" a partir da seleção; aviso de resposta longa em vez de truncar.

### C. Pendências de conteúdo e melhorias sem pressa (não bloqueiam o portão)

| Item | Modelo | Onde roda |
|---|---|---|
| Lotes com rede: Súmula Vinculante 30, lotes 3b/3d, as 63 normas a converter (`acervo/a-converter.md`), fontes complementares do acervo | Sonnet 5.5 médio | **precisa de rede** (Gabriel ou ambiente liberado) |
| Busca de súmula por consulta no índice, em vez de abrir a coleção inteira | Sonnet 5.5 médio | nuvem |
| Correção do texto grava a norma inteira de novo (CF: ~5 mil textos); reduzir pede mudar o modelo, junto da F4 | — | F4 |
| Capturas "antes/depois" do redesign (6.4–6.7) | Sonnet 5.5 médio | nuvem |
| Backlog de 24/09/2026 (editar termos do destaque, "ignorar este destaque", remissões para outra norma, "citado por") | — | depois do portão da F2, ver `F2.md` › "Ordem e paralelismo" |

### D. Ajustes e Frases (decidido em 13/10/2026; entram depois da 13.5 e antes da 13.4 e do uso real, para as 2 semanas já testarem o fluxo novo)

| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| A | **Ajustes A**, sem esquema novo: (a) modo foco com a frase ou o artigo **no centro da tela**, vertical e horizontal, rolagem interna só se exceder; vale também para Revisar frases; (b) em Biblioteca › Acervo, seletor de **Disciplina** por item (padrão = curadoria; várias; "Outros") e "Mudar disciplina" em Normas; `aderirAoItem` aceita `disciplinas`; a atualização 6a preserva a escolha | Sonnet 5.5 médio | nuvem, sem rede |
| B | **Frases 1** — modelo e captura: esquema v6, migração, captura em 1 campo com disciplina e ponto lembrados em sequência; reserva `origem: ia` e a porta nula `ServicoDeIA` (§8, A2) | **Opus 5.5** (desenho do esquema) | nuvem; **backup do Gabriel antes do merge** |
| C | **Frases 2** — Revisar frases e Revisar cartões, cada um com cota; cartão a partir da frase, com lacuna e oclusão | Sonnet 5.5 médio | nuvem |
| D | **Frases 3** — "Enviar às frases" na seleção do leitor, ao lado de grifo e nota; reancoragem pela atualização 6a | Sonnet 5.5 médio | nuvem |

Cada pacote inclui o acabamento visual das telas que cria. A estética que sobra tem lugar certo: F3-A (Hoje e Sessão), **ajustes pós-validação** na V1 e F4-C (ícone, splash e manifesto). A 13.4 passa a listar o fluxo de Frases entre os critérios do portão.

### Portão da F2 (mantido)

Duas semanas lendo legislação no Arretado, não no Acervo antigo; critérios de `F2.md` › "Critérios do portão" ligados a teste; nenhum problema aberto de perda de dado ou de posição de leitura. O portão da F1 continua medido à parte.

---

## 4. F3-A — Hoje, Sessão e retorno após pausa

Planejamento e execução: **Opus 5.5**, só depois do portão da F2. Entidades novas (`Sessao`, `TarefaDeEstudo`) registradas no glossário na sessão de planejamento; subida de esquema segue R10.

| Pacote | Itens |
|---|---|
| 1. Uma próxima ação | Contrato local `ProximaAcao` (tipo, alvo, razão, estimativa opcional), domínio puro; revisão vencida primeiro; senão, a leitura salva (reaproveita "Continuar leitura" da Biblioteca, sem outro estado de leitura); "Escolher outra coisa" discreto; estado vazio com três começos concretos (adicionar material, escolher matéria, sessão de 10 minutos) |
| 2. Sessão leve | Começar pela ação recomendada em um toque; alvo e fronteira opcionais ("até o art. 15"); pausar sem declarar falha; ao fechar, pedir só o próximo passo pequeno, pré-preenchido; restaurar a sessão não fechada na volta |
| 3. Alavancas adiadas do redesign | Estacionamento de distração (um campo, local); temporizador opcional que nunca bloqueia nem impõe método; modo "só estudo" que esconde a administração; mensagem de retorno sem dívida nem sequência quebrada; fechar o Dia |
| 4. Perfis (opcional, por último) | Calmo, Guiado, Leitura, com prévia e volta atrás, nas condições da tabela de conflitos (§1); nenhum campo obrigatório |

**Portão F3-A:** abrir Hoje, começar uma tarefa, pausar e retomar sem reconstruir o plano; duração de sessão nunca é tratada como aprendizado.

## 5. F3-B — Plano como mapa acionável

| Pacote | Itens |
|---|---|
| 1. Pontos do programa | Editar disciplinas e pontos importados; prévia de importação com duplicatas; prioridade separada do status (não iniciado, em andamento, primeira passada, precisa revisar); vínculo de pontos a dispositivos, súmulas, teses, erros e cartões; atividade mostrada sem alegar domínio ("leu 3 de 5 artigos") |
| 2. Tarefas pequenas | "Ler arts. 10 a 13", não "estudar execução penal"; tarefa manual sem fonte; "Dividir esta tarefa"; não concluída fica na fila, sem atraso punitivo; adiar, pular e reordenar com significado claro |
| 3. Sugestões determinísticas | Regras explicáveis (revisão vencida, prioridade, erro recorrente, disciplina esquecida); mostrar **por que** foi sugerida; trocar na hora; capacidade semanal opcional; datas fixas de prova (Concurso, D7) separadas das tarefas flexíveis; estatísticas só acionáveis (D20) |

**Portão F3-B:** a pessoa vê o que importa, escolhe uma tarefa do tamanho certo e entende a sugestão sem manter calendário complexo. Sem IA.

## 6. V1 — Validação externa (depois da F3)

Ambiente de demonstração reiniciável; 3 a 5 pessoas; pedir para começar, retomar, registrar erro, revisar, sem instrução; observar onde hesitam ou perdem o contexto; registrar problemas, não notas de satisfação; corrigir os maiores atritos e repetir; perguntar "que ferramenta ou fluxo o Arretado substitui?". Medir a linha de base adiada (redesign 1.1) aqui. **Portão:** as tarefas centrais são entendidas sem ajuda ao vivo; usabilidade e disposição a pagar são perguntas separadas. Se a F3 atrasar muito, rever esta ordem (decisão 4 de 09/10/2026).

## 7. F4 — Conta, sincronização, backup e instalação

Planejamento e execução: **Opus 5.5**. Usa o projeto Supabase já criado (ver `referencia.md`).

| Bloco | Itens |
|---|---|
| F4-A Conta | Uso local continua sem conta; login **Google e Apple** pelo adaptador (D19; a Apple exige conta Apple Developer, ~US$ 99/ano, e "Entrar com Apple" é obrigatório na App Store quando há outro login social); contas com **plano** (direito de IA sim/não); dizer o que sai do aparelho; prévia da migração local → conta; conta com dados na nuvem tratada explicitamente; trocar de conta nunca mistura dados; sair definido; exportar, excluir conta em cascata e estado da exclusão |
| F4-B Sincronização | Um aparelho ativo (D17); offline e reconexão; envio interrompido e repetido; conflito mostrado, nunca sobrescrito em silêncio; "salvo neste aparelho" ≠ "com backup" ≠ "sincronizado"; restaurar de backup verificado; isolamento por RLS testado |
| F4-C Instalável | O que fica offline; instalar só onde há suporte; atualizar o app sem interromper estudo nem migração; pouco espaço e cache velho |

**Portão:** offline/reconexão e troca de aparelho sem perda nem mistura inexplicável de dados. Cobrança não começa antes disso.

## 8. Depois da F4

### A1 — Imagem com OCR local
Colar ou enviar imagem → cortar e girar → extrair texto **no aparelho** (avaliar Tesseract.js, carregado só sob pedido, em Worker, com progresso e cancelamento) → imagem ao lado do texto editável → escolher o trecho → preencher o registro de erro sem campo obrigatório novo → salvar. Validar tipo, tamanho e decodificação; guardar a imagem é opcional; nunca registrar imagem nem texto em log. PDFs depois (texto embutido primeiro; digitalizado com limite de páginas; licença revisada). **Portão:** economiza digitação sem esconder erro de extração ("não", prazo, letra da alternativa fáceis de notar); sem promessa de caligrafia.

### A2 — IA opcional
Oferta em **dois planos**: *sem IA* (tudo local, o app de hoje) e *com IA*; o direito é da conta (F4) e, sem ele, os botões de IA nem aparecem (R6: nunca bloqueia dado nem estudo manual). Recursos previstos, por valor: resumos; texto de imagem pelo OCR (A1); **questões → frases** (a IA propõe a frase correta e a disciplina); **busca inteligente nas leis do acervo** (pode pedir índice por similaridade, ex.: pgvector no Supabase, a decidir); plano de estudo pelo edital (sempre com as regras determinísticas da F3-B primeiro); cartão e lacuna sugeridos a partir de uma frase. **Já reservado nas Frases 1:** porta `ServicoDeIA` com implementação nula (IA desligada = app idêntico; sem rede o recurso some), sugestão como **Proposta** que se aceita, edita ou descarta (R4), `origem: ia` em Frase e Cartão, chave do modelo só no Worker (T18). Numeração: **T22** = Frases, **T23** = esta decisão, **T24** = apps.

Antes de qualquer função: decisão técnica nova registrada com o Gabriel (T22+), interface independente de fornecedor, credencial só no servidor, controle de acesso, cota por usuário e teto global de gasto, tempo limite e cancelamento, envio mínimo (nada de histórico não relacionado), retenção do fornecedor conferida, texto da fonte tratado como não confiável, proveniência do rascunho aceito. Ordem: sugerir cartão de um trecho → rascunhar Frase correta → estruturar texto do OCR → sugerir vínculos de programa → explicar distinção entre fontes → sugerir reconferir cartões após atualização. Limites: extração não prova gabarito; citação distinta de paráfrase; nada muda texto legal, agenda de revisão ou registro pessoal sozinho; geração em massa só depois de provar a pequena. Endpoint gratuito de avaliação não é base para prometer IA gratuita. **Portão:** conjunto de avaliação fixo; fidelidade, esforço de correção, aceitação, latência e custo; fica só o que vence o fluxo manual melhorado.

### C1 — Cobrança
Pré-requisitos (todos): termos e política revisados por pessoa habilitada; R7; material de terceiros verificado caso a caso; F4 pronta. Oferta inicial em concurso jurídico; página em torno do ciclo; demonstração com conteúdo permitido; coorte fundadora; depoimentos consentidos sem promessa clínica nem de aprovação. Gratuito: estudo local, captura manual, exportação. Pago (hipótese): confiabilidade na nuvem e fluxos avançados; R$ 19 × R$ 29 como hipóteses; medir custos antes da cota de IA; anual/vitalício só depois de entender retenção. Implementação: checkout hospedado, webhook autenticado e idempotente, assinatura e direitos no servidor (`Assinatura`, `Direito`), carência e comportamento offline definidos, expiração testada sem apagar dado (R6). **Portão:** não cobrar até o serviço ser confiável, o cancelamento funcionar e os requisitos comerciais estarem revistos.

### M1 — Apps Android e iPhone (futuro, depois do básico)
Manter o PWA e empacotar o mesmo código com **Capacitor** (React e Dexie reaproveitados; Play Store e App Store). Atenções: o iPhone pode limpar o armazenamento local (exige o sync da F4), notificações de revisão, login Apple e Google nativos, política de privacidade e exclusão de conta exigidas pelas lojas, contas de desenvolvedor (Apple ~US$ 99/ano; Google ~US$ 25 único). Independente da A2. Decisão **T24**, a confirmar com o Gabriel quando chegar a hora.

### I1 — Portabilidade (nesta ordem)
CSV de programa com mapeamento e duplicatas → TSV/CSV de cartões para o Anki (sem prometer agenda) → Markdown de notas com referência → calendário (.ics) com datas de prova → pacote de estudo versionado → integração viva só com demanda repetida. Todo importador/exportador: campos e omissões documentados, identificador estável, prévia, validação, ida e volta testada. Plataformas de questões: link e identificador, nunca raspagem.

### G1 — Exploratório (não é compromisso)
Pacotes de fontes compartilhados sem histórico pessoal (D12, F7), painel de mentor com compartilhamento revogável, parcerias, busca melhor (semântica só se a comum não bastar), revisão adaptativa com dados longitudinais, leitura em voz alta e captura por fala. Fora: marketplace, feed social, chatbot jurídico irrestrito, planejador autônomo.

### Contratos de dados por fase (criar só quando a fase começar)
`TarefaDeEstudo` e `Sessao` (F3); `RascunhoDeCaptura` e `Anexo` com retenção (A1); `ProvenienciaIA` (A2); posse da conta (F4); `Assinatura` e `Direito` (C1); manifesto de importação/exportação (I1). Separar: rascunho de OCR × erro confirmado; atividade × domínio; assinatura × posse dos dados. Nomes definitivos vão ao glossário na fase.

---

## 9. Próximas atividades, em ordem

| # | Atividade | Modelo | Onde roda |
|---|---|---|---|
| ~~1~~ | ~~**13.1** Segurança e LGPD da F2~~ ✔ 13/10/2026 | — | — |
| 2 | **13.3** Backup com normas | Sonnet 5.5 médio | nuvem, sem rede |
| ~~3~~ | ~~**13.2** Orientações › Legislação e ajuda contextual~~ ✔ 13/10/2026 | — | — |
| ~~4~~ | ~~**13.5** Verificação de fechamento (§3 B)~~ ✔ 13/10/2026 | — | — |
| 4a | **Ajustes A**: foco centralizado; disciplina ao trazer do acervo (§3 D) | Sonnet 5.5 médio | nuvem, sem rede |
| 4b | **Frases 1**: modelo e captura (esquema v6; **backup antes do merge**) | **Opus 5.5** | nuvem |
| 4c | **Frases 2**: Revisar frases e Revisar cartões, oclusão | Sonnet 5.5 médio | nuvem |
| 4d | **Frases 3**: Enviar às frases a partir do leitor | Sonnet 5.5 médio | nuvem |
| 5 | **12.2** Worker com chamada real | Sonnet 5.5 médio (alto se estourar) | **Gabriel, com rede** |
| 6 | **12.3** Campo URL, depois **6b** | Sonnet 5.5 médio | nuvem, depois da 12.2 |
| 7 | **13.4** Portão da F2 (documento) | Sonnet 5.5 médio | nuvem |
| 8 | **Uso real: 2 semanas** (já com o fluxo de Frases) | — | **Gabriel** |
| 9 | Planejamento da F3 | **Opus 5.5** | nuvem, só depois do portão |

Em paralelo, sem bloquear: lotes com rede (§3 C, Gabriel ou ambiente com rede) e a busca de súmula pelo índice (Sonnet 5.5 médio). Relato de problema do uso real fura a fila.

## 10. Decisões que esperam o Gabriel

1. **14 teses com número repetido** entre áreas (146 a 154): manter fora ou mudar o modelo para aceitar número por área (`acervo/relatorio-teses.md`).
2. **Sumário da importação** refletir a edição (hoje mostra a estrutura da fonte; ver `solucao-de-problemas.md`).
3. **Critério dos gabaritos no portão:** `F2.md` exige os gabaritos `conferida`, mas o programa do acervo (decisão D9 de 10/10/2026) transformou a reconferência em rotina de estudo; CP, ECA, CDC e CF seguem `pendente`. Decidir na 13.4 se o critério vira "medido com os gabaritos conferidos até a data" ou se a reconferência volta a ser etapa.
4. As suposições reversíveis das atividades 8.7 a 11.6 (lista no histórico: [`arquivo/proxima-sessao-ate-2026-10-13.md`](arquivo/proxima-sessao-ate-2026-10-13.md) › "Decisões pequenas"), sem pressa.
5. **Nomes e oclusão (Frases):** conferir na V1 se "Frases", "Revisar frases" e "Revisar cartões" ficam claros e se Biblioteca × Frases não confunde; oclusão com um trecho por cartão ou todos de uma vez (decidir nas Frases 2).
6. Merge da `integracao` no `main` (contém o PR #83 e este plano; sem backup necessário).

## 11. Dependências críticas

| Dependência | Se violada |
|---|---|
| F3 só depois do portão da F2 | Leitura instável contamina o planejamento |
| V1 depois da F3; F4 depois da V1 | Nuvem e conta construídas sobre fluxo não validado |
| A1, A2, C1 e voz depois da F4 | IA e cobrança sem conta, cota nem exclusão; dado preso num navegador (R6) |
| Subida de esquema com backup e recarregar abas (R10) | Perda de dado ou app quebrado em aba aberta |
| Esquema v6 (Frases 1) antes das 2 semanas de uso; Frases não antecipam a F3 | Uso real medido sobre o fluxo antigo; dado gravado no formato velho |
| Relato de uso real fura a fila | Plano à frente de defeito real |

## 12. Mapa dos documentos

| Arquivo | Papel |
|---|---|
| `docs/proxima-sessao.md` | Estado atual, próxima atividade e pendências; a referência operacional (Cloudflare, Supabase, comandos, mapa do código) fica em `docs/referencia.md` |
| `docs/planos/plano-mestre.md` | **Este**: ordem, fases, regras, decisões abertas |
| `docs/planos/proximos-passos.md` | Resumo em linguagem simples para o Gabriel |
| `docs/planos/F2.md` | Detalhe técnico da F2: fatos das fontes, atividades, rotina de pronto, critérios do portão |
| `docs/planos/fluxo-diario.md` | Branches, PRs, merge diário, backup, retomada |
| `docs/especificacao-parte1.md` §19, `parte2.md` §10.6 | D1–D24; regras do Legislação |
| `docs/decisoes-tecnicas.md` | T1–T21 |
| `docs/superpowers/specs/` | Desenhos aprovados (redesign, acervo); a ordem que eles citam foi substituída por este plano |
| `docs/glossario.md`, `docs/solucao-de-problemas.md` | Vocabulário; problemas conhecidos |
| `docs/planos/arquivo/` | Planos substituídos (curso de ação, redesign, acabamento, guia prático, histórico da próxima sessão, insumos deste plano), só para consulta |

### Outras IAs (do guia prático)
Claude Code: código, testes, revisão, decisões que mexem em dados. Perplexity: pesquisa com fontes (LGPD, licenças, preços, regras do Planalto). Gemini: textos longos, copy, crítica de capturas. O resultado de fora volta como 1 página em `docs/pesquisas/AAAA-MM-DD-assunto.md` e só vira regra depois de registrado aqui, em `decisoes-tecnicas.md` ou no `CLAUDE.md`. Nunca colar backup, dado de estudo, chave ou e-mail. Contexto para colar: [`../ia/briefing-externo.md`](../ia/briefing-externo.md).
