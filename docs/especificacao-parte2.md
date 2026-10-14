# Arretado — Especificação de Produto e Arquitetura (Parte 2)

> **Nome:** o produto chama-se **Arretado** (nome provisório; até 22/09/2026 os documentos usavam "Acumen"). "Acumen v2" designa o protótipo anterior (não mantido).

> **Decisão de escopo — 23/09/2026 (Gabriel):** nenhum dado do Acervo antigo nem do Acumen v2 será importado; o conteúdo recomeça do zero no Arretado. Saem do escopo: importadores de erros/cartões do Acervo e do v2 (F1), importador de leis e marcações do Acervo e o critério "todas as leis do Acervo com marcações preservadas" (F2), importadores restantes do Acervo (F5) e o importador do Firestore do v2 (D3). Continuam: o importador de pontos do edital (planilha do Ciclo, via CSV) e o modo 7 "espaço separado" como função geral de backup.

**Escopo:** seções 8–14, 17, 18 e 20. Depende das decisões D1–D24 e do modelo de dados da Parte 1 (revisão 2). Vocabulário canônico da Parte 1 vale integralmente.

---

## 8. Integração entre módulos

### 8.1 Mecanismos

| Mecanismo | Regra | O que evita |
|---|---|---|
| **Identificadores estáveis** | Gerados no cliente, únicos globalmente, ordenáveis por tempo; nunca reutilizados; sobrevivem a exportação, importação e sync | Duplicata após importação; vínculo quebrado após restore |
| **Referências opcionais** | Todo vínculo é um campo nulo por padrão; a ausência nunca impede salvar, listar ou revisar | Formulário que exige classificação |
| **Eventos de domínio** | Nome estável (`entidade.acao`), payload só com ids e o mínimo de contexto, entregues em processo, na ordem, após a escrita local ser confirmada; handlers idempotentes e sem exceções propagadas | Acoplamento entre domínios; efeito colateral perdido em falha |
| **Serviços internos** | Cada domínio expõe uma interface pequena (consultar, criar, alterar); outro domínio só a usa para *ler* ou para *propor*, nunca para escrever em entidade alheia | Domínio alterando dado de outro |
| **Links de exibição** | A tela de um item consulta os serviços dos outros domínios para mostrar contagens e atalhos ("3 erros neste dispositivo"); se o módulo estiver desabilitado, o bloco simplesmente não aparece | Dependência rígida na interface |
| **Índice de busca** | Assinante de todos os eventos `*.criado/atualizado/excluido`; reconstruível do zero | Busca desatualizada como verdade |
| **Dados derivados** | Recalculados por evento e armazenados como **cache invalidável** com carimbo de versão; qualquer inconsistência é resolvida por recomputação, nunca por edição manual | Status do ponto divergente do histórico |
| **Módulos habilitados** | Preferência por usuário; módulo desabilitado mantém dados e ids; serviços respondem "indisponível"; eventos são ignorados sem erro | Perda de vínculo ao desligar módulo |
| **Permissões** | No MVP, tudo é do usuário; com catálogo (F7): conteúdo de catálogo é leitura para todos e escrita só para curador; anotações são sempre privadas | Vazamento entre usuários |

### 8.2 Exemplos conceituais

**1. Erro vinculado a questão e ponto do edital.** Usuário registra erro pelo botão global (resultado + texto). Recall grava o Erro e emite `erro.registrado{erroId, pontoId?, sessaoId?}`. Se houver sessão ativa, Execução já a associou. Depois, em "completar", o usuário escolhe o ponto; Recall emite `erro.atualizado`. Plano recalcula o status do ponto (erro aberto → "em andamento" ou "revisão pendente"). *Não acontece:* Plano não altera prioridade; o erro sem ponto continua na fila normalmente.

**2. Erro que gera cartão.** No mesmo formulário ou depois, "criar cartão": frente = "o que foi", verso = frase correta (se existir) ou vazio para edição. Recall cria o Cartão com `erroId`, caixa 1, próxima revisão = amanhã, e muda o Erro para "com cartão". Emite `cartao.criado`. *Não acontece:* não há segundo cartão automático; excluir o erro não exclui o cartão (fica com "erro removido").

**3. Cartão que entra na fila.** A fila é uma consulta: cartões ativos com `proximaRevisao ≤ hoje`, ordenados por atraso e depois por caixa. Não há entidade "fila". Hoje e Recall chamam o mesmo serviço. *Não acontece:* suspensos e arquivados nunca aparecem; não existe fila paralela por origem.

**4. Revisão que altera o agendamento.** "De novo" (antes "Errei") → caixa 1; "difícil" → mantém caixa, próxima = intervalo atual; "fácil" → caixa + 1. Recall grava uma Revisão (append-only) e atualiza o Cartão; emite `cartao.revisado`. Plano usa o evento para o status do ponto (todas as revisões do ponto em dia e sem erro aberto → "consolidado"). *Não acontece:* o intervalo não muda silenciosamente por estatística; mudança de política de caixas só vale para revisões futuras.

**5. Artigo de lei vinculado a ponto do edital.** No leitor, "vincular a ponto" em um dispositivo ou em um nó (Seção) — o nó propaga o vínculo aos descendentes como herdado, igual à estrela. Legislação grava o vínculo e emite `vinculo.criado`. Plano passa a oferecer "ler o ponto", que abre o leitor filtrado. *Não acontece:* o ponto não muda de status por ter dispositivos vinculados.

**6. Jurisprudência vinculada a dispositivo legal.** Ao completar um Precedente, o usuário digita "art. 9º-A da LEP"; o sistema oferece o dispositivo correspondente (busca por norma + endereço). O leitor passa a mostrar "1 precedente" no dispositivo. *Não acontece:* o texto do precedente não é copiado para a norma; sem norma cadastrada, o campo fica como texto livre.

**7. Alteração legislativa que cria pendência de releitura.** F6: nova Versão publicada; dispositivos confirmados como alterados emitem `dispositivo.alterado{dispositivoId, versaoAnterior, versaoNova}`. Legislação marca marcações desse dispositivo para reancoragem; Recall marca cartões e erros vinculados com "texto-base alterado"; Plano marca pontos vinculados com "releitura pendente". A pendência aparece em Hoje como um item só ("3 dispositivos alterados em LEP — revisar"). *Não acontece:* nenhum texto de cartão, erro ou nota é alterado; o "lido até" não retrocede.

**8. Conclusão de sessão que atualiza o plano do dia.** `sessao.encerrada{sessaoId, pontoId?, questoes?, acertos?}`. Execução materializa o Dia (se ainda não existia) e registra a sessão nele; Plano atualiza "última sessão" e "questões" do ponto e recomputa o status. Hoje passa a mostrar "fechar o dia". *Não acontece:* o ponto não é marcado como concluído; isso é escolha explícita no fechamento.

**9. Norma nova identificada no Radar que pode ser incluída no acervo.** F7: Achado tipo "novidade normativa" com URL. "Aceitar" oferece duas ações separadas: "importar norma" (abre o importador por URL, gera rascunho) e "criar ponto" (proposta ao Plano com origem = achado). *Não acontece:* nenhuma norma é importada nem ponto criado sem clique; o achado aceito sem ação fica como "aceito, sem aplicação".

**10. Achado do Perfil da Banca que influencia prioridade.** Achado "art. 112 da LEP cobrado em 4 das últimas 5 provas" com consequência sugerida "subir faixa do ponto X para Altíssima". "Aceitar" gera a alteração de prioridade **com origem = achado** e entrada no log do ponto; o usuário vê a mudança no Plano com o marcador da origem e pode reverter. *Não acontece:* Inteligência nunca escreve em Ponto; achado sem ponto vinculado só pode sugerir "vincular".

---

## 9. Camada de interface

### 9.1 Regras gerais (TDAH)

- **Uma ação principal por tela**, visualmente dominante; as secundárias em menu ou linha discreta.
- **Formulário em duas camadas**: campos mínimos abertos; "mais detalhes" recolhido; nada obrigatório além do mínimo.
- **Sem modais em cadeia**: no máximo um diálogo por ação; confirmações só para destrutivo.
- **Autosave** em todo texto longo (nota, verso, edição de dispositivo) com indicador "salvo".
- **Contexto preservado**: voltar de um item retorna à mesma posição de rolagem e ao mesmo filtro; o leitor lembra a posição por norma.
- **Retomada** sempre visível quando existe algo interrompido (sessão, rascunho de importação, importação não confirmada).
- **Pendência real × recomendação**: pendência tem verbo e prazo ("revisar 12 cartões", "confirmar importação"); recomendação tem "sugerido" e pode ser descartada.
- **Sem alertas sem ação**: todo aviso tem um botão que resolve ou dispensa.
- **Progresso discreto**: texto curto ou barra fina; sem gráfico nas áreas de estudo.
- **Linguagem**: vocabulário canônico; verbos no infinitivo nos botões; nunca "erro" fora do Recall.
- **Estados universais**: *vazio* (uma frase + a ação que preenche), *carregando* (esqueleto, sem spinner solto), *erro* (o que falhou, o que fazer, nada perdido), *offline* (faixa fina "sem conexão — tudo continua funcionando"), *conflito* (contador discreto em Conta; nunca bloqueia a tela de estudo).

### 9.2 Telas principais

**Hoje**
- *Objetivo:* dizer o que fazer agora.
- *Exibe:* (1) retomar sessão, (2) revisões vencidas, (3) ponto do dia, (4) fechar o dia; rodapé com dias para a prova e próximo prazo.
- *Ação principal:* a primeira das quatro que estiver disponível.
- *Secundárias:* trocar ponto; "5 min? ler 10 frases" (lista passiva); registrar erro (global).
- *Não aparece:* estatísticas, gráficos, lista de erros, calendário, pendências que não sejam de hoje.
- *Celular:* idêntico, uma coluna; botão de erro fixo no rodapé.
- *Vazio:* "Nenhuma revisão hoje. Sugestão: [ponto]. Iniciar?" *Offline:* igual. *Conflito:* não interfere.

**Plano**
- *Objetivo:* situar o usuário no edital e no concurso.
- *Exibe:* concurso ativo (fases, próximo prazo); disciplinas com barra fina de cobertura; pontos da disciplina aberta com faixa, status derivado e última atividade; rotação semanal (linha); abas Calendário e Inteligência.
- *Ação principal:* "Estudar este ponto agora" no ponto selecionado.
- *Secundárias:* alterar faixa (com motivo opcional); adiar; vincular conteúdo; ver histórico do ponto.
- *Não aparece:* erros individuais, cartões, texto de lei.
- *Celular:* lista por disciplina; detalhes do ponto em página própria.
- *Vazio:* "Importe seus pontos ou crie o primeiro" com os dois botões.

**Recall — lista de erros**
- *Exibe:* erros por recência com resultado, texto, ponto (se houver), marcador "completar"; filtros disciplina/ponto/resultado/status; abas: Erros · Frases (lista passiva) · Cartões · Histórico.
- *Ação principal:* Registrar erro.
- *Secundárias:* completar; criar cartão; marcar resolvido; ver reincidência.
- *Não aparece:* gráficos por tipo de erro (F8).

**Recall — captura**
- *Exibe:* resultado (dois botões grandes: Errei / Acertei sem certeza), campo "o que foi", botão Salvar; recolhido: frase correta, disciplina, ponto, causa, convicção, respostas, fonte, vínculos.
- *Ação principal:* Salvar (habilitado com os dois mínimos).
- *Após salvar:* uma linha "Criar cartão?" (sim / agora não) — não é modal.
- *Celular:* tela cheia, teclado já aberto no campo de texto.

**Recall — drill**
- *Exibe:* frente; toque/clique vira; três botões (De novo / Difícil / Fácil); contador discreto "4 de 12".
- *Não aparece:* caixa, intervalos, estatísticas durante a sessão.
- *Secundárias (menu):* suspender; editar; abrir erro/dispositivo de origem.
- *Fim:* "Feito. Amanhã: N." Um botão: voltar ao Hoje.

**Recall — lista passiva**
- *Exibe:* frases corretas em lista corrida, uma por linha, com origem discreta (disciplina · ponto); filtros; ordem por recência ou por reincidência.
- *Ação principal:* nenhuma além de ler; toque abre o erro.
- *Celular:* ideal em trânsito; fonte maior.

**Biblioteca — normas**
- *Exibe:* normas com título curto, progresso fino, estrelas, última leitura; busca no topo.
- *Ação principal:* Continuar leitura (última norma) ou Importar norma.
- *Secundárias:* ver por disciplina; ver só do catálogo (F7).

**Biblioteca — leitor** (detalhe em §10.6)
- *Exibe:* texto da norma na hierarquia; barra superior mínima (norma, filtro, foco); ações por dispositivo ao tocar/hover.
- *Ação principal:* ler; em modo foco, nada além do texto e do botão de retorno.
- *Não aparece:* redações anteriores (ocultas), estatísticas, metadados de importação.
- *Celular:* texto em coluna única; ações por toque longo; foco por padrão configurável.
- *Tablet:* margens de leitura; painel lateral opcional com sumário da hierarquia.
- *Estados:* *carregando* por dispositivo (rolagem infinita com esqueleto); *rascunho não publicado* — faixa "esta norma tem uma importação pendente de revisão".

**Biblioteca — importador/editor**
- *Exibe:* área de colagem (aceita HTML e texto) ou campo URL; após processar: sumário da estrutura detectada (contagem por tipo), lista de dispositivos "a confirmar", prévia rolável.
- *Ação principal:* Publicar (habilitado quando não há bloqueios).
- *Secundárias:* corrigir por artigo; corrigir por bloco; editar texto integral; converter linha em tipo; descartar rascunho.
- *Não aparece:* HTML bruto; opções de formatação livre.
- *Erro:* "Não consegui identificar artigos neste texto" com as duas saídas: colar novamente da página / editar integralmente.

**Conta e Ajustes**
- *Exibe:* seções (Aparência, Conta e sincronização, Dados, Preferências, Módulos, Privacidade, Orientações); estado de sync com última data e aparelho ativo.
- *Ação principal:* nenhuma dominante; "Sincronizar agora" e "Exportar" em destaque moderado.
- *Conflito:* lista de conflitos com o diálogo da Parte 1; contador aparece só aqui e numa linha discreta do Hoje.

---

## 10. Módulos e funcionalidades

### 10.1 Hoje

- **Próxima ação**: a primeira disponível na ordem fixa (retomar → revisar → ponto do dia → fechar). Se nada estiver disponível: "Dia encerrado. Amanhã: [ponto sugerido]".
- **Revisões vencidas**: um botão com contagem e estimativa de tempo (média histórica por cartão, com piso de 20 s); acima de 40 cartões, oferece "revisar 20 agora" como padrão e "todos" como opção — evitar a fila que assusta.
- **Ponto programado**: origem visível ("sugerido pela rotação" / "escolhido por você" / "continuação de ontem"); Trocar abre lista curta (5 sugestões + busca).
- **Bloco de questões**: no encerramento da sessão, dois números opcionais (fiz / acertei); nada de banco de questões.
- **Retomada**: sessão pausada > 15 min vira "interrompida" e aparece no topo com tempo decorrido; retomar continua a mesma Sessão.
- **Fechamento do dia**: mostra em três linhas o que foi feito (sessões, questões, revisões, erros registrados) e pergunta só sobre o ponto: concluído / continuar amanhã / adiar (com motivo opcional). Grava no Dia. Após fechar, Hoje mostra "Dia encerrado" e libera só registrar erro e revisar.
- **Pendências acumuladas**: linha única, discreta, abaixo dos blocos: "Também: 2 prazos esta semana · 1 importação a confirmar" — cada item leva ao lugar certo. Nunca lista de tarefas.
- **Itens não concluídos**: ponto "continuar amanhã" volta como ponto do dia; "adiado" sai da sugestão pelo prazo escolhido; revisões não feitas simplesmente continuam vencidas (sem "acumulou 3 dias" em vermelho).
- **Limite**: 4 blocos + rodapé + 1 linha de pendências. Nada mais.

### 10.2 Plano e Edital

- **Concursos**: vários; um "ativo" para o Hoje; troca em Plano. Cada um com banca, carreira, **Fases e Prazos** (data ou intervalo, lembrete em dias, editável, fonte).
- **Versões do edital**: novo Edital copia os pontos do anterior com referência ao ponto de origem; pontos removidos ficam "fora do edital atual" (histórico preservado); pontos novos marcados como "novo nesta versão".
- **Disciplinas / pontos / faixas**: como no Ciclo Obrigatório (Altíssima, Alta, Média, Extra); prioridade numérica só para desempate manual.
- **Status derivado** (nunca editado, exceto `adiado`):
  - *não iniciado*: sem sessão, sem erro, sem cartão;
  - *em andamento*: alguma sessão ou erro, sem critério de estudado;
  - *estudado*: ≥ 1 sessão encerrada com o ponto como principal **ou** fechamento "concluído";
  - *revisão pendente*: estudado e (cartão vencido do ponto **ou** erro aberto com reincidência);
  - *consolidado*: estudado, sem cartão vencido, sem erro aberto há ≥ 14 dias, ≥ 1 revisão "fácil" em cada cartão do ponto;
  - *adiado*: manual, com data de retorno.
- **Dependências** entre pontos: opcional; só afeta a ordem da sugestão.
- **Metas**: opcional por ponto ("40 questões"); exibida como progresso fino, nunca como cobrança.
- **Vínculos**: com dispositivos/normas (por nó ou por dispositivo), notas, precedentes; contagens no ponto.
- **Sugestão do próximo ponto**: (1) disciplina do dia pela rotação (ou qualquer, se não configurada); (2) pontos "continuar amanhã" primeiro; (3) depois por faixa; (4) desempate por menor recência e menor cobertura; (5) nunca sugere adiado antes do prazo nem consolidado enquanto houver não-consolidado da mesma faixa. Sempre mostra a razão.
- **Ajuste manual**: faixa, adiar, dependências, ordem — tudo com log (data, antes/depois, origem: manual / achado / adesão a pacote).
- **Histórico**: linha do tempo do ponto (sessões, erros, revisões, alterações de faixa).

### 10.3 Sessões de estudo

- **Início**: um toque no Hoje (ponto do dia) ou "sessão livre". Grava início e ponto.
- **Pausa/retomada**: um botão; > 15 min de pausa → interrompida.
- **Término**: "Encerrar" abre linha única: questões (fiz/acertei), anotação de uma linha. Salvar. Sem tela de resumo obrigatória.
- **Conteúdos acessados**: registrados automaticamente ao abrir norma/nota/precedente durante a sessão — servem ao histórico do ponto, não exigem nada do usuário.
- **Cronômetro**: visível por preferência (padrão: oculto); duração sempre gravada porque alimenta a estimativa de tempo de revisão e o histórico. **Nenhuma métrica de tempo é exibida como meta.**
- **Simulado** (F4): tipo de sessão com número de questões e gabarito agregado; erros do simulado se registram normalmente com fonte = simulado.

### 10.4 Questões, Erros e Diagnóstico (módulo prioritário)

**Captura (2 campos):** resultado · o que foi. **Complemento (a qualquer momento):** frase correta · disciplina · ponto · fonte (banca, prova/ano, nº) · resposta dada · resposta correta · justificativa · convicção (1–3) · causa · vínculos (dispositivo, precedente, nota) · anexo (print da questão).

**Avaliação da classificação existente:**

| Categoria atual | Decisão | Nova forma | Motivo |
|---|---|---|---|
| Lacuna | Manter | **Lacuna** — não sabia o conteúdo | Categoria mais frequente e mais acionável (estudar) |
| Erro de leitura | Manter, renomear | **Leitura** — sabia, leu errado o enunciado/alternativa | Ação diferente (atenção, não estudo) |
| Confusão entre institutos vizinhos | Manter | **Confusão** — trocou por instituto parecido | Gera cartão de contraste (A × B) |
| Erro de posição | Fundir | → **Literalidade** — errou detalhe da letra da lei (prazo, número, ordem, "e/ou", exceção) | "Posição" e "precisão" são o mesmo fenômeno na FCC |
| Falta de precisão | Fundir | → **Literalidade** | idem |
| Acerto sem convicção | Retirar da lista de causas | Vira **resultado** "acertei sem certeza" | É resultado, não causa; pode ter qualquer causa |

Causa é **opcional**; o sistema pode **sugerir** pela combinação (resultado + convicção + palavras como "prazo", "dias", "salvo", "exceto" → literalidade; "confundi", "achei que era" → confusão) e a sugestão fica marcada como "sugerida" até o usuário tocar nela. Sem confirmação obrigatória.

**Ação recomendada** (derivada da causa, editável): lacuna → estudar ponto / criar cartão; leitura → registrar sem cartão, contar reincidência; confusão → cartão de contraste; literalidade → grifar dispositivo + cartão com o texto literal.

**Reincidência**: mesmo ponto + mesmo dispositivo, ou mesmo ponto + causa igual em ≤ 60 dias. Exibida no erro e no ponto; 3+ reincidências geram pendência "ponto X: 3 erros repetidos — revisar" (uma vez, dispensável).

**Estatísticas acionáveis** (só estas, e só em Recall › Histórico): reincidência por ponto; acertos sem certeza por ponto; proporção por causa na disciplina (para saber se o problema é estudo ou atenção).

### 10.5 Cartões e Repetição Espaçada

- **Criação**: de erro (frente = o que foi; verso = frase correta), de trecho de norma/nota/precedente (frente vazia para pergunta; verso = trecho), manual. Nunca automática em lote.
- **Campos**: frente, verso, fonte (derivada da origem), contexto (link para erro/dispositivo), ponto (herdado da origem, editável), estado.
- **Fila do dia**: cartões ativos vencidos; ordem: atraso desc, caixa asc.
- **Atraso**: não penaliza; cartão atrasado revisado como "fácil" sobe normalmente.
- **Suspensão**: tira da fila sem perder caixa; motivo opcional; "suspensos" listados em Cartões.
- **Arquivamento**: sai de tudo; reativável.
- **Histórico**: Revisões por cartão; taxa de acerto; última revisão.

**Comparação de algoritmos:**

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| 6 caixas fixas (1, 3, 7, 15, 30, 60 dias) | Previsível; explicável em uma frase; zero configuração; histórico já em uso | Não adapta a cartões fáceis/difíceis | **MVP** |
| Intervalos configuráveis | Ajuste fino por usuário | Mais uma decisão; risco de mexer sem critério | F8, em Preferências avançadas |
| Adaptativo (tipo SM-2/FSRS) | Menos revisões para o mesmo efeito | Opaco; exige histórico; difícil de explicar por que "hoje" | Avaliar em F8 com ≥ 3 meses de Revisões, como opção, nunca padrão silencioso |

**Limite de criação**: aviso suave quando a fila projetada para os próximos 7 dias passar de 40/dia ("você está criando mais cartões do que revisa") — informação, não bloqueio.

### 10.6 Legislação

#### Cadastro e metadados
Título curto (obrigatório) · título oficial · referência (nº/ano) · tipo (lei, decreto, resolução, súmula vinculante…) · esfera · epígrafe · ementa · preâmbulo · disciplina(s) · **URL oficial** · fonte e data de consulta · escopo (pessoal / catálogo).

#### Importação (`fatiarLei` como serviço de estruturação)

**Fluxo 1 — colar da página (preferencial).** O app lê o HTML do clipboard (com o texto puro como reserva), **sanitiza** (remove scripts, estilos, atributos; mantém apenas parágrafos, quebras, ênfase, tachado, links) e passa ao estruturador. **Fluxo 2 — URL.** O app obtém a página (direto ou via função intermediária quando o navegador bloquear), sanitiza e segue igual; grava URL e hash. **Fluxo 3 — texto puro.** Sem formatação; tudo que depende dela fica "a confirmar".

**Regras do estruturador (ordem de aplicação):**
1. *Normalização*: espaços, º/o/°/ª, aspas, travessões, quebras múltiplas, entidades HTML.
2. *Blocos pré-normativos*: epígrafe (linha "LEI Nº … DE …"), ementa (parágrafo seguinte), preâmbulo ("O PRESIDENTE DA REPÚBLICA…", "A ASSEMBLEIA…", "O GOVERNADOR…") → metadados + dispositivo `preambulo`.
3. *Hierarquia estrutural*: linhas em caixa alta iniciadas por PARTE / LIVRO / TÍTULO / CAPÍTULO / SEÇÃO / SUBSEÇÃO (+ numeral romano ou ordinal) → nó; a(s) linha(s) seguinte(s) em caixa alta sem "Art." → nome do nó. Nota de vigência após o nome → nota do nó. Ausência de nível intermediário é permitida (Capítulo direto sob Título sem Livro).
4. *Nome/epígrafe de artigo*: linha curta, sem "Art.", não em caixa alta, imediatamente antes de um "Art." → dispositivo tipo `nome`, filho do artigo seguinte.
5. *Artigo*: `Art.` + número + sufixo opcional (`-A`, `-B`… tolerando ausência do hífen e "o" sobrescrito) + separador (`º`, `.`, `-`, `–`, espaço). Texto até o primeiro parágrafo/inciso é o caput.
6. *Parágrafo*: `§ n` ou `Parágrafo único`; *inciso*: numeral romano + `-` ou `–`; *alínea*: letra minúscula + `)`; *item*: número + `.` ou `)`. Hierarquia por sequência: inciso pertence ao último caput/parágrafo; alínea ao último inciso; item à última alínea.
7. *Notas de vigência*: trecho final entre parênteses iniciado por "Redação dada", "Incluído", "Incluída", "Revogado", "Revogada", "Vide", "Vigência", "Renumerado", "Regulamento" → extraído do texto para lista de notas do dispositivo; link preservado; lei e ano extraídos quando presentes.
8. *Redação anterior*: bloco tachado (HTML) → não gera dispositivo novo; é anexado como redação anterior ao dispositivo de **mesmo endereço** que vier a seguir (ou anterior, se o tachado vier depois). Em texto puro: dois dispositivos consecutivos de mesmo endereço em que o segundo tem nota "Redação dada" → o primeiro vira redação anterior **a confirmar**.
9. *Revogação total*: "(Revogado pela Lei…)" sem texto vigente → dispositivo com status revogado e texto vazio; redação anterior guarda o texto tachado.
10. *Renumeração*: nota "Renumerado do art. X pela Lei…" → status renumerado-de, mantendo referência ao endereço antigo para reancoragem.
11. *Anexos e tabelas*: bloco após "ANEXO" → dispositivo `anexo` com texto bruto preservado; sem tentativa de estruturar.
12. *Confiança*: por dispositivo — alta (HTML e regra única aplicada), média (HTML com ambiguidade resolvida por heurística), a confirmar (texto puro ou conflito). Publicar exige zero "conflito"; "a confirmar" pode ser aceito em lote.
13. *Validação estrutural*: sequência de artigos crescente com sufixos válidos; sem endereço duplicado após fusão de redações; toda alínea sob inciso; relatório de anomalias antes de publicar.

**Editor de rascunho/correção** — três níveis: *por artigo* (edita o artigo e seus filhos), *por bloco* (um nó da hierarquia ou um intervalo de artigos), *integral* (texto completo, re-estruturado ao salvar, preservando o que já foi confirmado). Em todos: menu "converter linha em…" (caput, parágrafo, inciso, alínea, item, nome, nota de vigência, redação anterior, nó estrutural) com numeração e recuo aplicados pelo sistema; "juntar com anterior"; "dividir aqui". O usuário nunca formata; escolhe o tipo. Edição em norma publicada gera nova Versão com origem "edição manual" e passa pelo mesmo diff — marcações são reancoradas.

**Inserção manual** (norma pequena, súmula, enunciado): mesmo editor a partir de um artigo vazio.

#### Leitor
- Hierarquia com recuo/tipografia por nível; nome do artigo acima, discreto; notas de vigência atenuadas ao fim; redações anteriores ocultas com indicador; revogado exibe "Art. X — (revogado)" em uma linha atenuada, expansível.
- **Modo foco**: só texto; botão de retorno fixo e semitransparente que acompanha a rolagem; atalho de teclado; sai na mesma posição. **Leitura artigo por artigo** (decisão de 24/09/2026): um artigo inteiro por vez num cartão iluminado, o resto esmaecido e ainda legível; "anterior"/"próximo" por botão e teclado; o "lido até" avança ao passar ao próximo.
- **Filtros**: tudo · só estrelados · só selecionados · só com marcações · só com erros. Filtros mantêm os nós estruturais dos itens exibidos como contexto.
- **Estrela**: no dispositivo ou no nó; herança e exceção conforme Parte 1; "ver só estrelados" é o modo de leitura para véspera de prova.
- **Grifos**: seleção de trecho → cor (3 cores, sem nomes) ou nota; ancorados por texto + offsets; reancoragem por busca do trecho na nova versão (exata → aproximada → pendente).
- **Lido até**: marcador por norma; "continuar leitura" abre nele; retrocede só por ação do usuário.
- **Ações por dispositivo**: estrela · grifar · anotar · vincular a ponto · registrar erro sobre este dispositivo (pré-preenche "o que foi" com a referência) · criar cartão deste trecho · ver precedentes/erros/notas vinculados · corrigir texto · copiar referência ("art. 9º-A, LEP").
- **Busca dentro da norma**: por texto e por endereço ("112", "§ 2º do 112").
- **Destaques automáticos** (opcional, decisão de 24/09/2026): com a preferência ligada, o leitor destaca prazos e tempo, exceções e condições, termos absolutos e penas, quóruns e frações ("prazo de até 30 (trinta) dias", "salvo", "desde que", "qualquer", "reclusão, de 2 (dois) a 8 (oito) anos"). Calculado na leitura, nunca gravado como grifo; estilo distinto dos grifos, que não depende só de cor.
- **Remissões** (decisão de 24/09/2026): a citação de outro dispositivo da mesma norma ("nos termos do art. 84, XIX", "§ 2º deste artigo") abre uma prévia do texto citado sem perder a posição, com "ir para" e "voltar" e aviso quando o citado foi revogado ou renumerado. Remissão para outra norma, "citado por" e "expandir no lugar" ficam no backlog.
- **Desempenho**: renderização por janela (só o visível + margem); norma de 2 mil dispositivos abre em < 1 s.

#### Atualização legislativa (F6)
1. **Verificar atualização** (manual ou periódica com consentimento): obtém a URL; extrai notas de vigência; compara a mais recente (lei/ano) com a registrada; três saídas — "sem indício de alteração", "há indício: Lei X/AAAA" (oferece importar), "não consegui ler a página" (oferece colar).
2. **Nova versão como rascunho** ao lado da vigente.
3. **Comparação estrutural** (endereços: novos, ausentes, renumerados) e **textual** (por dispositivo, ignorando diferenças só de formatação/espaço/entidades).
4. **Estados sugeridos** por dispositivo: novo · alterado · possível revogação (ausente sem nota) · revogado (com nota) · eficácia cessada (nota "Vigência" com termo) · renumerado · só formatação · erro de importação (bloco inteiro ausente, contagem discrepante).
5. **Revisão humana**: lista com prévia lado a lado; confirmar em lote por estado; qualquer "erro de importação" bloqueia publicar.
6. **Publicar**: versão vira vigente; anterior arquivada; dispositivos recebem status; redações anteriores acrescidas; marcações reancoradas; pendências de releitura para dispositivos alterados com marcação/erro/estrela; evento para Recall e Plano.
7. **Histórico de versões** por norma com "o que mudou" navegável.
8. Diferença textual **nunca** é tratada automaticamente como mudança jurídica: sem confirmação, nada muda de status.

### 10.7 Jurisprudência

**Decisão:** uma entidade Precedente com escopo nacional/internacional. Módulos separados duplicariam captura, busca, vínculo e revisão para uma diferença que é de formulário (país, tratado, tradução).

**Captura curta (≤ 20 s):** título/tese em uma linha (obrigatório) · escopo · tribunal ou órgão (sugestão por lista) · disciplina. **Complemento:** tipo · número · data · relator · fonte oficial · fatos · questão jurídica · fundamentos · conclusão · dispositivos / tratados · ponto(s) · tags · relevância para revisão · anexo · texto original · tradução · versão resumida.

**Regras:** status de leitura (não lido / lido / para revisar); "relevante para revisão" gera cartão só por ação; súmulas e teses de repercussão/repetitivo têm tipo próprio porque a FCC as cobra literalmente — nesses casos o título **é** o enunciado.

### 10.8 Resumos (Notas)

**Decisão:** Resumo é tipo padrão de Nota (outros: esquema, anotação). Campos: título, conteúdo (texto com títulos, listas, links internos para dispositivo/precedente/nota/ponto), disciplina, tema, ponto(s), fonte, anexos. Autosave. Busca por conteúdo. "Criar cartão deste trecho" por seleção. "Erros relacionados": bloco derivado com erros do mesmo ponto — lembra o que o resumo não resolveu. Sem favoritos; a estrela não se aplica (é de Legislação).

### 10.9 Inteligência de prova (Perfil da Banca + Radar do Edital)

Área única (aba de Plano, F7) com **Achados**: banca · concurso/edição · disciplina · tipo (padrão de cobrança, norma mais cobrada, artigo mais cobrado, precedente recorrente, autor/teoria, armadilha, sinal de alerta, novidade normativa, alteração de edital) · descrição · grau de confiança · fonte · data · consequência sugerida · status.

**Comparação entre edições de edital**: pontos novos, removidos, reescritos; gera achados "alteração de edital".

**Regra invariável**: recomenda, não altera. Aceitar um achado gera uma ação rastreada (alterar faixa, importar norma, criar ponto, vincular) com origem = achado, reversível. O guia FCC existente entra como lote de achados importados com confiança "média".

### 10.10 Calendário

Visão (aba de Plano) que **renderiza**: prova e fases/prazos (Concurso), simulados e marcos (Evento), dias com sessão (Dia), revisões previstas (contagem por dia, derivada da fila), pendências com data. Ações possíveis: criar/editar Evento e FasePrazo; abrir um Dia passado. **Fora do calendário**: sessões planejadas no futuro (não existem — só a rotação), metas diárias, cartões individuais, blocos de "estudar X às 19h" (não é agenda pessoal).

### 10.11 Busca, Tags e Favoritos

- **Busca global** (F5): índice local; por tipo (normas, dispositivos, precedentes, notas, erros, pontos); resultados agrupados por tipo com 3 por grupo e "ver mais"; entende endereços ("112 LEP"), números de lei, palavras; abre o item no contexto (dispositivo dentro do leitor).
- **Comandos rápidos** na mesma caixa: "erro …" (captura), "revisar", "ir para [norma]".
- **Filtros** estruturais (disciplina, ponto, norma, status, data) antes de tags.
- **Tags**: opcionais; controladas (sugestão de existentes; criar nova exige confirmação); sem favoritas; relatório de tags com 1 uso com "fundir/remover"; nenhuma tela depende de tag.
- **Favoritos genéricos**: não existem. A Estrela é de Legislação e tem semântica ("cai na prova").

### 10.12 Estatísticas

| Métrica | Classe | Onde | Decisão que provoca |
|---|---|---|---|
| Revisões vencidas | Essencial | Hoje | Revisar agora |
| Erros recorrentes por ponto | Essencial | Recall, Plano | Estudar/rever o ponto |
| Acertos sem certeza por ponto | Essencial | Recall, Plano | Consolidar antes de avançar |
| Pontos com baixa cobertura por faixa | Essencial | Plano | Escolher o próximo |
| Incidência por causa (por disciplina) | Útil depois (F8) | Recall › Histórico | Estudo × atenção |
| Desempenho por disciplina/ponto (questões) | Útil depois (F8) | Plano | Redistribuir rotação |
| Frequência de estudo (dias com sessão) | Útil depois, discreta | Conta | Nenhuma direta; feedback de constância |
| Tempo de estudo | Potencialmente contraproducente | Não exibir como meta | — |
| Itens no acervo, grifos, tags | Decorativa | Não exibir | — |
| Cartões criados por semana vs revisados | Útil (aviso) | Recall | Criar menos cartões |

---

## 11. Acessibilidade e dispositivos

- **Responsividade**: layout de uma coluna até ~700 px; duas colunas (lista + detalhe) acima; leitor sempre com largura máxima de texto (~70 caracteres por linha) e margens.
- **Papéis por aparelho** (não exclusivos): celular — captura de erro, drill, lista passiva, leitura em foco; tablet — leitura com sumário lateral, grifos; desktop — importação, edição de norma, Plano, importação/exportação.
- **Teclado**: tudo alcançável por Tab; atalhos únicos e poucos (registrar erro, buscar, foco, virar cartão, 1/2/3 no drill); foco visível sempre.
- **Contraste**: mínimo AA em ambos os temas; texto atenuado (notas, redações) ainda dentro do AA para texto grande.
- **Alvos de toque**: ≥ 44 px; ações por dispositivo no leitor via toque longo ou botão flutuante, nunca só hover.
- **Leitura de textos longos**: fonte ajustável em Conta; espaçamento de linha ≥ 1,5; sem justificado; modo foco; posição lembrada.
- **Acessibilidade cognitiva**: uma ação principal; linguagem consistente; sem contagem regressiva agressiva; estados vazios com a próxima ação; confirmações só para destrutivo; retomada visível; nada pisca.
- **Offline**: total, desde F0; faixa discreta quando sem rede; sync posterior automática.
- **PWA (F4)**: instalável em PC e celular; ícone; abertura direta no Hoje; atualização do app com aviso "nova versão pronta — recarregar" (nunca recarrega sozinho durante uma sessão).
- **Notificações (F4)**: locais; no máximo uma por dia ("N cartões para revisar") mais prazos de concurso; desligáveis; nunca para estatística.
- **Leitores de tela**: hierarquia da norma como cabeçalhos aninhados; redação anterior anunciada como "texto anterior, oculto"; drill com anúncio da frente/verso.

---

## 12. Importação, exportação, backup e restauração

### 12.1 Formatos

- **Pacote Arretado**: arquivo único contendo `manifesto` (versão do esquema, versão do app, data/hora, aparelho e usuário de origem, módulos incluídos, contagens por entidade, hash de cada arquivo e do conjunto, indicação de cifra) + um arquivo por módulo (registros completos com ids) + log de alterações do período (opcional) + anexos (opcional).
- **Escopos**: integral · por módulo · por concurso (pontos, erros, cartões, sessões, dias e vínculos daquele concurso; normas vinculadas opcionalmente) · por intervalo de datas (sessões, dias, erros, revisões).
- **Exportação legível**: Markdown por Norma (hierarquia + texto vigente, redações anteriores em bloco final), por Nota, por Precedente; CSV de erros, cartões e revisões; PDF não (pode ser gerado do Markdown fora do app).
- **Cifra opcional** com senha do usuário (o app não a guarda; sem senha, sem recuperação — dito com clareza).
- **Anexos**: fora do pacote padrão; incluídos no "integral com anexos".

### 12.2 Modos de importação

| Modo | O que faz | Quando usar |
|---|---|---|
| 1. Simulação | Só calcula a prévia; não escreve | Sempre disponível como primeiro passo |
| 2. Adicionar somente novos | Cria ids inexistentes; ignora existentes | Trazer dados de outro aparelho sem sync |
| 3. Atualizar identificados | Atualiza ids existentes se o pacote for mais recente; não cria | Corrigir em massa após edição externa validada |
| 4. Mesclar com resolução | Cria novos, atualiza mais recentes, lista conflitos (mesmo id alterado dos dois lados) para escolha | Restaurar parcial após uso |
| 5. Substituir módulo | Apaga logicamente o módulo e importa o do pacote | Reimportar normas do zero |
| 6. Restaurar integral | Substitui tudo pelo pacote | Recuperação de desastre |
| 7. Importar para espaço separado | Cria um "espaço" isolado (visível em Conta), sem tocar nos dados atuais; depois pode mesclar | Migrar Acervo antigo e Acumen v2; avaliar antes de misturar |

### 12.3 Prévia obrigatória

Antes de confirmar (modos 2–7): itens a criar, atualizar, ignorar, em conflito — por entidade; módulos afetados; se haverá exclusão (e quantas); avisos (versão de esquema migrada, pacote de outro usuário, cifra); "será criado um snapshot; você poderá desfazer em Conta › Dados". Botão de confirmar só após a prévia carregar.

### 12.4 Segurança do restore

Snapshot automático antes de qualquer modo que escreva; LogDeImportação com hash do pacote, modo, contagens, snapshot; **rollback** de um clique enquanto o snapshot existir (retenção configurável, mínimo 5); validação do arquivo (estrutura, hashes, versão de esquema ≤ atual); pacote de versão posterior recusado; pacote de outro usuário só no modo 7; prevenção de duplicatas por id e por hash de conteúdo (mesmo conteúdo com id diferente → aviso "provável duplicata", não fusão automática); importação idempotente (repetir o mesmo pacote no mesmo modo não altera nada).

### 12.5 Migração dos artefatos atuais

Importadores dedicados, sempre no modo 7 primeiro: Acervo (localStorage por pilar → normas com marcações reancoradas, resumos → notas, jurisprudências → precedentes, cartões → arquivados, erros → erros "rápidos"); Acumen v2 (export Firestore → pontos, dias, erros, cartões arquivados, acervo); Ciclo Obrigatório (planilha → pontos com faixas); Rotina (rotação semanal → preferência; prova e simulados → FasePrazo/Evento); Perfil da Banca e Radar (→ achados, F7).

---

## 13. Integrações com fontes oficiais

### 13.1 Pipeline conceitual (por fonte)

1. **Aquisição**: obter a página/documento pela URL informada; registrar data, hash, cabeçalhos relevantes; respeitar limites de requisição; falha → oferecer colar/enviar arquivo.
2. **Extração**: isolar o conteúdo principal (descartar navegação, rodapé); manter só marcação semântica (parágrafo, ênfase, tachado, link).
3. **Normalização**: caracteres, espaços, ordinais, entidades, quebras.
4. **Divisão estrutural**: hierarquia e dispositivos (regras de §10.6).
5. **Identificação**: endereços canônicos; notas de vigência; redações anteriores; revogações; renumerações.
6. **Comparação com versão anterior**: estrutural e textual; estados sugeridos.
7. **Validação**: contagens, sequência, anomalias; confiança por dispositivo.
8. **Armazenamento da fonte**: HTML sanitizado original guardado como anexo da Versão (prova de origem; permite reprocessar quando o parser melhorar).
9. **Atualização confirmada**: só após revisão humana.

### 13.2 Fontes

- **Planalto**: HTML legado, inconsistente (ordinais, hífens, tachado como `<strike>`/`<s>`/estilo, notas como links); página consolidada com todas as redações — a mais valiosa e a mais frágil. Adaptador próprio com testes de regressão sobre páginas salvas (LEP, CP, CPP, CF).
- **Assembleias e câmaras (ALESP etc.)**: estrutura própria; adaptador por casa; fallback sempre.
- **Tribunais (STF, STJ, TJs)**: para precedentes — inicialmente só "colar do site" com extração de número, data, órgão, ementa; adaptadores só se houver volume.
- **Diários oficiais**: não integrar; usar como fonte manual de Achados.
- **Órgãos internacionais (Corte IDH, ONU)**: PDF/HTML em outro idioma; entrada manual com campos de tradução; sem adaptador.
- **Documentos do usuário**: HTML salvo, PDF (texto extraível), DOCX; PDF passa pelo mesmo estruturador com confiança "a confirmar".

### 13.3 Mudanças nas páginas externas

Parser tolerante e por camadas (se a hierarquia falhar, ainda tenta artigos; se artigos falharem, entrega texto para edição integral); testes contra páginas arquivadas; versão do adaptador registrada na Versão; quando a taxa de "a confirmar" de uma importação passar de 20%, o app avisa "a fonte pode ter mudado de formato" e sugere colar. Nunca reprocessa normas publicadas sem pedido.

### 13.4 Independência

Falha de qualquer fonte externa nunca impede colar texto/HTML nem inserir manualmente. O verificador de atualização é opcional e desligável; sem URL, nada acontece.

---

## 14. Estratégia de backend e sincronização

### 14.1 Banco local

| Opção | Curva | Custo | Portabilidade | Veredito |
|---|---|---|---|---|
| localStorage | Nula | Zero | Alta (JSON) | Descartado (limite, sem índice) |
| IndexedDB com camada de coleções | Baixa-média | Zero | Alta (export próprio) | **MVP e evolução** |
| SQLite em WebAssembly | Média | Zero | Alta (arquivo SQLite) | Migração se consultas locais complexas (analítica F8) justificarem |

### 14.2 Banco remoto

| Opção | Curva | Custo | Escala | Lock-in | Segurança/LGPD | Backup | Migração |
|---|---|---|---|---|---|---|---|
| Firestore (atual) | Baixa | Zero → baixo | Alta | Alto (formato) | Regras por documento; região limitada | Export proprietário | Difícil |
| **Supabase (Postgres gerenciado)** | Média | Zero → baixo | Alta | Baixo (Postgres padrão) | RLS por linha; região São Paulo; auditoria SQL | `pg_dump` padrão | Para qualquer Postgres |
| Postgres autogerido | Alta | Servidor + operação | Alta | Nenhum | Tudo por conta própria | Padrão | — |
| Backend leve tipo PocketBase | Baixa-média | Servidor pequeno | Média | Médio | Regras próprias | Arquivo SQLite | Média |
| Arquivo em nuvem do usuário (Drive) | Baixa | Zero | Baixa | Baixo | Dados na conta do usuário | É o próprio | Fácil |

**Decisão (D3): Supabase.** Motivos decisivos: RLS resolve isolamento multiusuário no banco, não no cliente; Postgres é portável; região Brasil atende LGPD; catálogo compartilhado é uma tabela com leitura pública; Auth com Google pronta; Storage para anexos; custo zero no volume inicial.

### 14.3 Autenticação
Supabase Auth com provedor Google (único no início). Sem senha própria. Sessão com renovação automática; logout revoga o aparelho. Antes do login, `usuarioId` local; no primeiro login, vínculo (dados locais são enviados como do usuário autenticado após confirmação explícita "estes dados são meus").

### 14.4 Arquivos
Anexos em Storage do Supabase, por usuário, com regras espelhando o RLS; local em IndexedDB; upload sob demanda e opcional (o usuário pode manter anexos só locais).

### 14.5 Sincronização

| Abordagem | Prós | Contras | Veredito |
|---|---|---|---|
| **Log de alterações próprio + posse de aparelho** | Simples de explicar; conflitos raros e explícitos; alinhado a D17 | Implementação própria; exige disciplina no log | **MVP → evolução** |
| Motor de sync Postgres↔local (tipo PowerSync/ElectricSQL) | Menos código; sync por consulta | Dependência adicional; modelo de conflito deles; custo | Avaliar se o log próprio ficar caro de manter |
| CRDT | Mescla automática | Complexidade; tamanho; difícil auditar | Não |
| Último-vence silencioso | Trivial | Perde dados sem avisar | Não |

**Modelo**: tabela de alterações no remoto (append-only, por usuário, com sequência); cliente envia alterações locais desde o último cursor e recebe as remotas; aplicação idempotente; posse de aparelho como linha com expiração; conflitos como registros próprios até decisão. Frequência: ao abrir, ao reconectar, ao fechar sessão, e a cada N minutos com o app aberto; manual em Conta.

### 14.6 Cache e offline
O banco local **é** o dado, não um cache. O remoto é o espelho. Não há "modo offline": há "sem rede agora". Catálogo (F7) é baixado por adesão e fica local; atualizações do catálogo chegam pelo mesmo log.

### 14.7 Recomendação final
- **MVP**: IndexedDB + log local + pacote de backup; Supabase apenas com esquema e RLS criados (sem tráfego).
- **Evolução (F4)**: ligar Auth + sync por log + posse de aparelho; Storage para anexos.
- **Migração justificável**: para SQLite-wasm local quando a analítica (F8) exigir consultas que o IndexedDB não faz bem; para motor de sync de terceiros se o log próprio passar a consumir mais manutenção que funcionalidade; para Postgres autogerido só por exigência de custo ou de soberania de dados — a saída é `pg_dump`, sem reescrita.

---

## 17. Critérios de validação

| Critério | Meta | Como medir |
|---|---|---|
| Tempo para registrar um erro | ≤ 30 s da abertura ao salvar (mediana) | Carimbo de abertura/salvamento do formulário |
| Campos obrigatórios na captura | 2 | Inspeção |
| Tempo para iniciar uma revisão | ≤ 2 toques a partir do Hoje; ≤ 3 s até o primeiro cartão | Instrumentação local |
| Retomada de atividade interrompida | 100% das sessões interrompidas aparecem no topo do Hoje; retomar em 1 toque | Teste + uso |
| Cartões efetivamente revisados | ≥ 70% da fila do dia, em ≥ 70% dos dias com fila | Revisões / fila diária |
| Cartões criados vs revisados | Razão semanal ≤ 1,2 | Contagens |
| Erros reincidentes | Tendência de queda por ponto após 30 dias de uso do Recall | Reincidência por ponto (F3+) |
| Dias de uso | ≥ 5 por semana durante a validação | Dias com ≥ 1 ação |
| Uso em múltiplos aparelhos (F4) | Sync automática em < 10 s ao abrir; zero perda em teste A/B offline | Teste roteirizado |
| Exportação | 100% dos módulos; pacote validado por hash | Teste automático |
| Restauração | Restore integral idêntico (hash); importação repetida idempotente; rollback funcional | Teste automático |
| Offline | Todas as funções de estudo sem rede; nenhuma perda ao reconectar | Teste roteirizado |
| Conflitos de sincronização | 100% listados, 0 resolvidos silenciosamente | Log |
| Cadastros duplicados | Zero telas que registram o mesmo conceito; zero duplicatas após importação (por id e por hash) | Inspeção + teste |
| Telas sobrepostas | Uma tela Hoje; um Plano; uma fila | Inspeção |
| Importação de norma (F2) | LEP e CP do Planalto: ≥ 95% dos dispositivos corretos sem edição; 100% das redações anteriores ocultas; 0 endereços duplicados | Comparação com gabarito manual |
| Leitor (F2) | Abertura < 1 s para norma de 2 mil dispositivos; posição lembrada em 100% dos retornos | Instrumentação |
| Migração do Acervo (F2) | 100% das leis e marcações com contagem igual; marcações pendentes de reancoragem ≤ 2% | Relatório de importação |
| Segurança (toda fase) | Sanitizador bloqueia 100% de um conjunto de HTML malicioso de teste; RLS: usuário A nunca lê B (teste automatizado, F4) | Testes |
| Compreensão (Orientações) | Um usuário sem familiaridade consegue exportar e restaurar seguindo só as Orientações | Teste com uma pessoa |

Métricas de vaidade explicitamente excluídas: total de itens, total de grifos, horas estudadas como ranking, sequência de dias ("streak") com penalidade.

---

## 18. Matriz de riscos

| Risco | Prob. | Impacto | Momento | Mitigação |
|---|---|---|---|---|
| Excesso de escopo antes de validar o núcleo | Alta | Alto | F0–F2 | MVP fechado (F0+F1); critério de avanço por fase; backlog "Não agora" explícito |
| Complexidade para TDAH | Média | Alto | Toda fase | Uma ação por tela; limite de 4 blocos no Hoje; revisão de cada tela contra §9.1 |
| Cadastro maior que estudo | Alta | Alto | F2, F5 | 2 campos no erro; captura curta em tudo; importação em vez de digitação; nada obrigatório além do mínimo |
| Proliferação de tags | Média | Médio | F5+ | Tags controladas; sem favoritas; relatório de tags órfãs; estrutura antes de tag |
| Cartões em excesso | Média | Alto | F1+ | Nunca automático; aviso de fila projetada; suspensão fácil |
| Sincronização incorreta | Média | Alto | F4 | Posse de aparelho; conflitos explícitos; snapshot antes da primeira sync; kill switch; testes A/B offline |
| Perda de dados | Baixa (com D1/D21) | Crítico | Sempre | Local-first; exclusão lógica; snapshot antes de destrutivo; backup cifrado; rollback |
| Duplicação após importação | Média | Médio | F1, F2 | Modo 7 primeiro; idempotência por id + hash; prévia obrigatória |
| Dependência de fornecedor (Supabase) | Baixa | Médio | F4+ | Postgres padrão; `pg_dump`; adaptador; pacote de backup independente |
| Mudanças nas páginas do Planalto | Alta | Médio | F2, F6 | Parser tolerante em camadas; HTML original guardado; testes sobre páginas arquivadas; fallback colar |
| Legislação comparada incorretamente | Média | Alto | F6 | Diferença ≠ mudança jurídica; estados sugeridos; confirmação humana; bloqueio por "erro de importação" |
| HTML colado malicioso | Baixa | Alto | F2+ | Sanitização estrita; CSP; nunca renderizar HTML bruto; testes com payloads |
| Automações que geram ruído | Média | Médio | F1, F7 | Sugestões marcadas e dispensáveis; nada escrito sem ação; limite de 1 notificação/dia |
| Estatísticas sem ação | Média | Baixo | F8 | Tabela §10.12; cada métrica ligada a uma decisão |
| Calendário superdimensionado | Média | Médio | F4 | Visão, não área; sem sessões futuras; sem agenda pessoal |
| Migração incompleta dos dados antigos | Média | Alto | F1, F2, F5 | Modo 7; relatório de contagens; Acervo antigo mantido até confirmação; marcações pendentes listadas |
| Reconstruir todos os artefatos antes de validar | Alta | Alto | F0–F3 | Fases com condição de avanço; Perfil/Radar só como dados até F7 |
| Estrela com herança confusa | Média | Médio | F2 | Regras explícitas (direta/herdada/exceção); origem visível; teste de cenário na validação |
| Multiusuário prematuro | Média | Médio | F0–F6 | Só modelo e RLS; nenhuma tela multiusuário antes de F7 |
| Sanitização quebrar estrutura útil (tachado, links) | Média | Médio | F2 | Lista de permissão mínima e testada; HTML original guardado para reprocessar |
| Posse de aparelho travar o usuário | Baixa | Médio | F4 | Validade curta; "assumir aqui" sempre disponível; somente leitura, nunca bloqueio |

---

## 20. Backlog priorizado

Esforço: P (dias), M (1–2 semanas), G (3+ semanas). Valor: A/M/B.

### Agora (F0 + F1 — MVP)

| Item | Valor | Esforço | Dependências | Critério de aceite |
|---|---|---|---|---|
| Modelo de dados completo (com usuarioId, Aparelho, escopo de Norma, Estrela) | A | M | — | Todas as entidades da Parte 1 com índices; migração v1 aplicada |
| Banco local com coleções, índices e paginação | A | M | Modelo | 10 mil registros sintéticos sem degradação |
| Log de alterações | A | P | Banco | Toda escrita gera entrada; reconstrução do estado a partir do log em teste |
| Pacote de backup com manifesto e cifra opcional | A | M | Log | Exportar → apagar → restaurar → hash idêntico |
| Importação com 7 modos, prévia, snapshot, rollback | A | M | Pacote | Idempotência; rollback em 1 clique |
| Sanitizador de HTML | A | P | — | Bloqueia conjunto de teste; preserva tachado e links |
| Shell: 4 áreas, captura global, ?, !, rodapé, Conta e Ajustes (tema, dados, Orientações v1) | A | M | — | Navegação em celular e desktop; tema persistido |
| Recall: captura (2 campos + completar depois), frase correta | A | P | Banco | ≤ 30 s; 2 obrigatórios |
| Recall: cartão opcional, 6 caixas, fila, drill, Revisão append-only | A | M | Captura | Fila correta; histórico gravado |
| Recall: lista passiva | M | P | Frase correta | Lista filtrável; abre o erro |
| Recall: suspender/arquivar | M | P | Cartão | Fora da fila; reativável |
| Importador Ciclo Obrigatório → pontos (somente leitura) | A | P | Modelo | 138 pontos com faixas |
| Importadores de erros/cartões (Acervo, v2) → arquivados | M | P | Importação | Contagens batem; nada na fila |
| Esquema remoto com RLS (vazio) | M | P | Modelo | Teste de RLS com dois usuários fictícios |
| Relato de problema com fila local (1/dia) | M | P | Shell | Descrição obrigatória; limite respeitado |

### Próximo (F2 — Legislação; F3 — Hoje e Plano)

| Item | Valor | Esforço | Dependências | Critério de aceite |
|---|---|---|---|---|
| Estruturador: hierarquia, dispositivos com sufixo, notas, redações anteriores (HTML) | A | G | Sanitizador | LEP/CP ≥ 95% sem edição |
| Importação por URL | M | P | Estruturador | Mesmo resultado do colar; URL gravada |
| Fallback texto puro com "a confirmar" | M | P | Estruturador | Confirmação em lote |
| Editor por artigo/bloco/integral com tipos e recuo | A | M | Estruturador | Converter linha em qualquer tipo; nova Versão ao editar publicada |
| Leitor: hierarquia, redações ocultas, notas atenuadas, lido até | A | M | Estruturador | Abertura < 1 s; posição lembrada |
| Modo foco | A | P | Leitor | Botão acompanha rolagem; sai na mesma posição |
| Estrela com herança e exceção; filtro "só estrelados" | A | M | Leitor | Cenário Seção I → propaga; exceção persiste |
| Grifos e anotações com reancoragem | A | M | Leitor | Marcações do Acervo importadas ≥ 98% |
| Ações por dispositivo (erro, cartão, vincular, copiar referência) | A | P | Leitor, Recall | Erro pré-preenchido com referência |
| Importador do Acervo (leis + marcações) | A | M | Leitor | Contagens iguais; Acervo antigo em somente leitura |
| Hoje com 4 blocos; Dia; Sessão mínima; fechamento | A | M | Recall | Fechamento ≥ 70% dos dias com sessão |
| Plano: pontos, status derivado, rotação, sugestão, troca, adiado, log de prioridade | A | M | Pontos | Sugestão com razão visível |
| Reincidência | A | P | Erros com ponto | Pendência única e dispensável |
| Vínculo dispositivo/nó ↔ ponto; "ler o ponto" | M | P | Leitor, Plano | Leitor abre filtrado |

### Depois (F4 — conta e sync; F5 — Biblioteca; F6 — atualização)

| Item | Valor | Esforço | Dependências | Critério de aceite |
|---|---|---|---|---|
| Login Google e vínculo do usuário local | A | P | Esquema remoto | Vínculo com confirmação explícita |
| Sync por log; posse de aparelho; diálogo de conflito; "Sincronizar agora" | A | G | Login | Teste A/B offline sem perda |
| PWA instalável; notificações locais | M | P | Sync | Instala em PC e celular; 1 notificação/dia |
| Concurso com Fases/Prazos; aba Calendário; simulados | M | M | Plano | Prazo aparece no Hoje; edição sem burocracia |
| Precedentes (captura curta + complemento) | M | M | — | ≤ 20 s |
| Notas com autosave e links internos | M | M | — | Link para dispositivo abre no leitor |
| Busca global e comandos rápidos | A | M | Índice | < 300 ms local |
| Importadores restantes do Acervo (resumos, jurisprudência) | M | P | Notas, Precedentes | Contagens iguais |
| Verificar atualização (pré-checagem por notas de vigência) | M | M | URL gravada | Três saídas corretas em teste com página arquivada |
| Diff estrutural/textual com estados, confirmação, reancoragem, pendências | A | G | Verificar | Atualização real de uma lei sem perda de marcação |
| Exportação legível (Markdown/CSV) | M | P | Pacote | Arquivos abrem fora do app |

### Talvez (F7 — catálogo e inteligência; F8 — analítica)

| Item | Valor | Esforço | Dependências | Critério de aceite |
|---|---|---|---|---|
| Promover norma ao catálogo; adesão total/parcial | A (futuro) | G | Sync, RLS | Aderente lê sem copiar anotações do curador |
| Pacotes de incidência por carreira | A (futuro) | M | Catálogo, Estrela | Estrelas de pacote com origem visível; cancelar adesão remove só elas |
| Achados; guia FCC importado; comparação de editais | M | M | Plano | Nenhuma alteração sem clique |
| Estatísticas por causa e por disciplina | M | P | Volume de dados | Cada métrica com ação |
| Intervalos configuráveis; avaliação de adaptativo | M | M | ≥ 3 meses de Revisões | Opção, nunca padrão silencioso |
| Exportação cifrada agendada para nuvem do usuário | M | P | Pacote | Lembrete mensal dispensável |
| SQLite-wasm local | B | G | Necessidade analítica | Só se IndexedDB falhar em consulta real |

### Não implementar por enquanto

Tags favoritas · favoritos genéricos · flashcards automáticos do acervo · estatísticas de acervo (itens, grifos, tags) · tempo de estudo como meta ou ranking · calendário como área · agenda pessoal por hora · banco de questões · edição colaborativa de pacotes · integração com diários oficiais · adaptadores de tribunais · calendário externo · notificações push de servidor · múltiplos aparelhos ativos simultâneos · CRDT · IA para diagnóstico ou geração de cartões.

---

## Encerramento

Com as Partes 1 e 2, a especificação cobre diagnóstico, produto, dados, arquitetura, interface, módulos, backup, integrações, backend, fases, MVP, validação, riscos, decisões e backlog. O que ainda **não** está decidido — e deve ser decidido antes de qualquer código — é apenas de natureza técnica de implementação (linguagem, framework de interface, biblioteca de acesso ao IndexedDB, formato exato do pacote), e essas escolhas devem obedecer às decisões D1–D24, não o contrário.
