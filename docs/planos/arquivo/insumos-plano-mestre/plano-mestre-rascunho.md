# Arretado — Plano Mestre Consolidado

> **Insumo arquivado em 13/10/2026.** Consolidado (com correções) no [`plano-mestre.md`](../../plano-mestre.md), que vale em divergência.

> **Versão:** 1.0 (12/10/2026)  
> **Objetivo:** Reconciliação única entre o rascunho do Perplexity, `curso-de-acao.md`, `F2.md`, `redesign.md`, `proximos-passos.md`, portões F0/F1, e o estado real do código.  
> **Princípio:** Continuidade — preservar o que funciona, fechar a fase atual, avançar por entregas pequenas com portões explícitos.  
> **Regra de precedência:** Em divergência, vale este documento (atualizado pelo Gabriel a cada fechamento de bloco).

---

## 1. Escopo do produto e regras permanentes

### O loop completo de estudo

```text
Escolher tarefa gerenciável
→ Ler ou responder questão
→ Capturar erro
→ Confirmar a correção
→ Revisar
→ Retomar ou escolher a próxima tarefa
```

Toda funcionalidade deve fortalecer um desses passos.

### Regras que valem em todas as fases

| # | Regra |
|---|-------|
| R1 | Leitura, captura manual, revisão, planejamento e exportação funcionam sem conta nem rede. |
| R2 | Quatro áreas fixas: **Hoje, Plano, Recall, Biblioteca**. |
| R3 | Captura de erro tem **exatamente 2 campos obrigatórios**. Imagens, fontes, classificações e IA são opcionais. |
| R4 | IA externa produz **rascunhos** — nunca texto jurídico autoritativo nem alterações automáticas. |
| R5 | Usuário aprova todo material importado, extraído ou gerado antes de virar conteúdo de estudo. |
| R6 | Expiração da assinatura **nunca apaga dados pessoais nem bloqueia exportação**. |
| R7 | Nunca pedir diagnóstico nem fazer promessa clínica. |
| R8 | Preservar proveniência da fonte, histórico de versões e conflitos explícitos. |
| R9 | Uma mudança significativa de fluxo por vez. |
| R10 | Migrações de esquema exigem backup, verificação de compatibilidade e instruções de recuperação. |

### Esclarecimento importante

O projeto **já tem trabalho documentado** em modo foco, continuação de leitura, fontes curadas, atualização de versão e pendências de releitura. Este plano prevê **verificação e extensão** — não reconstrução — dessas funcionalidades.

---

## 2. Visão geral do roteiro

| Fase | Entrega principal | Dependência | Estado real (12/10/2026) |
|---|---|---|---|
| **R0** | Roteiro único e baseline verificado | Agora | **Concluído** (este documento) |
| **F2-close** | Leitura de legislação e captura contextual confiáveis | R0 | **100% pronto** — stages 10.1–10.4, 11.1–11.9, 11.7, fatia 6 do redesign concluídos |
| **F3-A** | Hoje, sessões e fluxo de retorno ao estudo | Portão F2 | **Não iniciado** |
| **F3-B** | Plano acionável e sugestões transparentes | F3-A | **Não iniciado** |
| **V1** | Validação externa de usabilidade (3–5 pessoas) | F3 | **Não iniciado** |
| **F4-A** | Login seguro e migração local→conta | V1 | **Não iniciado** |
| **F4-B** | Sincronização, backup, instalação offline | F4-A | **Não iniciado** |
| **A1** | Captura de tela/foto com OCR local | Núcleo estável; antes de A2 | **Não iniciado** |
| **A2** | Assistência opcional de IA com fontes | Acesso seguro e controles de uso | **Não iniciado** |
| **C1** | Piloto pago e cobrança | F4 + validação + prontidão comercial | **Não iniciado** |
| **I1** | Exportações portáveis e integrações seletivas | Esquemas estáveis | **Não iniciado** |
| **G1** | Parcerias, pacotes compartilhados, recursos avançados | Evidência de uso sustentado | **Backlog exploratório** |

> **Regra de visibilidade:** Manter apenas o pacote atual e os **próximos dois** visíveis no documento ativo da sessão (`proxima-sessao.md`).

---

## 3. R0 — Reconciliar o projeto antes de ampliar o escopo

Os documentos contêm entradas cronológicas de status e instruções antigas. A primeira tarefa é tornar o estado atual inequívoco.

### Tarefas pequenas

| ID | Tarefa | Responsável | Critério de pronto |
|---|---|---|---|
| R0.1 | Inventariar funcionalidades como: implementada, parcialmente implementada, não verificada, proposta | Claude | Lista única em `docs/planos/inventario-funcionalidades.md` |
| R0.2 | Reconciliar `README.md`, `CLAUDE.md`, `proxima-sessao.md`, `curso-de-acao.md` | Claude | Conflitos resolvidos; um só caminho visível |
| R0.3 | Separar instruções atuais de anotações históricas de sessão | Claude | `proxima-sessao.md` só com estado atual + próxima atividade |
| R0.4 | Confirmar o que está no `main`, deployado, ou só em branches de desenvolvimento | Gabriel + Claude | Tabela no `proxima-sessao.md` |
| R0.5 | Rodar verificações existentes e registrar resultados (não tratar resultados antigos como atuais) | Claude | `npm run check` e E2E verdes; relatório em `docs/planos/baseline-verificacoes.md` |
| R0.6 | Capturar a interface atual em mobile, tablet, desktop, nos dois temas | Claude | Prints em `docs/redesign/baseline-YYYY-MM-DD/` |
| R0.7 | Registrar migrações de dados conhecidas, requisitos de backup e decisões pendentes de curadoria de fontes | Gabriel + Claude | Seção em `docs/solucao-de-problemas.md` |
| R0.8 | Criar backlog único priorizado com dependências e critérios de aceite | Gabriel + Claude | `docs/planos/backlog-consolidado.md` |

### Portão de aceite R0

> Um único documento responde com precisão: **o que funciona, o que falta, o que vem a seguir, e o que não deve ser iniciado ainda**.

---

## 4. F2-close — Fechar a fundação de leitura e captura

### Pacote 1: Verificar comportamento de leitura existente

| ID | Tarefa | Dependência | Critério de pronto |
|---|---|---|---|
| F2.1 | Confirmar abertura no artigo salvo | 9.7 | E2E: abre no dispositivo correto |
| F2.2 | Testar mudança de tamanho de fonte e troca de modo de leitura sem perder posição | 9.7, 11.1 | Posição preservada em todos os casos |
| F2.3 | Testar recarregamento, botão Voltar do navegador, restauração de aba mobile, artigos longos | 9.6, 9.7 | Sem perda de posição ou conteúdo |
| F2.4 | Verificar alvos de toque (≥44px), interação por teclado, anúncios de leitor de tela, overlays | 9.6, 11.1 | axe verde nos 2 temas; E2E 3 aparelhos |
| F2.5 | Verificar que grifos e estrelas sobrevivem a atualizações de fonte e correções manuais | 11.7, 6a | Reancoragem exata → aproximada → pendente funciona |
| F2.6 | Concluir checagens documentadas de importação por URL real e catalogar problemas | 12.1, 12.2 | Relatório em `docs/planos/F2-url-import-checks.md` |

### Pacote 2: Melhorar captura e criação de cartão

| ID | Tarefa | Dependência | Critério de pronto |
|---|---|---|---|
| F2.7 | Preservar contexto do artigo ao abrir captura de erro a partir do leitor | 11.5 | Contexto mantido; voltar retorna ao mesmo artigo |
| F2.8 | Garantir que salvar ou cancelar retorna ao mesmo contexto de leitura | 11.5 | E2E: fluxo de ida e volta sem perda |
| F2.9 | Adicionar prévia editável do cartão antes de salvar | 6.3, 6.4 | Pré-visualização com edição; cancelar não salva |
| F2.10 | Suportar criar cartão a partir de trecho selecionado | 11.4 | Seleção → "Criar cartão" preenche questão/resposta |
| F2.11 | Avisar sobre respostas longas em vez de truncar silenciosamente | 6.3 | Alerta explícito; não perde dados |
| F2.12 | Manter captura de erro curta; revelar campos opcionais só sob demanda | 6.2 | 2 campos obrigatórios visíveis; "Mais detalhes" expande |

### Pacote 3: Confiabilidade e confiança

| ID | Tarefa | Dependência | Critério de pronto |
|---|---|---|---|
| F2.13 | Verificar backup/restauração com dados reais representativos | 9.1, 13.3 | Restore idempotente; dados íntegros |
| F2.14 | Exibir fonte, data de coleta, versão e status de edição manual | 9.3, 9.5, 11.7 | Metadados visíveis no leitor e na Biblioteca |
| F2.15 | Verificar prévias de atualização e pendências de releitura | 6a, 11.7 | "Para reler" lista pendências; grifos reancorados |
| F2.16 | Revisar complexidade do leitor; refatorar só atrás de testes que preservam comportamento | 9.6, 11.1, 11.8 | Cobertura de testes mantida; performance não regredir |
| F2.17 | Completar verificações pendentes de segurança, privacidade, performance, acessibilidade | Todas | Checklist em `docs/planos/F2-close-checklist.md` |

### Portão de aceite F2 (existente, mantido)

> **Duas semanas lendo legislação no Arretado** (não no Acervo), junto com os requisitos documentados de verificação de fontes.  
> Problemas bloqueantes de perda de dados e posição de leitura devem estar resolvidos.  
> O portão da F1 (14 dias com revisão em ≥10) continua medido separadamente.

---

## 5. F3-A — Hoje, sessões e retorno após pausa

### Pacote 1: Uma próxima ação

| ID | Tarefa | Detalhe |
|---|---|---|
| F3A.1 | Definir contrato local `ProximaAcao`: tipo de ação, alvo, razão, estimativa opcional | Domínio puro |
| F3A.2 | Recomendar revisão vencida quando houver | Prioridade 1 |
| F3A.3 | Caso contrário, oferecer tarefa de leitura salva | Continuidade |
| F3A.4 | Opção silenciosa "Escolher outra coisa" | Sem pressão |
| F3A.5 | Substituir estados vazios por alternativas acionáveis | Ex.: "Registre seu primeiro erro" |
| F3A.6 | Reaproveitar lógica de continuação da Biblioteca em vez de criar outro sistema de estado de leitura | DRY |

### Pacote 2: Sessões leves

| ID | Tarefa | Detalhe |
|---|---|---|
| F3A.7 | Iniciar sessão a partir da ação recomendada | Um toque |
| F3A.8 | Registrar alvo e fronteira de conclusão opcional | Ex.: "até o art. 15" |
| F3A.9 | Permitir pausar sem declarar falha | Botão "Pausar" |
| F3A.10 | Ao fechar, perguntar apenas o próximo passo pequeno; pré-preencher quando possível | "Próximo: ler art. 16" |
| F3A.11 | Restaurar contexto não finalizado na próxima visita | Persistência local |

### Pacote 3: Ajudas opcionais de concentração (já previstas no `curso-de-acao.md`)

| ID | Tarefa | Detalhe |
|---|---|---|
| F3A.12 | Estacionamento de distração: uma anotação rápida, local, sem abrir novo módulo | Campo único, salvo em `sessao.distracoes` |
| F3A.13 | Temporizador opcional que nunca bloqueia estudo nem força método fixo | Configurável; alerta suave |
| F3A.14 | Modo "só estudo" que esconde administração | Toggle na Hoje |
| F3A.15 | Mensagem de retorno após pausa sem dívida de dia perdido nem punição de streak quebrado | Tom acolhedor |

### Portão de aceite F3-A

> Consegue abrir Hoje, iniciar uma tarefa, pausar, e retomar sem reconstruir o plano.  
> Preservar o alvo existente de fechamento do dia (F3) onde aplicável; não igualar duração de sessão a aprendizado.

---

## 6. F3-B — Transformar Plano em mapa de estudo acionável

### Pacote 1: Organizar pontos do programa

| ID | Tarefa | Detalhe |
|---|---|---|
| F3B.1 | Adicionar edição para disciplinas e pontos importados | CRUD completo |
| F3B.2 | Pré-visualizar importações e tratamento de duplicatas antes de aplicar | Diff visual |
| F3B.3 | Separar prioridade atribuída pelo usuário de status de estudo | Dois campos distintos |
| F3B.4 | Adicionar status: não iniciado, em progresso, primeira passada concluída, precisa revisão | 4 estados claros |
| F3B.5 | Vincular pontos a artigos, súmulas, teses, erros e cartões | Grafo navegável |
| F3B.6 | Mostrar atividade relevante sem alegar domínio | "Você leu 3/5 artigos" ≠ "domina" |

### Pacote 2: Tarefas pequenas

| ID | Tarefa | Detalhe |
|---|---|---|
| F3B.7 | Criar tarefas como "Ler arts. 10–13", não apenas "Estudar execução penal" | Granularidade acionável |
| F3B.8 | Permitir tarefas manuais sem link de fonte | Livre |
| F3B.9 | Suportar dividir tarefa que se revelou grande | "Dividir aqui" |
| F3B.10 | Manter tarefas não concluídas em fila em vez de criar dívida de atraso automática | Sem "atrasado" punitivo |
| F3B.11 | Permitir adiar, pular e reordenar com semântica clara | Ações explícitas |

### Pacote 3: Recomendações determinísticas

| ID | Tarefa | Detalhe |
|---|---|---|
| F3B.12 | Definir regras transparentes: revisão vencida, prioridade, erros recorrentes, disciplinas negligenciadas | Algoritmo explicável |
| F3B.13 | Exibir **por que** uma tarefa foi sugerida | "Sugerido: 3 cartões vencidos + prioridade alta" |
| F3B.14 | Tornar override manual imediato | Arrastar/sobrescrever |
| F3B.15 | Adicionar estimativa semanal de capacidade opcional | "Tenho ~8h/semana" |
| F3B.16 | Manter datas fixas de prova separadas de tarefas flexíveis de estudo | Dois modelos |

### Portão de aceite F3-B

> Usuário identifica o que importa, seleciona tarefa gerenciável, e entende a sugestão sem manter calendário complexo.  
> **Planejamento por IA não é necessário aqui.**

---

## 7. V1 — Validação externa antes de nuvem e monetização

O plano existente coloca teste externo após F3. Manter a menos que decisão explícita em contrário.

### Tarefas pequenas

| ID | Tarefa |
|---|---|
| V1.1 | Preparar workspace de demonstração reiniciável |
| V1.2 | Recrutar 3–5 testadores iniciais |
| V1.3 | Pedir para iniciar, retomar, capturar, revisar sem instrução |
| V1.4 | Observar onde hesitam ou perdem contexto |
| V1.5 | Registrar problemas, não só notas de satisfação |
| V1.6 | Corrigir os atritos de maior fricção |
| V1.7 | Repetir tarefas após mudanças |
| V1.8 | Perguntar: "Que ferramenta ou fluxo atual o Arretado realmente substitui?" |

### Portão de aceite V1

> Tarefas centrais compreensíveis sem orientação ao vivo.  
> Separar evidência de usabilidade de disposição a pagar; respondem perguntas diferentes.

---

## 8. F4 — Login, sincronização, backup e instalação

### F4-A: Criação de conta segura

| ID | Tarefa |
|---|---|
| F4A.1 | Manter uso local (convidado) disponível |
| F4A.2 | Adicionar login Google via adaptador de autenticação planejado |
| F4A.3 | Explicar quais dados sairão do aparelho |
| F4A.4 | Pré-visualizar migração de workspace local para conta |
| F4A.5 | Tratar contas com dados na nuvem existentes explicitamente |
| F4A.6 | Impedir que troca de conta misture trabalho de dois usuários |
| F4A.7 | Definir comportamento de logout |
| F4A.8 | Adicionar exportação, exclusão de conta e mensagens de estado de exclusão |

### F4-B: Sincronização e recuperação

| ID | Tarefa |
|---|---|
| F4B.1 | Implementar modelo de um aparelho ativo (já decidido) |
| F4B.2 | Testar alterações offline e reconexão |
| F4B.3 | Testar uploads interrompidos e operações repetidas |
| F4B.4 | Exibir conflitos de sincronização em vez de sobrescrever silenciosamente |
| F4B.5 | Separar "salvo neste aparelho", "backupeado", "sincronizado" |
| F4B.6 | Adicionar recuperação a partir de backup verificado |
| F4B.7 | Testar isolamento de propriedade e permissões server-side |

### F4-C: Experiência instalável offline

| ID | Tarefa |
|---|---|
| F4C.1 | Definir quais assets e materiais de estudo ficam disponíveis offline |
| F4C.2 | Adicionar orientação de instalação só onde suportado |
| F4C.3 | Lidar com atualizações do app sem interromper estudo ativo ou migração de esquema |
| F4C.4 | Testar falhas de armazenamento, pouco espaço, caches obsoletos |

### Portão de aceite F4

> Testes offline/reconectar e troca de aparelho mostram **nenhuma perda ou mistura de dados inexplicável**.  
> Cobrança **não inicia** antes de conta, sincronização e exclusão estarem prontas.

---

## 9. A1 — Captura de screenshots e fotos com OCR

Interpreto "erros de print" como screenshots de questões/explicações + fotos de questões impressas ou anotações manuscritas.

**Começar com extração de imagem para texto — não geração automática de resposta.**

### Fluxo proposto

```text
Colar ou fazer upload de imagem
→ Cortar e rotacionar
→ Extrair texto localmente
→ Comparar imagem com texto editável
→ Confirmar trecho útil
→ Preencher formulário de erro existente
→ Salvar
```

### Pacote 1: Entrada de imagem

| ID | Tarefa |
|---|---|
| A1.1 | Aceitar imagens do clipboard e upload de arquivo de imagem |
| A1.2 | Adicionar captura por câmera onde suportado |
| A1.3 | Validar tipo, tamanho, dimensões, decodificação |
| A1.4 | Prover corte e rotação |
| A1.5 | Retenção de imagem opcional |
| A1.6 | Evitar logar imagens ou texto extraído |

### Pacote 2: OCR local

| ID | Tarefa |
|---|---|
| A1.7 | Avaliar Tesseract.js com screenshots de questões em português |
| A1.8 | Carregar assets de OCR só quando solicitado (lazy) |
| A1.9 | Processar fora da thread de UI (Web Worker) |
| A1.10 | Mostrar progresso e permitir cancelamento |
| A1.11 | Comparar extração contra conjunto de avaliação transcrito manualmente |
| A1.12 | Testar imagens borradas, colunas, texto pequeno, celulares de entrada |

> **Nota técnica:** Tesseract.js suporta OCR no navegador via WebAssembly. Não suporta PDF diretamente; PDF precisa de etapa separada de extração/renderização. OCR offline local requer que engine e assets de idioma estejam disponíveis no dispositivo. [github.com/naptha/tesseract.js](https://github.com/naptha/tesseract.js/)

### Pacote 3: Confirmação e captura

| ID | Tarefa |
|---|---|
| A1.13 | Mostrar imagem original ao lado do texto extraído editável |
| A1.14 | Preservar incerteza visível em vez de inventar texto faltante silenciosamente |
| A1.15 | Permitir selecionar questão, explicação ou fragmento relevante |
| A1.16 | Popular rascunho de erro sem adicionar campos obrigatórios |
| A1.17 | Manter seleção de resultado manual a menos que usuário confirme sugestão |
| A1.18 | Adicionar URL, identificador e fonte da questão como opcionais |

### Pacote 4: PDFs (depois)

| ID | Tarefa |
|---|---|
| A1.19 | Extrair texto embutido de PDFs nativos de texto primeiro |
| A1.20 | Para PDFs digitalizados, renderizar páginas selecionadas em imagens antes do OCR |
| A1.21 | Limitar contagem de páginas e permitir cancelamento |
| A1.22 | Revisar licenças de bibliotecas antes de adotar ferramentas de PDF |

### Portão de aceite A1

> OCR economiza tempo de digitação em screenshots representativos **sem esconder erros de extração**.  
> Um "não", prazo ou letra de alternativa extraídos errado deve ser **fácil de notar e corrigir**.  
> Não prometer reconhecimento confiável de caligrafia na primeira versão.

---

## 10. A2 — Assistência opcional de IA

### Infraestrutura compartilhada primeiro

| ID | Tarefa |
|---|---|
| A2.1 | Registrar decisão arquitetural permitindo assistência opcional baseada em rede |
| A2.2 | Criar interface independente de provedor |
| A2.3 | Guardar credenciais server-side |
| A2.4 | Validar requisições e respostas estruturadas |
| A2.5 | Exigir autenticação ou outro controle de acesso deliberado |
| A2.6 | Adicionar cotas por usuário, limites globais de gasto, timeouts, cancelamento |
| A2.7 | Minimizar payloads; excluir histórico de estudo não relacionado |
| A2.8 | Estabelecer requisitos de privacidade e retenção do provedor |
| A2.9 | Tratar texto de fonte como entrada não confiável; não dar autoridade de escrita ao modelo |
| A2.10 | Registrar proveniência para rascunhos aceitos |

> **Nota:** NVIDIA descreve endpoints hospedados gratuitos para desenvolvimento e prototipação. Isso é motivo para **avaliar** — não base para prometer IA gratuita em produção. Atualiza a orientação antiga baseada em créditos. [developer.nvidia.com/nim](https://developer.nvidia.com/nim)

### Ordem das funcionalidades

| Ordem | Uso de IA | Entradas | Revisão obrigatória |
|---|---|---|---|
| 1 | Sugerir cartão focado | Trecho legal selecionado | Editar/aceitar questão e resposta |
| 2 | Rascunhar "Frase correta" | Nota de erro + fonte relevante | Confirmar sentido jurídico |
| 3 | Estruturar texto OCR | Extração confirmada | Verificar questão, alternativas, explicação |
| 4 | Sugerir vínculos de programa | Conteúdo de estudo + pontos disponíveis | Aceitar links propostos |
| 5 | Explicar distinção | Fontes selecionadas | Verificar passagens de apoio |
| 6 | Sugerir rechecagem de cartões após atualização | Passagem antiga/nova + cartões vinculados | Aprovar mudanças individualmente |

### Fronteiras

- Extração não é prova da resposta correta.
- IA não deve inferir gabarito oficial só pela aparência.
- Explicações geradas devem distinguir citação de paráfrase.
- Nenhuma alteração automática em texto legal, agendamento de revisão ou registros pessoais.
- Fonte indisponível no app não deve ser citada como se recuperada.
- Geração de deck em massa só após qualidade de rascunhos pequenos demonstrada.

### Portão de aceite A2

> Usar conjunto de avaliação fixo, revisado manualmente. Medir fidelidade fática, esforço de correção, taxa de aceitação, latência e custo. Manter funcionalidade só se superar fluxo manual melhorado.

---

## 11. C1 — Marketing, precificação e cobrança

### Pacote 1: Posicionamento e preparação de lançamento

| ID | Tarefa |
|---|---|
| C1.1 | Focar oferta inicial em estudo para concurso jurídico |
| C1.2 | Construir landing page em torno do loop ler → erro → revisar → retomar |
| C1.3 | Produzir demonstrações curtas com conteúdo de amostra permitido |
| C1.4 | Publicar changelog claro |
| C1.5 | Recrutar pequena coorte de usuários fundadores |
| C1.6 | Coletar depoimentos específicos, consentidos, sem promessas clínicas ou de aprovação |

### Pacote 2: Validar oferta paga

| ID | Tarefa |
|---|---|
| C1.7 | Manter estudo local, captura manual e exportação gratuitos |
| C1.8 | Testar pagamento por confiabilidade na nuvem e conveniência de fluxos avançados |
| C1.9 | Testar R$19 vs R$29 mensais como hipóteses, não preços finais |
| C1.10 | Medir custos de provedor de pagamento, armazenamento, IA, suporte |
| C1.11 | Definir cota de IA limitada só após medição de uso |
| C1.12 | Adiar ofertas anuais ou vitalícias até entender retenção e custos |

### Pacote 3: Implementação de cobrança

| ID | Tarefa |
|---|---|
| C1.13 | Selecionar provedor após confirmar requisitos de pagamento recorrente |
| C1.14 | Usar checkout hospedado |
| C1.15 | Verificar autenticidade de webhooks |
| C1.16 | Tratar eventos duplicados, faltantes e fora de ordem |
| C1.17 | Manter registros server-side de assinatura e direitos |
| C1.18 | Adicionar histórico de pagamentos, data de renovação, cancelamento |
| C1.19 | Definir períodos de graça e comportamento de recursos pagos offline |
| C1.20 | Testar expiração sem apagar dados nem bloquear estudo manual |

### Pacote 4: Prontidão comercial

| ID | Tarefa |
|---|---|
| C1.21 | Revisar termos, política de privacidade, permissões de conteúdo, contratos de provedores |
| C1.22 | Resolver obrigações societárias, fiscais, consumeristas, reembolso |
| C1.23 | Criar processo de suporte e incidentes |
| C1.24 | Definir tratamento de cancelamento e reembolso do piloto pago |

### Portão de aceite C1

> **Não cobrar** até que o serviço prometido seja confiável, o caminho de cancelamento funcione, e os requisitos comerciais tenham sido revisados adequadamente.

---

## 12. I1 — Integração e portabilidade

Implementar nesta ordem:

1. Importação/exportação CSV de programa com mapeamento e prévia de duplicatas
2. Exportação TSV/CSV de cartões para Anki
3. Exportação Markdown de notas selecionadas com referências
4. Exportação de arquivo de calendário para datas fixas de prova e sessões selecionadas
5. Exportação/importação de pacote de estudo versionado
6. Integrações ao vivo só onde demanda repetida de usuários justificar

> Anki suporta importação de texto delimitado, tornando portabilidade básica de cartões possível sem manter integração viva com Anki. [docs.ankiweb.net](https://docs.ankiweb.net/manual/importing/text-files)

### Tarefas pequenas para todo importador/exportador

- Definir campos suportados e informação omitida
- Preservar identificadores estáveis onde apropriado
- Pré-visualizar mudanças
- Validar arquivos antes de aplicar
- Testar viagens de ida e volta
- Documentar o que não transfere
- **Nunca alegar** que cartões exportados preservam agendamento a menos que explicitamente suportado

Para plataformas de questões: começar com links e identificadores — não scraping nem reprodução de bancos proprietários.

---

## 13. G1 — Extensões posteriores, não compromissos atuais

Manter em backlog exploratório separado:

- Pacotes de fontes compartilhados sem histórico pessoal
- Dashboards de mentor com compartilhamento explícito e revogável
- Parcerias com educadores de estudo jurídico
- Busca full-text e cross-source melhorada
- Busca semântica opcional **após provar busca ordinária insuficiente**
- Agendamento de revisão adaptativo **após dados longitudinais suficientes**
- Captura por fala após checar necessidades de privacidade e acessibilidade
- Curadoria colaborativa com moderação e proveniência

**Não adicionar** marketplace, feed social público, chatbot jurídico irrestrito, ou planejador autônomo apenas porque são tecnicamente possíveis.

---

## 14. Fechar lacunas do modelo de dados antes da implementação

Criar contratos explícitos para estes conceitos; não adicionar toda tabela de imediato.

| Conceito | Propósito | Introduzir com |
|---|---|---|
| `StudyTask` | Ação pequena, alvo, estado, razão | F3 |
| `Session` | Início, pausa, fechamento, próximo passo | F3 |
| `CaptureDraft` | Texto/imagem extraída aguardando confirmação | A1 |
| `Attachment` | Imagem original opcional e escolha de retenção | A1 |
| `AIProvenance` | Provedor/modelo, versão da fonte, status de rascunho | A2 |
| `AccountOwnership` | Associação segura local-para-conta | F4 |
| `Subscription` | Estado do provedor e referências de cobrança | C1 |
| `Entitlement` | Funcionalidades atualmente disponíveis para a conta | C1 |
| `ImportExportManifest` | Versão e informação de compatibilidade | I1 |

**Princípios de separação:**
- Rascunhos OCR separados de erros confirmados
- Atividade separada de domínio/mastery
- Estado de assinatura separado de posse de dados pessoais

---

## 15. Definição de pronto para cada tarefa pequena

Cada tarefa deve ter:

- **Um resultado visível**
- **Dependência explícita**
- **Escopo de implementação estreito**
- **Testes de aceite**
- **Implicações de segurança/privacidade**
- **Notas de migração e recuperação** quando necessário
- **Ajuda ao usuário atualizada** onde comportamento muda

### Exemplo

```text
Tarefa: Pré-visualizar cartão antes de salvar

Dependência: criação de cartão de artigo existente
Escopo: prévia, editar, confirmar, cancelar
Exclui: geração por IA e mudanças de agendamento

Aceite:
- Cancelar não salva nada
- Duplo clique cria no máximo um cartão
- Referência da fonte permanece anexada
- Conteúdo grande produz aviso explícito
- Interação por teclado e mobile funciona
```

### Processo

- Usar fluxo de branch/PR estabelecido no repositório (`fluxo-diario.md`)
- Mudanças de esquema e trabalho de dados de alto risco **não** entram em PRs cosméticos
- `npm run check` verde (lint, tipos, testes, auditoria) + E2E verde quando houver tela
- Problemas encontrados (e previsíveis da próxima etapa) registrados em `docs/solucao-de-problemas.md`
- Termo ou identificador novo registrado em `docs/glossario.md`

---

## 16. Estado atual real (12/10/2026) — para não recomeçar do zero

### O que já está no `main` (deployado em https://arretado.gabrieldjcosta.workers.dev)

| Área | Entregas confirmadas |
|---|---|
| **F0** | Banco local (Dexie v2), esquema versionado, log, backup/restore com modos e prévia, sanitizador, shell, Conta/Ajustes, RLS no Supabase real |
| **F1** | Recall completo: captura 2 campos, frase correta, cartão opcional, 6 caixas, drill, lista passiva, pontos importados (CSV), exportação/importação segura |
| **F2 — Corpus/estruturador** | 7.1–7.4: corpus 5 normas (11 páginas), colados, gabaritos; 8.1–8.9: normalização, estruturador (pré-normativo, artigo, dispositivos, notas, redações, anexos, validação, texto puro), regressão do corpus; 8.10: subida esquema `vetado` |
| **F2 — Publicação/leitura** | 9.1–9.7: leituras (Dexie), serviço do rascunho, publicar, leitura por janela, Biblioteca › Normas + Importar, leitor virtualizado, posição lembrada, "lido até", "Continuar leitura" |
| **F2 — Leitor avançado** | 9.8: destaque automático condicionantes/prazos; 11.1: modo foco; 11.6: busca na norma; 11.4: grifos e notas; 11.2: estrela (herança por bloco); 11.5: ações por dispositivo; 11.8: artigo por artigo; 11.9: prévia de remissões |
| **F2 — Editor/revisão** | 10.1: revisão do rascunho; 10.2: editor de linhas; 10.3: correção por bloco; 10.4: edição integral + escrever do zero; 11.7: corrigir texto publicado (versão nova + histórico) — **todas no `main` via PRs #80, #81** |
| **Acervo** | Peças 1–6a: estrela discreta, palco do foco, pipeline (curadoria, gerar, verificar), tela do acervo (abas, disciplinas), súmulas (5 tribunais), teses (adaptador), atualização 6a (esquema v5, `pendenciasReleitura`) |
| **Redesign** | Fatias 1–6 **concluídas** (tokens, fontes, casca, Recall, Conta/acabamento, fatia 6: tokens sálvia, menu Ajuda, drill centrado, leitor refinado) — fatia 6 em branches `claude/acabamento-6a/6b` aguardando merge |

### O que está em PR / branch / pendente de merge no `main`

| Item | Branch/PR | Estado |
|---|---|---|
| **11.7 (corrigir texto publicado)** | PR #81 → `integracao` → `main` | **Mergeado em 11/10/2026** |
| **Redesign fatia 6 (6.1–6.8)** | `claude/acabamento-6a`, `claude/acabamento-6b` | **Concluída em 11/10/2026** — aguarda merge do Gabriel no `main` |
| **Teses brutas → JSON curado** (adaptador `teses`) | Próxima atividade | Aguarda decisão do Gabriel (14 teses com número repetido entre áreas) |

### O que espera o Gabriel (com rede)

| Item | Descrição |
|---|---|
| 12.2 | Publicar Worker `/api/buscar-norma` e testar com chamadas reais (CF/88 1,8 MB, LEP, CC) |
| 12.3 | Campo URL na tela Importar |
| 6b | Atualização pelo aparelho (pós-12.2) |
| SV 30 | Súmula Vinculante 30 (pendente de publicação no STF) |
| 3b/3d | Lote de súmulas/teses com rede |
| 63 normas | Converter para Markdown e ligar na curadoria (`acervo/a-converter.md`) |

### Pendências de decisão do Gabriel

1. **14 teses com número repetido** entre áreas — incluir ou não?
2. **Sumário da importação** — deve refletir a edição (hoje mostra estrutura da fonte)?
3. **Capturas "antes/depois" do redesign** (fatias 6.4–6.7) — ainda não geradas
4. **Code-review das etapas 8, 9 e 11** — exige Opus; agendar

---

## 17. Próximas 3 tarefas de implementação (foco imediato) — **ATUALIZADO 12/10/2026**

Para evitar transformar o roteiro em dez projetos simultâneos:

| Ordem | Tarefa | Modelo | Onde roda | Estado |
|---|---|---|---|---|
| **1** | `/code-review` das etapas 8, 9 e 11 | **Opus** | Nuvem, sem rede | **Próxima** |
| **2** | Curar teses brutas → JSON (adaptador `teses`; 14 teses com número repetido para decisão) | Sonnet 5.5 médio | Nuvem, sem rede | **Pendente decisão do Gabriel** |
| **3** | Etapa 12.2 (publicar Worker `/api/buscar-norma` com rede) + 12.3 (campo URL na tela Importar) + 6b (atualização pelo aparelho) | Sonnet 5.5 alto | **Exige Gabriel com rede** | **Aguardando Gabriel** |

> **Fatia 6 do redesign (6.1–6.8): CONCLUÍDA em 11/10/2026** — branches `claude/acabamento-6a` e `claude/acabamento-6b` prontos.  
> **Etapas 10.2, 10.3, 10.4, 11.7: CONCLUÍDAS em 11/10/2026** — no `main` via PRs #80, #81.  
> **Depois do code-review (Opus):** fechar portão da F2 (2 semanas de uso real lendo lei no Arretado) e iniciar F3.  
> OCR (A1) e IA (A2) permanecem **bem especificados**, mas **não deslocam** a fundação que torna sua saída útil.

---

## 18. Dependências críticas não negociáveis

| Dependência | Origem | Impacto se violada |
|---|---|---|
| F3 só começa após **portão da F2 fechado** | `CLAUDE.md`, `curso-de-acao.md` | Fundação de leitura instável contamina planejamento |
| Cobrança (C1) exige **F4 pronta** (login, sync, exclusão) | `curso-de-acao.md` Decisão 4 | Dados presos em um navegador; viola R6 |
| Validação externa (V1) **só após F3** | `curso-de-acao.md` Decisão 4 | Meses sem evidência externa — risco aceito, mitigação: roteiro pronto antes |
| Subida de esquema exige **backup manual do Gabriel + recarregar abas** | `proxima-sessao.md`, `fluxo-diario.md` | Perda de dados ou app quebrado em abas abertas |
| Relatos de uso das férias **furem a fila** | `curso-de-acao.md` Regra | Correções reais têm prioridade sobre plano |

---

## 19. Referências rápidas (arquivos-chave)

| Arquivo | Propósito |
|---|---|
| `docs/proxima-sessao.md` | **Estado atual + próxima atividade** (ler no início de toda sessão) |
| `docs/planos/curso-de-acao.md` | Linha do tempo única, decisões, dependências |
| `docs/planos/F2.md` | Plano detalhado da F2, fatos das fontes, andamento |
| `docs/planos/redesign.md` | Fatias 1–6, rotina de pronto, convivência com F2 |
| `docs/planos/acabamento.md` | Fatia 6 aprovada (tokens sálvia, menu Ajuda, drill, leitor) |
| `docs/planos/proximos-passos.md` | Resumo para o Gabriel: feito, em andamento, próximo, pendências |
| `docs/portoes/F0.md`, `F1.md` | Critérios de aceite das fases |
| `docs/especificacao-parte1.md` §19 | Decisões D1–D24 (não reabrir sem motivo explícito) |
| `docs/decisoes-tecnicas.md` | T1–T21 (obedecem D1–D24) |
| `docs/glossario.md` | Vocabulário → identificadores de código |
| `docs/solucao-de-problemas.md` | Sintomas, causas, soluções conhecidas |
| `docs/planos/fluxo-diario.md` | Branches, commits, PRs, merge diário, backup, retomada |

---

## 20. Como usar este documento

1. **No início de cada sessão:** Ler `docs/proxima-sessao.md` + este plano (seção relevante).
2. **Ao planejar uma atividade:** Consultar a fase correspondente aqui; criar tarefas com definição de pronto (§15).
3. **Ao fechar uma atividade:** Atualizar `proxima-sessao.md`, `solucao-de-problemas.md`, `glossario.md` se houver termo novo.
4. **Ao mudar de fase:** Atualizar este documento (seção de estado + próximas 3 tarefas) e obter validação do Gabriel.
5. **Nunca** trabalhar em mais de uma fase principal simultaneamente (exceto redesign rodando entre atividades da F2, como acordado).

---

**Fim do plano mestre consolidado.**  
Próxima atualização: após `/code-review` (Opus) das etapas 8, 9 e 11.