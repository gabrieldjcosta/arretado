# Arretado — Especificação de Produto e Arquitetura (Parte 1, revisão 2)

> **Nome:** o produto chama-se **Arretado** (nome provisório; até 22/09/2026 os documentos usavam "Acumen"). "Acumen v2" designa o protótipo anterior, que será importado, não mantido.

**Escopo:** seções 1–7, 15, 16 e 19. As seções 8–14, 17, 18 e 20 ficam para a Parte 2.

## O que mudou nesta revisão (em relação à v1)

| Tema | v1 | Revisão 2 |
|---|---|---|
| Usuários | Uso pessoal | Uso pessoal agora, **estrutura preparada para outros usuários** isolados entre si e para um **catálogo compartilhado de normas** com pacotes de incidência por carreira |
| Remoto | Firestore atrás de adaptador | **Supabase/Postgres** (auth com Google preparada, RLS por usuário, região Brasil) |
| Legislação | Fase 4 | **Fase 2** — leitor é prioridade; modo foco, estrela com herança por bloco, hierarquia completa acima e abaixo do artigo, redações anteriores ocultas, notas de vigência atenuadas |
| Entrada de norma | Texto colado | **Colar HTML** (preferencial) + **URL** (alternativa) com "verificar atualização" leve |
| Sincronização | Espelho oportunista | Automática ao abrir, **um aparelho ativo por vez**, botão "Sincronizar agora", diálogo de conflito com escolha explícita |
| Segurança/LGPD | Seção futura | **Requisito transversal desde F0**, com critério de aceite por fase; rodapé de responsabilidade; sanitização de HTML colado |
| Concurso | Data da prova | **Fases e prazos** editáveis; vários concursos como caso normal |
| Erro | Resultado + causa | + **frase correta** (= verso do cartão) e **lista de revisão passiva** |
| Ajustes | Fora da navegação | **Conta e Ajustes** com Orientações, "?" contextual e "!" Relatar problema |
| Vocabulário | "Dispositivo" = unidade da lei | Mantido; o equipamento do usuário passa a se chamar **Aparelho** para não colidir |

**Vocabulário canônico** (deve ser o da interface):
- **Concurso** / **Fase** / **Prazo** / **Edital** / **Disciplina** / **Ponto**
- **Dia** / **Sessão**
- **Erro** (registro de erro ou acerto inseguro) / **Frase correta** / **Cartão** / **Revisão**
- **Norma** / **Versão** / **Dispositivo** (unidade da norma: parte, título, capítulo, seção, artigo, parágrafo, inciso, alínea, item) / **Redação anterior** / **Nota de vigência** / **Marcação** / **Estrela**
- **Catálogo** (normas compartilháveis) / **Pacote de incidência** (estrelas e prioridades por carreira)
- **Precedente** / **Nota** (resumo) / **Achado**
- **Aparelho** (equipamento do usuário) / **Problema** (falha relatada da plataforma — nunca "erro")
- **Pendência** (sempre derivada, nunca cadastrada)

---

## 1. Resumo executivo

**Diagnóstico geral.** Oito artefatos que, somados, cobrem o ciclo de preparação, mas repetem os mesmos conceitos: pontos do edital em três lugares, "Hoje" em três, calendário em dois, erros em dois, backup em dois formatos incompatíveis. O custo é cognitivo: cada "onde registro isto?" é atrito, e para TDAH atrito é abandono.

**Problema central.** Não há fonte de verdade para as três coisas que mais importam: a lista de pontos e prioridades, o que foi feito hoje, e os erros com suas revisões. Nenhuma ferramenta responde "o que eu faço agora?" com base em tudo que já aconteceu. E a única ferramenta com leitura de lei — o módulo mais usado — está presa ao localStorage.

**Proposta.** Um único produto — **Arretado** — com quatro áreas (**Hoje, Plano, Recall, Biblioteca**), captura global de erro, busca global, e **Conta e Ajustes** fora da navegação. Modelo de dados com o **Ponto** como eixo de vinculação opcional e com a **Norma separada em duas camadas** (conteúdo compartilhável × anotações pessoais). Arquitetura **local-first** com Postgres (Supabase) como remoto, sincronização automática com um aparelho ativo por vez, e backup em pacote com importação por modos explícitos. Segurança e LGPD como requisito de toda fase.

**Núcleo da primeira versão (MVP estrutural).** Recall (captura com 2 campos, frase correta, cartão opcional, fila em 6 caixas, lista passiva) + lista de pontos importada + exportação/importação segura, sobre uma base de dados que já nasce preparada para login, sincronização, múltiplos usuários e catálogo — sem construir nada disso ainda.

**Logo depois.** Legislação (F2): importador HTML/URL com hierarquia completa, redações anteriores ocultas, notas atenuadas, leitor com modo foco e estrelas — porque é onde o usuário passa mais tempo e onde a ferramenta atual é mais frágil.

**Adiado.** Tags livres, favoritos genéricos, flashcards automáticos, estatísticas de acervo, calendário como área, integração completa com fontes oficiais, algoritmo adaptativo, Perfil da Banca/Radar como telas, catálogo compartilhado como serviço (entra como modelo em F0 e como funcionalidade em F7).

**Ganho esperado.** Uma pergunta por tela; erro registrado em menos de 30 segundos; lei lida sem ruído e sem medo de perder grifos; dados que sobrevivem a navegador, conta e fornecedor.

---

## 2. Crítica das interfaces existentes

### 2.1 Acervo de Estudo

**Finalidade real.** Nasceu como leitor de legislação com grifos e cresceu para repositório geral. É um acervo pessoal com apêndices de estudo ativo, não um sistema de preparação.

**Pontos fortes / bem resolvidos**
- `fatiarLei` + edição individual/por bloco: resolve o problema real de trazer texto do Planalto para estrutura navegável. Ativo técnico mais valioso do conjunto.
- Grifos por artigo e "lido até": para FCC (letra de lei), leitura marcada **é** estudo.
- Comparação texto novo × existente: embrião correto da atualização legislativa.
- Jurisprudência internacional com fatos/decisão traduzidos: modelo útil para Direitos Humanos em Defensoria.
- Backup por pilar: intuição certa (seletivo), meio errado (localStorage).

**Funcionalidades isoladas** (não alimentam nenhuma decisão de estudo): estatísticas de acervo; tags favoritas; favoritos; flashcards automáticos do acervo (cartão bom nasce de lacuna, não de conteúdo lido); título único; sugestão de tags.

**Sobreposições internas:** caderno de erros (aposentado) × erros × cartões × revisão do dia × fila espaçada — cinco nomes para dois conceitos e uma fila. Tags × disciplina × tema — três eixos concorrentes.

**Navegação.** Por tipo de conteúdo; obriga saber *o que* é o item antes de achá-lo. A página inicial não diz o que fazer. O leitor de lei não tem modo de leitura limpa nem filtro por dispositivos relevantes.

**Risco de transformar preparação em organização.** Alto: cadastro é recompensado visualmente, revisão não.

**Limitações do localStorage.** ~5 MB por origem (legislação estoura), sem transações nem índices, perda silenciosa ao limpar o navegador, sem multi-aparelho, serialização síncrona que trava a UI.

**Migração.** Boa para conteúdo (leis, marcações, resumos, precedentes → importadores). Ruim para estado de revisão: cartões antigos entram **arquivados**.

### 2.2 Acumen v2

**Tentativa de unificação.** Direção correta (Hoje + Plano + Acervo + Erros com `pontoId`). Três falhas: reproduziu o Acervo em vez de importá-lo; manteve Calendário no nível de Hoje; trocou a persistência sem trocar o modelo.

**`pontoId`.** Conceito certo, execução frágil: exigido em alguns fluxos; só com a lei inteira; sem histórico de prioridade.

**Erros e cartões.** Fluxo correto. Faltam acerto inseguro, reincidência, suspensão, e **histórico de revisões** (só a caixa atual é salva — perde o dado que permitiria evoluir o algoritmo).

**Firestore.** Vantagens: zero servidor, auth pronta, cache offline, custo zero. Desvantagens: sem esquema (migrações espalhadas), consultas limitadas, lock-in, e a *verdade* no remoto. Com a decisão por múltiplos usuários, LGPD e catálogo compartilhado, o modelo de documentos perde de vez para um relacional com regras por linha.

**Backup.** Importação mescla por sobreposição de ids, sem prévia, snapshot ou modo. Único defeito que ameaça dados — prioridade 1.

**Reaproveitar:** `pontoId` opcional; bloco do dia + fechamento; troca do ponto; erro → cartão. **Redesenhar:** persistência, importação, calendário, acervo, vínculo (para dispositivo).

### 2.3 Sobreposições entre artefatos

| # | Problema | Onde | Causa | Impacto | Solução | Prioridade |
|---|---|---|---|---|---|---|
| 1 | Três telas "Hoje" | B, D, H | Cada ferramenta precisou de porta de entrada | Decisão diária; dados divergem | Uma tela Hoje | Alta |
| 2 | Pontos em três cadastros | B, C, D | Ciclo nasceu como planilha; v2 recadastrou | Prioridade não reflete | Uma entidade Ponto; Ciclo é conteúdo inicial importado | Alta |
| 3 | Dois calendários | B, D | Rotina precisava de prova e rotação | Simulado num não aparece no outro | Calendário = visão; prova/fases/prazos no Concurso; rotação = configuração do Plano | Média |
| 4 | Erros em dois sistemas + caderno aposentado | A, B, G | Recall evoluiu separado | Cartões e filas duplicados | Uma entidade Erro, uma Cartão, uma fila | Alta |
| 5 | Ciclo (prioridade) × Rotina (dia da semana) | C, D | Cobertura × ritmo | Sugestões conflitantes | Rotação escolhe a **disciplina**; prioridade escolhe o **ponto**; usuário troca | Alta |
| 6 | Acervo reimplementado no v2 | A, B | Firestore exigiu novo cadastro | Grifos só num | Um módulo Legislação; importador do Acervo | Alta |
| 7 | Backup em dois formatos | A, B | Persistências distintas | Nenhum restaura o outro | Pacote com manifesto (D14) | Alta |
| 8 | Perfil da Banca e Radar separados | E, F | Origens distintas | Achado não vira prioridade | Entidade Achado; área em Plano | Baixa |
| 9 | Status feito/pendente esconde "estudado sem revisar" | B, C | Simplicidade | Lacuna volta na prova | Status derivado; manual só `adiado` | Média |
| 10 | Tags × tema × disciplina × favorito | A | Classificação por conveniência | Nenhum eixo confiável | Disciplina/Ponto são estrutura; Estrela é estrutural em Legislação; tag opcional e controlada; favorito genérico sai | Baixa |
| 11 | Questões por ponto × bloco × Erro | C, H, G | Granularidades misturadas | Não se sabe quanto foi feito | Agregado na Sessão; individual só Erro | Média |

**Só visualizações do mesmo dado:** Calendário, progresso diário, pendências acumuladas, revisão do dia, sugestão de próximos pontos, "ver só estrelados".

**Independentes:** Recall (sem Plano), Legislação (sem Plano e sem Erros), Inteligência (só produz Achados).

### 2.4 Crítica ao diagnóstico preliminar e às premissas

- **Hipótese 1** — correta mas imprecisa: Ciclo, Rotina, Calendário e Hoje são *dados de planejamento*, *regra de ritmo*, *visão* e *execução*. Separar por papel; uma tela de cada.
- **Hipótese 4 (Recall independente)** — parcial: o valor máximo vem de influenciar o próximo ponto. Lista de pontos existe desde F1.
- **Hipótese 7 (Firestore)** — o problema era o remoto como verdade. Com multiusuário e LGPD, o relacional passa a ser a escolha certa também pelo modelo (regras por linha, consultas, região).
- **Premissa do briefing "não projetar para múltiplos usuários"** — revista pelo próprio usuário nos comentários (registro de usuários, LGPD, relatos por usuário, catálogo compartilhado). Tratada como: **uso pessoal agora, estrutura multiusuário desde F0, sem funcionalidade multiusuário no MVP.** A decisão que evita bloqueio arquitetural é uma só: separar conteúdo de norma (compartilhável) de anotações pessoais (privadas).
- **Pressuposto frágil: progresso de leitura como métrica.** Leitura é entrada; questões e revisão são saída. "Lido até" é retomada.
- **Pressuposto frágil: "acerto sem convicção" como categoria.** É *resultado*, não *causa*. Separar.
- **Contradição no briefing:** "uma agenda" × Sessão, Dia e Evento como entidades. São três papéis; a agenda é a visão.
- **Pressuposto frágil: colar texto resolve legislação.** Os prints mostram que o **tachado é formatação** — texto puro perde a distinção entre redação revogada e vigente. A entrada principal precisa ser HTML.
- **Emocionalmente atraentes, pouco eficazes:** flashcards automáticos; estatísticas de acervo; calendário mensal; tags favoritas; três campos longos por julgado internacional.
- **Incertezas que só uso real resolve:** captura no celular durante questões; preenchimento espontâneo da causa; rotação semanal fixa; fila com 6 caixas.

---

## 3. Classificação de valor

Frequência: D diária, S semanal, M mensal, R rara.

| Ferramenta ou funcionalidade | Classificação | Freq. | Impacto | Custo | Decisão | Justificativa |
|---|---|---|---|---|---|---|
| Registro rápido de erro (2 campos) | Alto valor | D | Alto | Baixo | Núcleo, F1 | Identifica lacuna; base de tudo |
| Acerto sem convicção como resultado | Alto valor | D | Alto | Baixo | Núcleo, F1 | Lacuna invisível na nota |
| Frase correta no Erro | Alto valor | D | Alto | Baixo | Núcleo, F1 | Vira verso do cartão e lista passiva sem cadastro extra |
| Cartão a partir de erro (opcional) | Alto valor | D | Alto | Baixo | Núcleo, F1 | Recuperação ativa dirigida |
| Fila em 6 caixas + drill | Alto valor | D | Alto | Baixo | Núcleo, F1 | Espaçamento é o mecanismo |
| Lista de revisão passiva (frases corretas) | Médio-alto | D | Médio | Baixo | F1 | Revisão de baixa fricção em trânsito |
| Causa do erro (opcional, sugerível) | Médio valor | D | Médio | Baixo | F1 | Não pode travar a captura |
| Reincidência | Alto valor | S | Alto | Médio | F3 (derivada) | Muda decisão de estudo |
| Lista de pontos com faixa | Alto valor | D | Alto | Baixo | F1 importada; UI em F3 | Aderência ao edital |
| Sugestão do próximo ponto | Alto valor | D | Alto | Médio | F3 | Remove a decisão mais cara |
| Rotação semanal | Médio valor | D | Médio | Baixo | F3, configuração | Ritmo sem decisão |
| Fechamento do dia | Alto valor | D | Alto | Baixo | F3 | Encerramento explícito |
| Sessão mínima + bloco de questões | Alto valor | D | Alto | Baixo | F3 | Feedback sem banco de questões |
| **Importador HTML/URL com hierarquia completa** | Alto valor | S | Alto (FCC) | Alto | **F2** | Letra de lei é o core; texto puro perde o tachado |
| **Leitor com modo foco** | Alto valor | D | Alto | Médio | **F2** | Menos ruído = mais leitura |
| **Estrela por dispositivo e por bloco, "ver só estrelados"** | Alto valor | D | Alto | Médio | **F2** | Foca a leitura no que cai; base do pacote de incidência |
| **Redações anteriores ocultas com expansão** | Alto valor | D | Alto | Médio | **F2** | Ruído principal do Planalto eliminado |
| **Notas de vigência atenuadas** | Médio-alto | D | Médio | Baixo | **F2** | Leitura limpa sem perder informação |
| Grifos e anotações | Alto valor | D | Alto | Médio | F2 | Leitura ativa |
| "Lido até" / retomada | Médio valor | D | Médio | Baixo | F2 | Retomada, não métrica |
| Editor com tipos (parágrafo/inciso/alínea) e recuo padrão | Médio valor | M | Médio | Médio | F2 | Correção do fatiamento sem formatar à mão |
| Vínculo dispositivo ↔ ponto | Médio valor | S | Médio | Baixo | F3 | "O que ler para este ponto" |
| "Verificar atualização" leve por URL | Médio-alto | M | Alto quando ocorre | Médio | F6 (campo URL desde F2) | Pré-checagem barata antes do diff completo |
| Comparação de versões com confirmação | Médio valor | M | Alto | Alto | F6 | Raro, crítico |
| Catálogo compartilhado + pacotes de incidência | Alto valor futuro | — | Alto (para outros usuários) | Alto | Modelo em F0; serviço em F7 | Reduz barreira de entrada; separa conteúdo de anotação |
| Resumos (Nota) | Médio valor | S | Médio | Baixo | F5 | Não é o gargalo |
| Precedentes (captura curta) | Médio valor | S | Médio-alto | Baixo | F5 | Cadastro precisa encolher |
| Busca global | Alto valor | D | Médio | Médio | F5 | Substitui tags e navegação |
| Fases e prazos do concurso | Médio valor | M | Médio | Baixo | F4 | Evita perder prazo; um lembrete acionável |
| Sincronização automática, aparelho ativo único | Alto valor | D | Médio | Alto | F4 | Necessária; depois do modelo estável |
| PWA / offline | Alto valor | D | Médio | Médio | F4 (offline desde F0) | Instalar reduz atrito |
| Conta e Ajustes (tema, conta, dados, Orientações) | Alto valor | S | (confiança) | Baixo | F0 mínimo | Reduz medo; tira ruído das áreas de estudo |
| "?" contextual | Médio valor | S | (confiança) | Baixo | F0 | Ajuda no ponto da dúvida |
| "!" Relatar problema (1/dia) | Médio valor | R | (confiança) | Baixo | F0 fila local; envio em F4 | Canal único e limitado |
| Tags livres / favoritas / favoritos genéricos | Ruído / Aposentar | — | Baixo | Baixo | Não implementar | Estrela cobre o caso real (Legislação) |
| Flashcards automáticos do acervo | Aposentar | — | Negativo | Médio | "Criar cartão deste trecho" manual | Excesso mata a fila |
| Estatísticas de acervo / tempo | Ruído | — | Nulo | Baixo | Não implementar | Não altera decisão |
| Calendário mensal | Médio valor | S | Baixo | Médio | Aba de Plano, F4 | Visão, não área |
| Perfil da Banca / Radar | Médio valor | M/R | Médio-alto | Médio | Inteligência, F7 | Valor no conteúdo, não na tela |
| Desempenho por disciplina/ponto | Médio valor | S | Médio | Médio | F8 | Só com volume |

---

## 4. Definição do produto unificado

**Nome:** Arretado. **Finalidade:** transformar erros, questões e leitura em uma próxima ação de estudo, todos os dias, com o mínimo de cadastro — e permitir que outros usuários comecem a partir de um catálogo pronto.

### Navegação principal

| Área | Pergunta | Contém |
|---|---|---|
| **Hoje** | O que faço agora? | Retomar sessão, revisões do dia, ponto do dia, fechamento, próximo prazo do concurso (uma linha) |
| **Plano** | Onde estou em relação ao edital e à prova? | Concursos (fases, prazos), pontos por disciplina/faixa, status, rotação, Calendário (aba), Inteligência (aba, F7) |
| **Recall** | O que eu erro e o que estou revisando? | Erros, frases corretas (lista passiva), cartões, histórico, reincidência |
| **Biblioteca** | Onde está o conteúdo? | Normas (leitor), precedentes, notas, busca |

Globais em todas as telas: **"Registrar erro"**, **busca**, **"?"** (orientação contextual), **"!"** (relatar problema), **rodapé** de responsabilidade (atenuado).

**Conta e Ajustes** (ícone de perfil, fora das áreas): Aparência (claro/escuro/sistema, fonte de leitura) · Conta e sincronização (login Google, aparelho ativo, "Sincronizar agora", última sincronização) · Dados (exportar, importar, snapshots, log de importações, apagar tudo) · Preferências de estudo (caixas, rotação, hora do fechamento) · Módulos · Privacidade e segurança (o que é guardado e onde; exportar e excluir dados) · **Orientações** (como funciona; cuidados com seus dados; segurança pessoal — linguagem simples, vocabulário canônico).

Por que não "Estudar" (Sessão é estado, não lugar); por que "Recall" e não "Revisar" (a área abriga os erros); por que Calendário não é área (só prova/fases/prazos são dados próprios) — como na v1.

### Tela inicial (Hoje)

Uma coluna, ordem fixa: (1) sessão interrompida; (2) revisões vencidas — um botão; (3) ponto do dia — Iniciar / Trocar; (4) fechar o dia. Rodapé: contagem regressiva e próximo prazo. Sem gráficos.

### Leitor de Legislação — princípios (detalhe em §10.6, Parte 2)

- **Modo foco**: oculta navegação, cabeçalhos e ações; resta o texto. Um botão sutil, fixo na borda, acompanha a rolagem e devolve ao modo anterior na mesma posição. Vale em celular, tablet e desktop.
- **Filtros de leitura**: tudo · só estrelados · só selecionados (seleção por artigo, por bloco da hierarquia ou por intervalo).
- **Estrela**: por dispositivo ou por nó da hierarquia (Parte, Livro, Título, Capítulo, Seção, Subseção). Marcar um nó propaga aos descendentes como **herdada**; desmarcar um nó não remove estrelas **diretas**; desmarcar um artigo dentro de nó estrelado vira **exceção**. Estrelas pessoais são separadas das que vêm de um pacote de incidência (F7), e ambas são visíveis com origem.
- **Redações anteriores**: ocultas por padrão; indicador discreto ("1 redação anterior"); um clique expande inline, atenuado e tachado. Ajuste global para mostrar tudo.
- **Notas de vigência**: atenuadas, ao final do dispositivo; link preservado.
- **Hierarquia**: recuo e tipografia padronizados por nível, do Título ao item da alínea; "Nome" (epígrafe) exibido acima do artigo, discreto.
- **Ações no dispositivo**: grifar, anotar, estrela, "registrar erro sobre este dispositivo", "criar cartão deste trecho", "lido até aqui", corrigir texto.

### Fluxos

**Diário / semanal / cadastro / revisão** — como na v1, acrescido de: a revisão passiva (lista de frases corretas filtrável por disciplina/ponto/recência) é uma aba de Recall e um atalho no Hoje quando há tempo curto ("5 min? Leia 10 frases").

**Entrada de norma.** (1) **Colar da página** (preferencial): o app lê o HTML do clipboard, sanitiza, extrai hierarquia, dispositivos, redações anteriores (tachado), notas de vigência, links. (2) **URL** (alternativa): o app busca a página e segue o mesmo caminho; a URL fica gravada como fonte oficial. (3) **Texto puro** (fallback): heurísticas; tudo que depende de formatação vira "a confirmar". Em qualquer caminho: texto → **rascunho** → revisão (por artigo, por bloco ou integral; conversão de linha em parágrafo/inciso/alínea/item) → **publicar**. Norma publicada nunca é alterada silenciosamente.

**Verificar atualização** (F6, requer URL gravada): pré-checagem barata — busca na página as ocorrências de "Redação dada pela Lei nº N, de AAAA" / "Incluído pela…" / "Revogado pela…" e compara a mais recente com a mais recente já registrada; se houver mais nova, oferece importar nova versão e rodar o diff; se não houver, informa "nenhuma alteração detectada pela fonte" e permite informar o link de uma lei nova manualmente. Só então o diff completo (estrutural + textual) com confirmação humana, reancoragem de marcações e pendência de releitura.

**Sincronização.** Automática ao abrir (se logado). **Um aparelho ativo por vez**: abrir em outro assume a posse; o anterior passa a somente leitura até reabrir. Posse com validade curta renovada automaticamente; aparelho que ficou offline com posse vencida envia suas alterações como itens de conflito, nunca as aplica às cegas. "Sincronizar agora" em Conta. Diálogo de conflito:

> "Foram identificadas diferenças entre os dados alterados em **[aparelho X]** (última modificação em dd/mm hh:mm) e em **[aparelho Y]** (última modificação em dd/mm hh:mm). Qual versão deseja manter?"

Só para o que divergiu; "manter ambos" para textos longos; lista com prévia e "aplicar a todos" quando houver muitos; a versão preterida fica no log.

**Backup e restauração.** Pacote com manifesto; modos explícitos; prévia; snapshot automático; rollback (§7).

---

## 5. Modelo conceitual de dados

### 5.1 Classificação

| Categoria | Itens |
|---|---|
| **Entidade principal** | Usuário, Aparelho, Concurso, FasePrazo, Edital, Disciplina, Ponto, Dia, Sessão, Erro, Cartão, Revisão, Norma, VersãoDeNorma, Dispositivo, Marcação, Estrela, PacoteDeIncidência, Adesão, Precedente, Nota, Achado, EventoDeCalendário, Fonte, Anexo, Tag, LogDeImportação, Snapshot, RelatoDeProblema |
| **Vínculo** | Ponto↔Dispositivo/Norma, Ponto↔Nota, Ponto↔Precedente, Precedente↔Dispositivo, Erro↔{Ponto, Dispositivo, Precedente, Nota, Sessão}, Cartão↔Erro, Cartão↔Ponto, Achado↔{Ponto, Norma}, Estrela↔{Dispositivo, Pacote}, Tag↔item, Anexo↔item |
| **Visualização derivada** | Hoje, Calendário, Fila de revisão, Lista passiva, Pendências, Status do Ponto, Progresso de leitura, "só estrelados", Sugestão de próximo ponto, Reincidência, Próximo prazo |
| **Estatística calculada** | Revisões vencidas, erros por ponto/disciplina, acertos inseguros, cobertura por faixa, dias de uso |
| **Configuração** | Preferências (caixas, rotação, meta, hora de fechamento, tema, fonte, mostrar redações anteriores), módulos habilitados |

Regras gerais: `id` estável gerado no cliente; `usuarioId` em **toda** entidade pessoal (isolamento por linha desde F0); `criadoEm`, `atualizadoEm`, `origem`, `excluidoEm` (exclusão lógica). Nenhum vínculo é obrigatório. Tudo indexado para volume alto (por usuário, por norma, por disciplina, por ponto, por data, por próxima revisão); listas sempre paginadas; texto de norma carregado por dispositivo, sob demanda.

### 5.2 Duas camadas na Legislação (decisão estrutural)

| Camada | Conteúdo | Dono | Compartilhável |
|---|---|---|---|
| **Conteúdo da norma** | Norma, VersãoDeNorma, Dispositivo (hierarquia, texto, redações anteriores, notas de vigência, status) | Catálogo (curador) ou usuário (norma pessoal) | Sim, quando no Catálogo |
| **Anotações pessoais** | Marcação, Estrela direta, "lido até", vínculos com Ponto/Erro/Precedente/Nota | Usuário | Não |
| **Curadoria** | PacoteDeIncidência (estrelas + prioridades sugeridas por carreira/concurso), Adesão | Curador / usuário aderente | Sim |

No MVP tudo é "norma pessoal" de um único usuário; a separação já existe no modelo para que, em F7, uma norma pessoal possa ser **promovida ao catálogo** e outros usuários possam **aderir** (total ou parcialmente) sem migração de anotações.

### 5.3 Entidades principais

**Usuário** — Escopo de isolamento. Obrigatórios: id. Opcionais: nome de exibição, e-mail (só após login), provedor, carreira/interesse (para pacotes), consentimentos (data, versão da política). Exclusão: **exclusão de conta** = exportação oferecida + apagamento físico de tudo que é pessoal (LGPD). Histórico: consentimentos.

**Aparelho** — Equipamento onde o app roda. Obrigatórios: id, nome (ex.: "Notebook", "Celular"), plataforma. Opcionais: última sincronização, posse ativa (até quando), versão do esquema local. Serve a: posse única, diálogo de conflito, log de origem. Exclusão: lógica (revogar aparelho).

**Concurso** — Obrigatórios: nome, banca. Opcionais: órgão, cargo, carreira (Defensoria, Magistratura, MPF, MPT…), status. Relações: 1:N FasePrazo, Edital, Evento. Derivados: próximo prazo, dias até a prova. Vários concursos é caso normal.

**FasePrazo** — Fases e prazos do concurso. Obrigatórios: concurso, título, tipo (fase / prazo), data ou intervalo. Opcionais: descrição, lembrete (dias antes), concluído, fonte. Editável sempre (reajustes). Derivados: pendência no Hoje quando lembrete vence. Exclusão: lógica. Histórico: alterações de data.

**Edital, Disciplina, Ponto, Dia, Sessão** — como na v1 (Ponto com status derivado e log de prioridade; Dia materializado só quando o usuário age; Sessão com bloco de questões).

**Erro** — **Obrigatórios: resultado (errou / acertou inseguro), o que foi (texto curto).** Opcionais: **frase correta** (tese/enunciado correto em uma linha — é o mesmo dado exibido como verso do cartão e na lista passiva), disciplina, ponto, fonte (banca, prova, ano, nº), resposta dada, correta, justificativa, convicção, causa (lacuna / leitura / confusão entre institutos / literalidade), causa sugerida, ação recomendada, vínculos, status (aberto / com cartão / resolvido / descartado), **completude** (rápido / completo — derivada: sinaliza para "completar depois" sem obrigar). Derivados: reincidência, idade. Histórico: causa sugerida × confirmada.

**Cartão** — frente, verso (por padrão = frase correta do erro; editável de forma independente a partir daí), origem, estado, caixa, próxima revisão. **Revisão** — append-only, como na v1.

**Norma** — Identidade. Obrigatórios: título curto, **escopo** (pessoal / catálogo). Opcionais: título oficial, referência, tipo, esfera, epígrafe, ementa, preâmbulo, disciplina(s), **URL oficial** (habilita "verificar atualização"), versão vigente, origem no catálogo (se derivada de uma norma do catálogo), curador. Relações: 1:N Versão, Dispositivo; N:N Ponto. Derivados: progresso de leitura, contagem de estrelas/marcações/erros, última verificação de atualização.

**VersãoDeNorma** — Obrigatórios: norma, texto normalizado, data de captura, origem (HTML colado / URL / arquivo / texto puro), hash, status (rascunho / vigente / arquivada). Opcionais: data de vigência, fonte, **nota de vigência mais recente detectada** (lei + ano — usada pela pré-checagem), resultado da comparação com a anterior. Contém os textos dos dispositivos e suas redações anteriores nesta versão.

**Dispositivo** — Nó único da árvore da norma. Obrigatórios: norma, **endereço canônico estável** com suporte a sufixo (`tit2.cap1.sec1`, `art9A`, `art5.par2.incIII.alB`), **categoria** (estrutural / normativo), **tipo** (parte, livro, título, capítulo, seção, subseção, nome/epígrafe, preâmbulo, ementa, artigo, caput, parágrafo, inciso, alínea, item, anexo), ordem, pai. Opcionais: rótulo de exibição (ex.: "Parágrafo único", "Art. 9º-A"), status (vigente / revogado / eficácia cessada / renumerado-para / novo-nesta-versão), **notas de vigência** (lista: texto, lei, ano, link), **redações anteriores** (lista ordenada: texto, nota, origem tachado/heurística, confirmação humana sim/não), **confiança da classificação** (alta = origem HTML; a confirmar = heurística). Texto vive na Versão. Relações: N:N Ponto, Precedente, Erro; 1:N Marcação, Estrela. Exclusão: nunca (recebe status). Ordenação: numérica com sufixo (9 < 9-A < 10).

**Marcação** — dispositivo, trecho ancorado, tipo (grifo/nota), cor, nota, versão, status (válida / reancorada / pendente). Pessoal.

**Estrela** — Obrigatórios: usuário, alvo (dispositivo ou nó estrutural), **origem** (direta / herdada de nó X / pacote Y / exceção-negativa). Derivados: estado efetivo por dispositivo (direta ∨ herdada ∨ pacote, salvo exceção). Regras: desmarcar nó remove só as herdadas dele; exceção negativa persiste; estrela de pacote some se a adesão for cancelada. Pessoal.

**PacoteDeIncidência** (F7) — Curadoria publicada. Obrigatórios: curador, título, carreira/concurso alvo, versão. Opcionais: descrição, normas cobertas, estrelas por dispositivo, prioridades sugeridas por ponto, fonte (provas mapeadas), data. Publicação versionada; aderentes veem "há versão nova".

**Adesão** (F7) — usuário ↔ pacote (ou ↔ norma do catálogo): total / parcial (normas escolhidas), data, versão aderida, opção "receber atualizações".

**Precedente, Nota, Achado, EventoDeCalendário, Fonte, Anexo, Tag, LogDeImportação, Snapshot** — como na v1. EventoDeCalendário fica restrito a simulado/marco/outro; prova e prazos migram para FasePrazo.

**RelatoDeProblema** — Obrigatórios: usuário, data, **descrição** (livre, obrigatória), tela, versão do app, aparelho. Opcionais: resposta, status. Regra: **1 por usuário por dia**; sem remoto, fica em fila local com estado "aguardando envio". Nunca contém dados de estudo.

### 5.4 O que deliberadamente não é entidade

Questão individual (agregado na Sessão; individual só em Erro); Diagnóstico (atributos do Erro); Prioridade (atributo com log); Pendência (derivada); Backup (arquivo + log); Redação anterior (sub-registro do Dispositivo na Versão, não entidade — nunca é referenciada de fora); Favorito genérico (Estrela cobre Legislação; para o resto, não existe).

---

## 6. Arquitetura modular

```
CORE
 ├─ Identidade         (usuarioId local; login Google via Supabase Auth — estrutura em F0, uso em F4)
 ├─ Persistência local (IndexedDB sob camada de coleções; índices; paginação; blobs)
 ├─ Log de alterações  (append-only: entidade, id, campos, ts lógico, aparelho)
 ├─ Sincronização      (adaptador Supabase; posse de aparelho; conflitos explícitos)
 ├─ Esquema/Migração   (versão; migrações idempotentes; snapshot antes)
 ├─ Backup/Restauração (pacote com manifesto; modos; prévia; snapshot; rollback)
 ├─ Segurança          (sanitização de HTML; CSP; validação de entrada; consentimentos; exclusão de conta)
 ├─ Busca              (índice local por tipo; reconstruível)
 ├─ Eventos internos   (barramento em processo; payload = ids)
 ├─ Anexos             (blobs locais; Storage remoto opcional)
 ├─ Preferências       (tipadas; exportáveis; por aparelho quando fizer sentido)
 └─ Auditoria          (LogDeImportação, Snapshot, histórico de prioridade/causa/consentimento)

DOMÍNIOS
 ├─ Plano              (Concurso, FasePrazo, Edital, Disciplina, Ponto, rotação)
 ├─ Execução           (Dia, Sessão; Hoje é visão)
 ├─ Recall             (Erro, Cartão, Revisão; fila; lista passiva)
 ├─ Legislação         (Norma, Versão, Dispositivo, Marcação, Estrela; importador; leitor; comparação)
 ├─ Catálogo           (normas compartilhadas, PacoteDeIncidência, Adesão — modelo em F0, serviço em F7)
 ├─ Precedentes        (Precedente)
 ├─ Notas              (Nota)
 └─ Inteligência       (Achado; comparação de editais)

SUPORTE AO USUÁRIO
 ├─ Conta e Ajustes    (aparência, conta, dados, preferências, módulos, privacidade)
 ├─ Orientações        (conteúdo estático versionado; "?" contextual aponta para seções)
 └─ Relatar problema   ("!"; RelatoDeProblema; fila local → envio)

INTEGRAÇÕES
 ├─ Importadores       (HTML colado, URL, texto puro, Acervo antigo, Acumen v2, Ciclo Obrigatório)
 ├─ Verificador de atualização (pré-checagem por notas de vigência; depois diff completo)
 ├─ Exportadores       (pacote Arretado, Markdown, CSV)
 ├─ Notificações       (local: revisão vencida, sessão interrompida, prazo do concurso)
 └─ Calendário externo (não agora)

APRESENTAÇÃO
 ├─ Shell              (4 áreas + captura + busca + ? + ! + rodapé + Conta)
 ├─ Leitor de norma    (modo foco; filtros; hierarquia; redações ocultas; ações por dispositivo)
 ├─ Editor de norma    (por artigo / bloco / integral; tipos com recuo padrão)
 ├─ Componentes        (lista paginada, formulário em duas camadas, drill, lista passiva)
 ├─ Responsividade     (celular: captura/revisão/leitura em foco; tablet: leitura; desktop: edição)
 ├─ PWA                (instalável; offline por padrão)
 └─ Acessibilidade     (teclado, foco visível, contraste, alvos ≥ 44px, sem modais em cadeia)
```

**Regras de dependência:** domínios dependem só do Core; referências cruzadas por ids + eventos; Apresentação depende de domínios e Core; Integrações alimentam domínios por serviços públicos; Catálogo é o único domínio que outro domínio (Legislação) pode *ler* diretamente, nunca escrever; Inteligência nunca escreve em Ponto; módulo desabilitado mantém ids como referência opaca.

| Módulo | Responsabilidade | Serviços | Emite | Consome | Isolado |
|---|---|---|---|---|---|
| **Plano** | Concursos, fases/prazos, pontos, prioridade, rotação, status, sugestão | listar; sugerir próximo; alterar prioridade com origem; próximo prazo | `ponto.prioridadeAlterada`, `prazo.vencendo` | `sessao.encerrada`, `erro.registrado`, `cartao.revisado`, `achado.aceito`, `adesao.criada` | Lista de pontos e prazos |
| **Execução** | Dia, Sessão, Hoje | iniciar/pausar/retomar/encerrar; bloco de questões; fechar dia; estado do Hoje | `sessao.*`, `dia.fechado`, `conteudo.acessado` | `erro.registrado` | Cronômetro + fechamento |
| **Recall** | Erro, Cartão, Revisão, fila, lista passiva | registrar/completar; sugerir causa; criar cartão; fila; revisar; lista de frases corretas | `erro.*`, `cartao.*`, `reincidencia.detectada` | `dispositivo.alterado`, `ponto.excluido` | **Total** |
| **Legislação** | Norma, Versão, Dispositivo, Marcação, Estrela; importar; ler; editar; comparar | importar (HTML/URL/texto → rascunho); publicar; editar; marcar; estrelar (com herança); filtros; "lido até"; verificar atualização; comparar; reancorar | `versao.publicada`, `dispositivo.alterado/revogado/renumerado`, `marcacao.pendenteReancoragem`, `atualizacao.detectada` | `adesao.criada` (para estrelas de pacote), `ponto.excluido` | Leitor com grifos |
| **Catálogo** (F7) | Normas compartilhadas, pacotes, adesão | promover norma; publicar pacote; aderir/cancelar; listar por carreira | `adesao.criada/cancelada`, `pacote.atualizado` | `versao.publicada` (do curador) | Lista de pacotes |
| **Precedentes / Notas / Inteligência** | como na v1 | | | | |
| **Suporte** | Conta, Orientações, Relatar problema | tema; conta; sync manual; exportar/importar; relatar (1/dia) | `relato.criado` | — | Sim |

---

## 7. Core do sistema

### 7.1 Persistência — comparação e decisão

| Critério | Só localStorage | Só Firestore | Local estruturado + Postgres (Supabase) remoto | Só remoto com cache |
|---|---|---|---|---|
| Multi-aparelho | Não | Sim | Sim | Sim |
| Offline | Sim | Parcial | **Total** | Parcial |
| Risco de perda | Alto | Médio | Baixo | Médio |
| Multiusuário isolado | Não | Regras por documento | **Regras por linha (RLS)** | Idem |
| Catálogo compartilhado | Não | Difícil (consultas) | **Natural (tabelas públicas de leitura)** | Idem |
| LGPD (região, exclusão, auditoria) | Local | Região limitada; exclusão por documento | **Região São Paulo; exclusão em cascata; logs** | Idem |
| Consultas (reincidência, cobertura) | Não | Limitadas | **SQL** | SQL |
| Portabilidade | Alta | Baixa | **Alta** (Postgres + pacote) | Média |
| Complexidade inicial | Mínima | Baixa | Média | Média-alta |

**Decisão: local-first com IndexedDB e log de alterações; remoto Postgres via Supabase (Auth com Google, RLS, região Brasil, Storage para anexos), acessado por adaptador.** No MVP o adaptador não é usado: o esquema local e o pacote de backup já são relacionais-compatíveis, e as tabelas remotas são criadas com RLS desde F0 (vazias) para que F4 seja ligar, não reconstruir. Importador do Firestore do Acumen v2 traz os dados existentes.

### 7.2 Componentes

- **Identidade.** MVP: `usuarioId` local. F4: login Google (Supabase Auth); o `usuarioId` local é vinculado à conta no primeiro login; sem senha própria; sessões curtas com renovação; logout revoga o aparelho.
- **Banco local.** Coleções por entidade, índices compostos, paginação obrigatória, texto de norma por dispositivo; sem limite prático para o volume esperado.
- **Log de alterações.** Base de sync, desfazer de import e auditoria.
- **Sincronização (F4).** Automática ao abrir e ao reconectar; **posse de aparelho** (um ativo; validade curta renovada; os demais em somente leitura); push/pull do log; append-only nunca conflita; escalares por último ts lógico dentro da posse; fora da posse (offline com posse vencida), tudo vira **conflito explícito** com o diálogo definido em §4; "Sincronizar agora" manual; sync nunca apaga.
- **Offline.** Padrão. Navegador e PWA instalada (PC e celular) usam o mesmo banco local.
- **Esquema.** Versão no banco e no manifesto; migrações idempotentes; snapshot antes; pacote posterior recusado com mensagem clara.
- **Backup/Restauração.** Pacote com manifesto; integral / por módulo / por concurso / por período; legível (Markdown, CSV). Restauração por modo explícito, prévia, snapshot, rollback; idempotente por id + hash. Arquivo alterado fora do app falha na validação e o sistema diz isso com clareza.
- **Segurança e LGPD (transversal — critério de aceite em toda fase).**
  - *Minimização:* só o necessário; nenhum dado de estudo em logs, relatos ou telemetria; sem rastreadores de terceiros.
  - *Entrada hostil:* HTML colado ou baixado é **sanitizado e convertido em estrutura** antes de qualquer renderização — o app nunca exibe HTML bruto; CSP estrita; validação de tipos em toda importação; limites de tamanho.
  - *Remoto:* TLS; RLS por `usuarioId` em toda tabela pessoal; tabelas do catálogo com leitura pública e escrita só de curador; chave pública no cliente, nunca chave de serviço; tokens curtos.
  - *Local:* dados no banco do navegador do usuário; exportação com **senha opcional** (pacote cifrado) para quem guarda backup em nuvem de terceiros.
  - *Direitos do titular:* exportar tudo, apagar tudo, excluir conta — nativos, em Conta; consentimento registrado com versão da política; Orientações explicam em linguagem simples.
  - *Operação:* dependências auditadas a cada versão; backups do remoto; changelog visível ao usuário.
  - *Rodapé em todas as páginas (atenuado):* responsabilidade do usuário pela exportação/importação dos próprios dados; arquivos alterados fora do aplicativo não passam na validação e não são restauráveis. Sem menção a proibição ou exclusão de conta.
- **Busca, anexos, preferências, eventos, migração de dados antigos** — como na v1.

---

## 15. Plano de implementação incremental

**Mudanças em relação à v1:** Legislação sobe para F2 (prioridade declarada; ferramenta atual é a mais frágil; Hoje sem leitor não consegue oferecer "ler o ponto"); sincronização e login vão para F4 com Supabase; segurança/LGPD tem item de aceite em toda fase; catálogo tem modelo em F0 e serviço em F7.

**Ordem:** F0 Fundamentos → F1 Recall + pontos → F2 Legislação → F3 Hoje + Plano → F4 Login, sync, PWA, concurso completo → F5 Biblioteca → F6 Atualização legislativa → F7 Catálogo e Inteligência → F8 Analítica.

### F0 — Fundamentos
- **Objetivo:** base que não será refeita.
- **Entregas:** Core (banco local, esquema versionado, log, backup/restore com modos e prévia, eventos, sanitização); shell com 4 áreas + Conta e Ajustes (tema, dados, Orientações inicial, "?" e "!" com fila local, rodapé); modelo completo incluindo `usuarioId`, Aparelho, escopo de Norma e Estrela (sem UI); esquema remoto com RLS criado e vazio.
- **Segurança:** CSP; sanitizador testado contra HTML malicioso; exportação cifrada opcional; texto de privacidade v1.
- **Validação:** exportar → apagar → restaurar → hash idêntico; importar duas vezes → zero duplicatas; simulação nunca escreve; 10 mil registros sintéticos sem degradação perceptível.
- **Avançar quando:** restore idempotente e carga sintética aprovados.

### F1 — Recall mínimo + pontos importados
- **Entregas:** captura (resultado + texto; frase correta e demais opcionais em "completar depois"); cartão opcional com verso = frase correta; fila; drill; 6 caixas; suspender/arquivar; **lista passiva**; importadores (Ciclo Obrigatório → pontos somente leitura; erros/cartões do Acervo e v2 → cartões arquivados).
- **Segurança:** nenhum dado sai do aparelho; relato de problema não anexa conteúdo.
- **Validação (2–3 semanas de uso real):** ≥ 5 erros/semana; ≥ 70% da fila revisada; captura ≤ 30 s; lista passiva aberta ≥ 2×/semana.
- **Avançar quando:** 14 dias com revisão em ≥ 10.

### F2 — Legislação
- **Entregas:** importador **HTML colado** (hierarquia completa, dispositivos com sufixo, redações anteriores por tachado, notas de vigência, links, preâmbulo/ementa) e **por URL**; fallback texto puro com "a confirmar"; rascunho → revisão → publicar; **editor** por artigo / bloco / integral com tipos e recuo padrão; **leitor** com modo foco, filtros (tudo / estrelados / selecionados), redações ocultas com expansão, notas atenuadas, grifos, anotações, "lido até", **estrela com herança por bloco**; ações "registrar erro sobre este dispositivo" e "criar cartão deste trecho"; importador do Acervo antigo (leis + marcações reancoradas); Acervo antigo vira somente leitura. Campo URL oficial gravado (para F6).
- **Segurança:** sanitização é a porta de entrada; nenhum script ou estilo do HTML colado sobrevive; tamanho máximo por importação.
- **Validação:** LEP e Código Penal importados do Planalto com hierarquia, tachados e notas corretos sem edição manual em ≥ 95% dos dispositivos; todas as leis do Acervo com marcações preservadas; leitura em modo foco no celular e no tablet sem perder posição; estrelar "Seção I" propaga e desmarcar um artigo vira exceção.
- **Riscos:** variação de formatação do Planalto. **Mitigação:** parser tolerante (º/o/°, hífen opcional, sufixos), confiança por dispositivo, confirmação em lote.
- **Avançar quando:** o usuário lê lei no Arretado e não no Acervo antigo por 2 semanas.

### F3 — Hoje, Dia, Sessão, Plano
- **Entregas:** Hoje com 4 blocos; Dia; Sessão mínima; Plano com pontos, status derivado, rotação, sugestão, troca, `adiado`; reincidência; vínculo dispositivo↔ponto; "ler o ponto" abre o leitor filtrado pelos dispositivos vinculados/estrelados.
- **Validação:** ponto do dia aceito sem troca ≥ 60%; fechamento ≥ 70% dos dias com sessão.

### F4 — Login, sincronização, PWA, concurso completo
- **Entregas:** login Google; vínculo do `usuarioId` local à conta; adaptador Supabase; posse de aparelho; diálogo de conflito; "Sincronizar agora"; envio da fila de relatos; PWA instalável; notificações locais; Concurso com Fases/Prazos e lembretes; aba Calendário; simulados.
- **Segurança:** RLS testada com dois usuários de teste (um nunca vê o outro); exclusão de conta em cascata verificada; política de privacidade v2 com o que vai ao remoto.
- **Validação:** editar offline em A, editar em B, reconectar A → diálogo correto, zero perda; export de A = export de B após sync; segundo aparelho fica em somente leitura.
- **Riscos:** sync corromper local. **Mitigação:** snapshot antes da primeira sync; kill switch em Conta.

### F5 — Biblioteca completa
Precedentes (captura curta), Notas com autosave e links internos, busca global, importadores restantes do Acervo.

### F6 — Atualização legislativa
"Verificar atualização" (pré-checagem por notas de vigência → oferta de nova versão → diff completo com estados sugeridos → confirmação → reancoragem → pendência de releitura); adaptadores por fonte com fallback para colar.

### F7 — Catálogo e Inteligência de prova
Promover norma ao catálogo; pacotes de incidência (estrelas + prioridades por carreira); adesão total/parcial com atualizações; Achados; comparação de editais; "aceitar achado" gera alteração com origem. Cadastro de outros usuários passa a fazer sentido aqui.

### F8 — Analítica e revisão adaptativa
Métricas acionáveis; intervalos configuráveis; avaliação de adaptativo sobre ≥ 3 meses de Revisões.

---

## 16. Definição do MVP

**Escolha confirmada: MVP estrutural com escopo funcional do ultramínimo** (F0 + F1).

**Visível:** registrar erro (2 campos; frase correta e complemento depois), cartão opcional, fila em 6 caixas com drill, lista passiva, pontos importados para vínculo opcional, Conta e Ajustes com tema, exportar/importar com modos e prévia, Orientações, "?" e "!", rodapé.

**Invisível, mas construído:** ids estáveis; `usuarioId` e Aparelho em tudo; esquema versionado; log de alterações; exclusão lógica; pacote com manifesto e cifra opcional; snapshot/rollback; sanitizador; modelo de Norma em duas camadas e Estrela com origem; esquema remoto com RLS pronto e vazio; interface do adaptador de sync; ponto de vínculo para login Google.

**Fora do MVP:** Hoje, Plano editável, leitor de lei (F2), login, sync, PWA instalável, busca, tags, estatísticas, calendário, diagnóstico automático, reincidência, catálogo, integrações.

| Critério | Ultramínimo | Estrutural |
|---|---|---|
| Prazo relativo | 1× | ~2× (subiu com multiusuário/segurança na base) |
| Risco de não uso | Igual | Igual |
| Risco técnico | Alto depois | Baixo |
| Dívida | Alta | Baixa |
| Expansão | Reescrita em F2–F4 | Aditiva |

---

## 19. Decisões arquiteturais

| # | Decisão | Motivo | Alternativa descartada | Consequência | Revisão futura |
|---|---|---|---|---|---|
| D1 | **Local-first**; remoto é espelho | Dados sobrevivem a conta, cota, fornecedor; offline real | Cloud-first | Log de alterações; conflitos explícitos | Não |
| D2 | IndexedDB sob camada de coleções, paginado e indexado para volume alto | localStorage é inviável | localStorage; SQLite-wasm | Camada de acesso própria | SQLite-wasm se consultas locais complexas crescerem |
| D3 | **Remoto: Postgres via Supabase** (Auth Google, RLS, região Brasil, Storage), atrás de adaptador; esquema criado em F0, usado em F4 | Multiusuário isolado, catálogo compartilhado, LGPD e consultas pedem relacional com regras por linha | Firestore existente | Importador do Firestore v2; F4 é "ligar", não reconstruir | Troca de provedor Postgres possível sem tocar domínios |
| D4 | Fonte de verdade por conceito (Ponto; Dia/Sessão; Erro/Cartão/Revisão; Norma/Versão/Dispositivo) | Elimina cadastros e telas triplicados | Ferramentas separadas sincronizadas | Importadores; antigos somente leitura | Não |
| D5 | Ordem: Recall → **Legislação** → Execução/Plano → Sync | Recall é o maior retorno por esforço; Legislação é prioridade declarada e a ferramenta atual mais frágil | Hoje antes de Legislação | Acervo antigo em uso só até F2 | Não |
| D6 | 4 áreas + captura + busca + ? + ! + Conta fora da navegação | Menos decisões; nada que não seja estudar dentro das áreas | 5 áreas | Fila em Hoje e Recall, mesma fonte | Não antes de F5 |
| D7 | Calendário é aba de Plano; prova/fases/prazos vivem no Concurso | Evita segundo planejamento | Área Calendário | FasePrazo editável com lembrete | Não |
| D8 | Uma tela Hoje, 4 blocos fixos | Próxima ação única | Painel configurável | Sem gráficos | Só com evidência |
| D9 | Erro: 2 obrigatórios; resultado ≠ causa; **frase correta** opcional = verso do cartão = item da lista passiva; captura rápida com "completar depois" | 30 s; um dado, três usos | Seis categorias obrigatórias; campo separado para verso | Diagnóstico por regras só se causa preenchida | Após 200 erros |
| D10 | Cartão nunca automático; 6 caixas; Revisão append-only; lista passiva como complemento, não substituto do drill | Evita inundar a fila; histórico permite evoluir | Flashcards automáticos; SM-2 no MVP | Menos cartões, mais revisados | Intervalos em F8 |
| D11 | **Dispositivo como nó único** (estrutural e normativo) com endereço estável e sufixo; texto na Versão; redações anteriores e notas de vigência como sub-registros do dispositivo | Uma árvore para hierarquia, estrela, filtro e reancoragem; mesmo endereço = um só dispositivo | Artigo com texto próprio; nó estrutural separado | Parser tolerante; validação de duplicata considera tachado | Não |
| D12 | **Norma em duas camadas** (conteúdo compartilhável × anotações pessoais) desde F0; catálogo e pacotes só em F7 | Única decisão que evita bloqueio para multiusuário e catálogo | Cópia integral por usuário | Promover norma ao catálogo sem migrar anotações | Não |
| D13 | **Entrada de norma: HTML colado (preferencial) e URL (alternativa); texto puro é fallback "a confirmar"** | Tachado é formatação; texto puro perde revogado × vigente | Só texto colado | Sanitizador é componente crítico | Não |
| D14 | **Redações anteriores guardadas e ocultas** por padrão, expansíveis | Leitura limpa sem perder histórico legislativo | Descartar na importação | Indicador discreto por dispositivo; ajuste global | Não |
| D15 | **Estrela** como favorito estrutural de Legislação, com herança por bloco e origem (direta / herdada / pacote / exceção); sem favoritos genéricos nem tags favoritas | Cobre o caso real (o que cai) e alimenta pacotes de incidência | Tags; favoritos por item | Regras de herança explícitas | Não |
| D16 | **"Verificar atualização" em duas etapas**: pré-checagem por notas de vigência na URL; diff completo só se houver indício ou por pedido | Barato, frequente, sem falso positivo de formatação | Diff completo sempre | Campo URL desde F2; adaptador em F6 | Não |
| D17 | **Sincronização automática, um aparelho ativo por vez**, posse com validade, conflitos explícitos com escolha do usuário, "Sincronizar agora" | Elimina quase todos os conflitos; o resto é decidido por quem sabe | CRDT; último-vence silencioso | Aparelho como entidade; somente leitura nos demais | Multi-ativo se houver demanda |
| D18 | **Segurança e LGPD como critério de aceite em toda fase**; sanitização de HTML; RLS; exclusão de conta nativa; sem telemetria de conteúdo; rodapé de responsabilidade na versão "arquivo alterado não é restaurável" | Confiança de usuários com baixa aptidão digital; produto multiusuário | Seção de segurança no fim | Cada fase tem item de segurança | Não |
| D19 | Login Google preparado em F0 (ponto de vínculo), implementado em F4 | Reduz barreira; não é necessário para validar Recall | Login no MVP | `usuarioId` local vinculado depois | Outros provedores se pedido |
| D20 | Estatísticas só acionáveis; F3 (vencidas, reincidência), F8 (resto) | Métrica sem ação é ruído | Estatísticas de acervo e tempo | Nenhum gráfico no MVP | F8 |
| D21 | Backup = pacote com manifesto, cifra opcional; importação por modo, prévia, snapshot, rollback, idempotente | Portabilidade e restauração verificável; único defeito atual que destrói dados | JSON solto; merge por id | Um formato para backup e sync | Não |
| D22 | Sem banco de questões; Precedente único com formulário por escopo; Resumo = tipo de Nota | Cadastro menor que estudo | Registrar toda questão; módulos separados | Estatísticas derivam de sessões + erros | Se importar cadernos |
| D23 | Conta e Ajustes com **Orientações**, "?" contextual e "!" (1 relato/dia, descrição obrigatória, sem dados de estudo) | Reduz medo e bloqueio; canal único | Ajuda externa; formulário livre | Conteúdo estático versionado; fila local até F4 | Não |
| D24 | Vocabulário: **Aparelho** para equipamento; **Problema** para falha da plataforma; **Erro** só para estudo | Evita colisão com Dispositivo (lei) e com Erro (Recall) | "Dispositivo" e "erro" ambíguos | Glossário obrigatório na interface | Não |

---

## Suposições declaradas nesta revisão

1. Uso pessoal até F7; outros usuários só quando catálogo e login existirem. Nada de multiusuário visível no MVP.
2. Pacotes de incidência são publicados por curador (você) e aderidos por usuários; não há edição colaborativa.
3. Frase correta e verso do cartão são o mesmo dado até o usuário editar o verso separadamente.
4. FasePrazo substitui Evento para tudo que é do concurso; Evento fica para simulado/marco/outro.
5. Aparelho não ativo fica em somente leitura, não bloqueado.
6. Modo foco vale em todas as plataformas.
7. "!" só envia após F4; antes, fila local visível ao usuário.
8. Orientações são estáticas e versionadas com o app.
9. "Volume altíssimo" = centenas de normas, muitos usuários; não milhões de itens por usuário.
10. Supabase com projeto em região São Paulo; se indisponível, a região mais próxima com aviso na política.
11. Referências cruzadas dentro do texto legal (links para outras leis) são preservadas como links; vínculo entre normas fica para depois.

## O que só uso real resolve
Captura no celular durante questões; preenchimento espontâneo da causa; rotação semanal fixa; fila com 6 caixas; se a lista passiva canibaliza o drill.

## Parte 2 (próxima entrega)
Seções 8, 9, 10 (com 10.6 Legislação detalhada: parser, editor, leitor, estrela, redações, verificar atualização), 11, 12, 13, 14 (Supabase detalhado), 17, 18, 20.
