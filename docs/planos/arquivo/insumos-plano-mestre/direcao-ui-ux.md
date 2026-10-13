# Direção de UI/UX para o Arretado

> **Insumo arquivado em 13/10/2026.** Consolidado (com correções) no [`plano-mestre.md`](../../plano-mestre.md), que vale em divergência.
## Recomendação central
O Arretado não deve parecer um chatbot cercado de ferramentas de estudo. Deve parecer **um ambiente de continuidade**: ao abrir, a pessoa entende onde parou, qual é a próxima ação e quanto esforço ela exige. Isso responde diretamente ao problema já identificado no projeto — começar, manter o contexto, registrar um erro e retornar sem reconstruir mentalmente a sessão.

A melhor combinação de referências é: **Tiimo para tornar tempo e próximos passos visíveis; Structured para a linha do dia; Readwise Reader para leitura longa; Goblin Tools para destravar tarefas; Headspace para calma e segmentação; Duolingo apenas para feedback imediato e sensação de progresso**. A IA deve operar nos bastidores, dentro do contexto atual, e não ocupar a tela inicial.
## Lições dos produtos
| Produto | Padrão útil | Aplicação no Arretado | O que não copiar |
|---|---|---|---|
| **Tiimo** | Linha visual, temporizador, subtarefas e widgets que mostram “o que vem agora”; foi finalista do Apple Design Awards 2024 e declara mais de 4 milhões de downloads.[^1][^2][^3] | Card dominante “Retomar”, plano visual curto e decomposição opcional do estudo | Excesso de cores, ícones e personalização antes de a pessoa dominar o fluxo |
| **Structured** | Uma única linha temporal reúne tarefas, rotinas e calendário; inclui caixa de entrada rápida, subtarefas e replanejamento.[^4][^5] | Tela “Hoje” com Agora, Depois e Revisão; atrasos são remanejados, não tratados como falha | Transformar o Arretado em agenda genérica |
| **Readwise Reader** | Leitura sem distração, destaque, anotação, posição sincronizada, atalhos e texto em voz alta.[^6][^7][^8] | Leitor jurídico como núcleo; posição exata salva; ações de trecho selecionado; preferências tipográficas | Biblioteca densa de filtros e painéis para usuários avançados |
| **Goblin Tools** | Um comando decompõe tarefas; o modo Taskmaster percorre um item por vez e oferece “o que vem depois”.[^9][^10] | Botão “Estou travado” que transforma uma meta em três a cinco passos verificáveis | Lista infinita de microtarefas ou IA acionada sem pedido |
| **Headspace** | Navegação segmentada e experiência sem interrupções; uma reformulação orientada à qualidade elevou a avaliação Android de 3,5 para 4,7 no período relatado.[^11] | Tom calmo, poucos módulos visíveis, transições discretas e uma atividade principal por tela | Conteúdo promocional e catálogo competindo com o estudo atual |
| **Duolingo** | Caminho guiado, resposta imediata e celebração de marcos; a empresa relata maior conclusão diária com Friend Streak.[^12][^13] | Celebrar sessões concluídas, artigos vencidos e revisões recuperadas | Sequência punitiva, culpa por faltar e recompensas que eclipsam aprendizagem |
| **Finch / Forest** | Finch liga pequenas ações a um companheiro virtual; Forest transforma sessões de foco em uma floresta visível.[^14][^15] | Progresso cumulativo opcional e sereno, como um mapa preenchido por estudo real | Mascote obrigatório, moeda virtual, ameaça de “matar” progresso ou infantilização |
## Identidade funcional
A proposta de valor visual pode ser resumida em uma frase: **“Volte exatamente de onde parou e faça uma coisa por vez.”** Esse posicionamento diferencia o produto de apps de IA cuja tela inicial é uma caixa vazia pedindo que o usuário formule um prompt.

Três princípios devem governar cada tela:

- **Continuidade antes de descoberta:** retomar tem prioridade sobre explorar recursos.
- **Reconhecimento antes de memória:** mostrar matéria, artigo, última marcação e próximo passo; não exigir que a pessoa se lembre do contexto.
- **Ação antes de configuração:** permitir começar com padrões bons e revelar opções avançadas somente quando solicitadas.

A orientação da W3C reforça títulos claros, navegação previsível, controles convencionais e consistência visual para pessoas com dificuldades cognitivas e de aprendizagem. A mesma orientação recomenda exibir etapa atual, etapas concluídas e pendentes para que alguém interrompido possa se reorientar sem reiniciar o processo.[^16][^17][^18][^19]
## Arquitetura proposta
### Hoje
A tela inicial deve responder, nesta ordem: **onde parei, o que faço agora, o que acontece depois**.

1. **Retomar estudo:** um card grande com matéria, documento, ponto exato, tempo aproximado e botão “Continuar do art. 37”.
2. **Agora:** apenas uma ação recomendada, com alternativas secundárias “Trocar” e “Estou travado”.
3. **Depois:** no máximo duas ações, visualmente menores.
4. **Revisões esperando:** contador discreto; sem vermelho punitivo.
5. **Captura rápida:** campo para guardar uma pendência sem organizá-la naquele momento.

Se não houver histórico, o estado vazio não deve abrir um chat. Deve oferecer três começos concretos: **Adicionar material**, **Escolher matéria** ou **Fazer uma sessão de 10 minutos**.
### Biblioteca
A Biblioteca deve separar **retomada** de **acervo**. O primeiro bloco é “Continue de onde parou”; abaixo ficam recentes e matérias; busca e filtros detalhados entram em uma gaveta.

Cada item precisa mostrar só o necessário: título, matéria, progresso significativo e última atividade. Miniaturas decorativas, várias etiquetas coloridas e menus permanentes aumentam a competição visual; a W3C recomenda tornar tarefas importantes fáceis de localizar e dividir conteúdo em blocos claros.[^20][^21]
### Leitor
O leitor é o produto principal, não uma tela de passagem. O padrão deve favorecer texto jurídico longo:

- Coluna com largura confortável, entrelinha generosa e controle de tamanho, contraste e fonte.
- Cabeçalho mínimo com caminho “Biblioteca › Constitucional › CF/88 › art. 37”.
- Progresso sem pressão: “12 de 48 artigos” é mais informativo que uma porcentagem abstrata.
- Modo foco que oculta navegação, mantendo somente texto, marcador de posição, “Registrar erro” e saída.
- Seleção de trecho com quatro ações: **Destacar**, **Anotar**, **Explicar** e **Criar questão**.
- Retorno exato à posição, inclusive depois de registrar erro ou fechar o navegador.
- Leitura em voz alta opcional, seguindo a ideia de iniciar no trecho atual usada pelo Readwise Reader.[^8]
### Registro de erro
O requisito de dois campos obrigatórios pode continuar sem atrito. Ao tocar em “Registrar erro”, o sistema já deve anexar matéria, documento, artigo, trecho selecionado e horário; o usuário preenche somente **“O que respondi/pensei?”** e **“Qual é a correção?”**.

O formulário deve abrir em painel lateral no desktop e folha inferior no celular, sem retirar o leitor do contexto. Depois de salvar, uma confirmação curta oferece “Voltar à leitura” como ação dominante; instruções devem aparecer junto aos campos e antes do erro, não apenas após uma tentativa inválida.[^22]
### Revisão
A revisão deve parecer uma fila finita, não outro dashboard. Mostrar **um cartão por vez**, com origem visível, pedido claro de recuperação ativa e três respostas: **Lembrei**, **Quase** e **Não lembrei**.

Ao revelar a resposta, destacar a diferença entre lembrança e correção; oferecer “Abrir no texto” preserva rastreabilidade. No fim, exibir evidência concreta — “7 erros revisitados; 3 voltam amanhã” — em vez de pontos sem significado pedagógico.
## IA no lugar certo
A IA deve ser apresentada como **verbo contextual**, não como destino. Em vez de uma aba “IA”, usar ações como:

- “Quebre esta meta em passos” no Plano.
- “Explique este trecho” no Leitor.
- “Transforme em questão” em um destaque.
- “Compare minha resposta com a correção” no Registro de erro.
- “Organize estas pendências” na captura rápida.

Toda geração deve preservar fonte e contexto, mostrar que é sugestão editável e ter **Desfazer**. O caminho manual permanece primeiro; a pessoa não deve depender de prompt, nem confiar cegamente em conteúdo gerado.
## Sistema visual
A identidade existente — papel esverdeado, sálvia e marca-texto — pode ficar mais memorável sem ficar barulhenta. A recomendação é um sistema de baixa estimulação com detalhes táteis:

| Elemento | Direção |
|---|---|
| Fundo | Marfim esverdeado muito claro; superfícies elevadas apenas um tom acima |
| Cor de ação | Verde-sálvia escuro para botão primário e foco; uma única cor de destaque por tela |
| Marca-texto | Amarelo moderado apenas para trechos e estado de retomada, nunca como decoração geral |
| Tipografia UI | Sans-serif altamente legível; pesos 500 e 650 para hierarquia |
| Tipografia do leitor | Fonte configurável, largura de linha controlada e opções de entrelinha |
| Cartões | Bordas suaves, sombra mínima e agrupamento por espaço, não por caixas em toda parte |
| Ícones | Convencionais, sempre acompanhados de rótulo nas ações importantes |
| Movimento | 150–220 ms, usado para confirmar relação entre ação e resultado; respeitar redução de movimento |

Consistência de posição, rótulo, aparência e foco reduz a necessidade de reaprender controles em cada página. Acessibilidade técnica deve acompanhar o acabamento: contraste, foco de teclado visível, alternativa a arrastar, alvos confortáveis e estados não comunicados apenas por cor.[^18][^23][^24]
## Personalização responsável
“Amigável para TDAH” não significa impor uma estética única. O estudo disponível sobre estudantes com TDAH em ambientes digitais aponta barreiras de layout, sensação de sobrecarga e importância de adaptabilidade, embora a base de evidências específica ainda seja limitada.[^25]

Por isso, oferecer poucos perfis compreensíveis é melhor que dezenas de controles:

- **Calmo:** pouca cor, animação mínima e navegação reduzida.
- **Guiado:** próximo passo, temporizador e indicadores de etapa mais visíveis.
- **Leitura:** tipografia ampliada, coluna estreita e ferramentas escondidas.

Cada ajuste deve ter pré-visualização e poder ser revertido. O onboarding pode perguntar “O que mais atrapalha hoje?” — começar, manter foco, entender textos ou revisar — e configurar apenas a ênfase inicial, sem rotular ou diagnosticar a pessoa.
## Evitar estes padrões
- Home com chat vazio e sugestões genéricas de prompt.
- Sete cards com o mesmo peso e nenhuma ação recomendada.
- Notificações culpabilizantes ou sequência perdida após um dia ruim.
- Cor diferente para cada matéria em todos os componentes.
- Painéis de métricas antes de haver hábito e dados úteis.
- IA que altera plano, resposta ou material sem confirmação.
- Modo foco que impede sair ou esconde como voltar.
- Customização estética antes de resolver retomada, leitura e revisão.
## Prioridade de execução
### Primeira entrega
1. Padronizar navegação, botões, cartões, campos, estados vazios e foco de teclado.
2. Fazer “Retomar” dominar Hoje e Biblioteca.
3. Salvar e restaurar posição exata, modo e preferências do leitor.
4. Abrir Registro de erro em até dois toques, com contexto preenchido.
5. Retornar ao mesmo trecho depois do registro.
### Segunda entrega
1. Criar revisão de um cartão por vez com “Abrir no texto”.
2. Adicionar captura rápida e “Estou travado”.
3. Oferecer perfis Calmo, Guiado e Leitura.
4. Incluir IA apenas em ações contextuais, começando por decompor tarefa e explicar seleção.
### Terceira entrega
1. Integrações, sincronização e leitura em voz alta.
2. Progresso cumulativo sereno e compartilhamento opcional.
3. Recursos sociais ou comerciais somente quando aumentarem retorno e aprendizagem.
## Métricas de eficácia
O principal indicador não deve ser tempo total no app. Avaliar:

- **Tempo até começar:** da abertura ao início de leitura/revisão.
- **Retomada bem-sucedida:** retorno ao ponto correto sem busca ou navegação extra.
- **Registro contextual:** proporção de erros salvos sem abandonar o texto.
- **Recuperação após interrupção:** pessoa fecha e continua depois sem perder a etapa.
- **Conclusão útil:** sessão termina com trecho lido, erro registrado ou revisão feita.
- **Confiança percebida:** “Sei o que fazer agora” antes e depois da reformulação.

Testar os fluxos com pessoas com TDAH e outras diferenças cognitivas é indispensável; conformidade técnica sozinha não demonstra que a experiência reduz desorientação ou sobrecarga. O teste inicial pode ser curto e concreto: abrir, retomar, ler, registrar um erro, voltar ao trecho e encerrar.
## Critério de diferenciação
O Arretado será percebido como produto próprio quando sua unidade básica não for “uma conversa com IA”, mas **um ciclo de estudo recuperável**:

**retomar → compreender → registrar dificuldade → continuar → revisar**.

A tecnologia distintiva é a memória desse ciclo: contexto, posição, decisão e próximo passo. A IA melhora etapas específicas; a interface garante que a pessoa sempre consiga começar e voltar.

---

## References

1. [Smart ADHD planner app | Visual timers, AI checklists & ...](https://www.tiimoapp.com/product) - Tiimo is a flexible planning app built for ADHD, Autism, and anyone who needs visual structure. Try ...

2. [2024 winners and finalists - Apple Design Awards](https://developer.apple.com/design/awards/2024/) - Meet the winners and finalists for the 2024 Apple Design Awards

3. [Tiimo: To-Do List Planner - App Store - Apple](https://apps.apple.com/jp/app/tiimo-to-do-list-planner/id1480220328?l=en-US) - Download Tiimo: To-Do List Planner by tiimo on the App Store. See screenshots, ratings and reviews, ...

4. [Structured: Daily Planner Todo - App Store - Apple](https://apps.apple.com/us/app/structured-daily-planner-todo/id1499198946) - Download Structured: Daily Planner Todo by unorderly GmbH on the App Store. See screenshots, ratings...

5. [Structured - Daily Planner – Apps on Google Play](https://play.google.com/store/apps/details/Structured_Daily_Planner?id=io.unorderly.structured&hl=en_GB) - Daily planner & to-do list to organize your day and build structure

6. [Readwise Reader: The first read-it-later app built for power readers.](https://readwise.io/read) - Save everything to one place to overcome content overload, search instantly, and highlight like a pr...

7. [Readwise Docs](https://docs.readwise.io/reader) - Readwise Reader is a powerful extension of the Readwise platform designed to enhance your digital re...

8. [Text-to-Speech (TTS) - Readwise Docs](https://docs.readwise.io/reader/docs/faqs/text-to-speech) - This will start the TTS at whichever paragraph is roughly centered on your screen when you start it.

9. [Magic ToDo - Goblin Tools](https://goblin.tools/ToDo)

10. [Taskmaster](https://goblin.tools/Taskmaster)

11. [Headspace drive business growth by investing in Android app quality](https://developer.android.com/stories/apps/headspace) - Headspace drive business growth by investing in Android app quality.

12. [5 product lessons we learned from building Friend Streak](https://blog.duolingo.com/product-lessons-friend-streak/) - Go behind-the-code to see how we built Friend Streak: a new social feature!

13. [You're on fire! Or, how we brought the streak milestone to life](https://blog.duolingo.com/streak-milestone-design-animation/) - Our animation team made the streak a lot cooler—and more fun! See how the design evolved (and which ...

14. [Finch: Free Self-Care Pet App, Features & Finch Plus](https://finchcare.com/about-finch) - Meet Finch, the free self-care pet app for iOS and Android. Explore daily goals, reflections, breath...

15. [Stay Focused Whenever...](https://www.forestapp.cc/?page=9&curso=2216&cd_oferta=563) - Take back the hours you keep losing. A mindful focus timer for intentional living — free to start yo...

16. [Cognitive accessibility - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Cognitive_accessibility) - Cognitive accessibility covers accessibility considerations for people with cognition and learning d...

17. [Help Users Understand What Things are and How to Use Them - W3C](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/) - Users with cognitive and learning disabilities may have trouble with orientation and learning. This ...

18. [www.w3.org · patterns · o1p03-consistent-designUse a Consistent Visual Design | Cognitive Accessibility ...](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p03-consistent-design/) - User Need I need to understand my options and the tasks I can perform and I can identify the control...

19. [Cognitive Accessibility Design Pattern: Make Each Step Clear - W3C](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/) - User Need I need to recognize where I am in the architecture of the web site, application, or multi-...

20. [Cognitive Accessibility Objective: Help Users Find What They Need](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o2-find/) - Users with cognitive and learning disabilities may have trouble finding the content they need. They ...

21. [Use Clear and Understandable Content | Cognitive ...](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/) - Some users have impaired language skills. More of these users understand content which uses easy to ...

22. [Use Clear Step-by-step Instructions | Cognitive Accessibility Design ...](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/) - User Need I need clear labels, step-by-step instructions and clear error messages, so I know exactly...

23. [New in 2.2 Draft](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) - This page lists the new success criteria in Web Content Accessibility Guidelines (WCAG) 2.2. It incl...

24. [w3c.github.io · consistent-navigation-labels[Draft] Consistent navigation labels - WCAG 3 Support ...](https://w3c.github.io/wcag3/informative/consistency-across-views/consistency/consistent-navigation-labels/)

25. [A Think Aloud Study Exploring the Experiences of Students ...](https://arxiv.org/html/2506.10598v1)

