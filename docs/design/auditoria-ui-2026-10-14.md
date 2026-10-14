# Auditoria visual do app — 14/10/2026

Revisão independente e read-only, no formato de `.claude/skills/arretado-visual-review`. Base: `integracao` em `79e007f` (inclui #120, #127, #132, #137, #142). Pedido do Gabriel (14/10/2026): adaptar as decisões de design, porque a tentativa anterior manteve o plano original em verde e reduziu a qualidade das interfaces e dos blocos de cor do Stitch. Referência de fidelidade: o protótipo aprovado [`prototipo/hoje.html`](prototipo/hoje.html) e [`sistema-visual.md`](sistema-visual.md).

## Veredito

O app funciona, é legível e acessível nos pontos que a suíte mede, mas **parece um protótipo**: só o cartão Agora tem identidade; o resto é texto sobre areia, controles nativos e botões verde-oliva da identidade anterior (sálvia). O protótipo aprovado tem vidro, esferas, título serifado, pílula de navegação e blocos de cor com função; a implementação trouxe o cartão verde e o botão caramelo do Hoje e parou aí. Nenhum bloqueio de tarefa (P0). Cinco achados P1 (colisão do "+", alvos de toque, barra do Leitor, CTA inconsistente e rolagem horizontal no Plano), onze P2 e cinco P3.

## Matriz de execução

| Item | Como |
|---|---|
| Rotas | 27 (todas as de `App.tsx` navegáveis sem id, mais a LEP aberta no Leitor) |
| Aparelhos | celular 390×844 (×2), tablet 768×1024, desktop 1440×900 |
| Temas | claro e escuro (`prefers-color-scheme`) |
| Movimento | `reducedMotion: reduce` nas capturas (estável); movimento normal não foi capturado |
| Dados | inventados: LEP compilada (lei pública) com "Lido até aqui" no art. 112, plano da Defensoria pelo onboarding, 4 erros com cartão, 3 tarefas; relógio fixo em 14/10/2026 09:30 |
| Medição | DOM em cada tela: rolagem horizontal (largura da página contra a do aparelho), alvos < 44 px, texto sob o "+" no início e no fim da página |
| Ferramenta | `npm run build && node scripts/capturas-ui.mjs --rotas todas --medir --folhas` (semeia pela interface, fotografa e mede; saída em `test-results/capturas/`) |

Não coberto: zoom de 200%, teclado e axe nos estados novos (a suíte E2E existente segue verde e cobre axe nas rotas principais), Sessão aberta, retorno após dias, estados de erro e offline, modo foco do Leitor, aparelho físico, pessoas. Entram a cada fatia (ver [`../planos/redesign-v2.md`](../planos/redesign-v2.md)).

## Evidência

Folhas de contato (JPEG) em [`../redesign/auditoria-2026-10-14/`](../redesign/auditoria-2026-10-14/): `antes-01-hoje-e-revisao-celular`, `antes-02-areas-celular`, `antes-03-desktop`, `antes-04-tablet`, `antes-05-formularios-e-listas-celular`, `antes-06-recall-e-acervo-celular`, `antes-07-biblioteca-e-conta-celular`. As folhas vêm do build de `af9dda9` e as medidas do de `79e007f` (a diferença é só os rótulos do #142). Medidas por tela (tema claro; o escuro dá o mesmo): [`antes-medidas.json`](../redesign/auditoria-2026-10-14/antes-medidas.json), para comparar depois de cada fatia.

## Achados

Formato: **id · prioridade · onde · evidência · regra · correção mínima (fatia)**. Fatias = PRs do plano [`redesign-v2.md`](../planos/redesign-v2.md) (F1 fundação, F2 casca, F3 Hoje, F4 Revisão, F5 Recall, F6 Leitor, F7 Biblioteca, F8 Plano, F9 Conta e Sessão, F10 transições, F11 plataformas).

### P1

- **V-01 · P1 · celular, 24 de 27 rotas** · no fim da página o "+" flutuante cobre o texto do rodapé ("Backup e dados"): Hoje, Sessão, Onboarding, Tarefas, Orientações, as 7 telas do Recall, as 7 da Biblioteca (menos o Leitor) e as 5 da Conta. Já na primeira tela ele cobre texto em 19 rotas: o rodapé nas páginas curtas e conteúdo em sete (o "Descer" e o "Deixar para o fim" de uma tarefa, a frase de um cartão, o tamanho de um item do Acervo, o primeiro ponto dos Pontos). As rotas sem colisão no fim são o Plano e os Pontos (estouram a largura, V-21) e o Leitor. Regra: sem sobreposição (skill, "Pronto visual"). Correção: o "+" vira satélite da barra de áreas e sai do canto do conteúdo (F2).
- **V-02 · P1 · todas as rotas** · alvos de toque abaixo de 44 px, medidos por DOM: 163 elementos no celular, 321 no tablet e 365 no desktop; as 27 rotas têm pelo menos um. Os mais comuns: rodapé "Backup e dados" 89×17 (em todas as rotas), links de texto de 17 a 29 px ("Voltar ao Plano" 96×19, "Editar pontos e matérias" 155×19, "registrar um erro" 118×21, o título de cada cartão e de cada ponto), `<input>` sem `type` com 185×21 ou 129×16 (Buscar, "O que fazer?", endereço), `summary` de 24 px, caixas e rádios do Acervo e dos Pontos. No celular, por tela: Acervo 48, Pontos 27, Leitor 16, Tarefas 13, Orientações 12. A suíte só mede `/conta/dados`. Regra: alvo mínimo de 44 px (`CLAUDE.md`, skill). Correção: base de campos e de linhas (F1) e linhas de lista com alvo inteiro (F5 a F9); o teste de alvos passa a varrer as rotas principais.
- **V-03 · P1 · Leitor, celular e tablet** · a barra flutuante (Buscar, Filtrar, Ações, Modo foco) mais "Lido até aqui" cobre duas a três linhas do trecho que a pessoa está lendo, e os cinco botões têm o mesmo peso (L-1 da avaliação crítica). Regra: uma ação dominante; o texto da lei é o protagonista. Correção: "Lido até aqui" primário na zona do polegar, o resto agrupado, e reserva de rolagem para a barra nunca cobrir o texto (F6).
- **V-04 · P1 · Revisão, Tarefas, Onboarding, Sessão, Acervo, Leitor** · o mesmo gesto tem duas cores: caramelo/sol no Hoje e no Recall, verde-oliva em "Mostrar resposta", "Começar" das tarefas, "Adicionar tarefa", "Continuar", "Salvar", "Lido até aqui", "Adicionar do acervo" e nos botões dos estados vazios. Regra: D-D2 ("botão primário caramelo") e ação dominante identificável. Correção: um só estilo primário em vidro caramelo/sol (F1).
- **V-21 · P1 · celular, Plano e Pontos** · a página fica 125 px mais larga que a tela (515 px num aparelho de 390): o navegador alarga a janela, a barra de áreas sai do lugar, o "+" some do canto e o texto encolhe ou obriga a rolar para o lado. Causa medida no navegador: alguns títulos de pontos da Defensoria vêm com os espaços perdidos (`diretrizeseinstrumentosconstitucionaisdodireitoconsumerista.19.Defesa…`), formam palavras de mais de 400 px, e a lista não quebra palavra; `overflow-wrap: anywhere` no link do ponto zera o estouro. A suíte não pega, porque o Playwright mede o viewport e não a largura da página. Correção: o conteúdo passa a quebrar qualquer palavra longa (F1, global) e a coluna da grade vira `minmax(0, 1fr)` (F8); o teste E2E de largura entra com a F1. **Dado a corrigir à parte:** os títulos sem espaço vêm do catálogo importado (avisar o Gabriel).

### P2

- **V-05 · P2 · todas** · o verde da identidade anterior segue como cor de interface: links sublinhados em verde-oliva, item ativo da navegação e das abas (pílula tingida de sálvia com contorno), rádio selecionado, callout "Frase correta", progresso, "+" (13 usos de `--primaria`, 6 de `--agora-fundo`, 7 de `--agora-borda` em `estilos.css`). Contradiz D-D2 e o protótipo, onde o verde só aparece no cartão Agora, na marca e em "estou aqui". Correção: papéis de cor da D-D3 (F1 e F2).
- **V-06 · P2 · celular e tablet** · navegação inferior chapada, com pílula contornada, esticada a 768 px no tablet; o protótipo traz pílula de vidro flutuante (blur 16, item ativo em bloco sólido). Correção: F2.
- **V-07 · P2 · desktop** · o cartão Agora e o botão esticam a 868 px (largura da coluna) e não há segunda coluna; o protótipo usa duas colunas (Agora | Depois e captura). O Recall é uma coluna de 1.100 px sem estrutura. Correção: grade de duas colunas a partir de 900 px (F3, F5).
- **V-08 · P2 · Hoje** · o cartão diz só "4 cartões vencidos e 4 frases para rever / cerca de 4 min": falta o onde e o quê (o protótipo traz etiqueta de disciplina, onde parou e o trecho); não há "Depois"; metade da tela fica vazia; o aviso de backup usa o rótulo "Depois" (dispensar), que se confunde com o "Depois" do plano. Correção: F3.
- **V-09 · P2 · formulários** · campos nativos sem estilo: `<input>` sem `type`, `select` sem seta própria, caixa e rádio do navegador, controle de tamanho azul do sistema em Aparência. Correção: F1.
- **V-10 · P2 · tipografia** · todo título de página é Atkinson 1,5 rem; o protótipo usa Literata 700 em 2,5 rem com linha de apoio (data). Sem escala de títulos. Correção: F1 e F3.
- **V-11 · P2 · Plano** · 194 pontos numa lista corrida de texto sem agrupar, recolher nem mostrar andamento; em Pontos, cada título é link sublinhado com chip "Não iniciado" (A-7 da avaliação crítica). Correção: F8.
- **V-12 · P2 · Recall** · "✕ Errei" em vermelho em cada item da lista de Erros (R-2: punitivo; o rótulo é o resultado do registro, o #142 só trocou os botões de resposta da revisão), títulos de cartão como links sublinhados, etiqueta "completar" sem alvo, quatro abas em pílulas tingidas; "Revisar frases (4)" solto abaixo do cartão. Correção: F5 (cor neutra no resultado; o texto continua com a thread dos textos).
- **V-13 · P2 · Biblioteca** · cinco abas quebram em duas linhas; filtros (Buscar, Ano, Tipo de norma) empilhados com campos nativos na primeira dobra; Acervo com caixas de 13 px e "Mudar" por item. Correção: F7.
- **V-14 · P2 · Revisão** · o cartão central é bom; "Mostrar resposta" é verde-oliva; "Depois: mais 3 cartões nesta rodada" fica colado ao botão e "Mais opções" solto; a resposta usa o callout sálvia. Correção: F4.
- **V-15 · P2 · Conta, Orientações, Privacidade** · listas de links sublinhados e blocos de texto longos sem agrupamento nem cartões. Correção: F9.

### P3

- **V-16 · P3 · cabeçalho** · "Ajuda" como texto solto ao lado do ícone da conta; o protótipo usa botões de vidro de 44 px. Correção: F2.
- **V-17 · P3 · rodapé legal** · aparece em toda tela e é o primeiro a ser coberto pelo "+" (V-01). Correção: F2.
- **V-18 · P3 · plataformas** · sem favicon, manifest, ícones, `theme-color` nem `env(safe-area-inset-*)`: a aba não tem ícone e a barra do navegador não leva a cor da marca. Correção: F11.
- **V-19 · P3 · transições** · troca seca entre rotas (T-1 da avaliação crítica); plano em [`../planos/transicoes-e-carregamento.md`](../planos/transicoes-e-carregamento.md). Correção: F10.
- **V-20 · P3 · estados vazios** · textos bons, sem ícone nem mascote e com botão verde-oliva; a lista de Normas some sob o cartão de retomada. Correção: F1 e F7.

## Protótipo aprovado × app hoje

| Elemento | Protótipo (D-D2) | App em 14/10 | Fatia |
|---|---|---|---|
| Título da página | Literata 700, 2,5 rem, data embaixo | Atkinson 1,5 rem | F1, F3 |
| Cartão Agora | etiquetas (disciplina e AGORA), título serifado, "lei · quando", trecho em caixa translúcida com realce azul, CTA com seta, raio 28 | título serifado 1,3 rem, "cerca de N min", CTA, raio 20 | F3 |
| Depois | linha do tempo com esferas de 44 px, linhas de 64 px, duração em pílula | ausente | F3 |
| Segurança | "✓ Seu ponto está salvo neste aparelho." | ausente | F3 |
| Captura | campo "Anote a frase correta" + Guardar no Hoje | só o "+" | F3 |
| Navegação | pílula de vidro flutuante, ativo em bloco sólido | barra chapada, ativo em pílula tingida | F2 |
| Botão secundário | vidro suave, pílula, 44 px | retângulo de 12 px com borda | F1 |
| Cabeçalho | marca + botões de vidro | marca + "Ajuda" texto + ícone | F2 |
| Desktop | duas colunas, 1.040 px | uma coluna de 900 px | F3 |
| Mascote | 124 px, apoiado na borda do cartão | 96 px | F3 |

## O que preservar

- As quatro áreas, o "Agora" com uma ação dominante e a saída "Escolher outra coisa".
- O texto da lei em Literata, a coluna de leitura, o modo foco e a espiada.
- Cartão verde e botão caramelo/sol em vidro no Hoje: já estão fiéis ao protótipo.
- Tema escuro espresso, tokens com contraste medido (`scripts/contraste.mjs`), foco visível de 3 px, link para pular o menu, atalho E.
- A tela de Revisão de frases (Fácil e De novo em vidro com ícone) e a barra fina de progresso.
- Sem rolagem horizontal no tablet e no desktop (27 rotas).

## Limitações

Chromium headless em Linux (a renderização de fonte pode diferir de aparelhos reais); dados inventados; sem teste com pessoas; capturas em movimento reduzido. A medição de alvos conta todo elemento interativo com menos de 44 px em qualquer lado, inclusive link no meio de frase (a norma WCAG 2.5.8 abre exceção para ele; a regra do projeto, não).
