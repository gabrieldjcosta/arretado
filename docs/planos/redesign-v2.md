# Redesenho v2 das telas e das plataformas — plano (14/10/2026)

Dono: thread "Redesenho de telas e plataformas" (UI, esforço máximo; **não conta** no limite de 2 tarefas de código). Origem: pedido do Gabriel em 14/10/2026 (adaptar as decisões de design; a tentativa anterior manteve o verde do plano original e reduziu a qualidade das interfaces e dos blocos de cor do Stitch). Diagnóstico: [`../design/auditoria-ui-2026-10-14.md`](../design/auditoria-ui-2026-10-14.md) (V-01 a V-21). Decisão: D-D3 em [`../design/decisoes-design.md`](../design/decisoes-design.md). Alvo visual: [`../design/sistema-visual.md`](../design/sistema-visual.md). Este plano substitui [`redesign.md`](redesign.md) (já arquivado) para a camada de apresentação; o `plano-mestre.md` continua valendo para tudo o mais.

## Como cada fatia é entregue

- Um PR por fatia, de rascunho para o branch `integracao`; sai de rascunho com CI verde e a "Fila de merges" é avisada nesse momento.
- Só apresentação (D-D1): nada de esquema, dado, sincronização nem regra de domínio. Lógica pura nova (por exemplo, a lista do "Depois") vai em arquivo próprio com teste.
- Pronto de uma fatia:
  1. `npm run check` verde e o E2E das telas tocadas verde nos três projetos (desktop, celular, tablet), com axe nos dois temas.
  2. `node scripts/capturas-ui.mjs --rotas todas --medir`: nas telas da fatia, sem rolagem horizontal, sem alvo abaixo de 44 px (fora link em frase corrida) e sem texto sob o "+"; comparar com `antes-medidas.json`.
  3. Folhas "antes e depois" da tela (claro e escuro; celular, tablet e desktop) em `docs/redesign/v2/<fatia>/`, JPEG, até 500 kB por PR.
  4. Revisão pelo formato de `arretado-visual-review`, sem P0 nem P1 aberto na tela.
  5. Docs: `sistema-visual.md` se um valor mudou, `glossario.md` se nasceu termo, `solucao-de-problemas.md` se houve tropeço, uma linha em `proxima-sessao.md`.
- Antes de tocar arquivo que outra thread mexe, aviso a ela; texto e rótulo são da thread "Aprimoramentos das revisões" (ver "Quem mexe em quê").
- Sem estimativa de tempo: a ordem abaixo é a de valor e de dependência.

## Fatias

| # | Fatia | Fecha | Toca | Depende de |
|---|---|---|---|---|
| F1 | **Fundação**: tokens v2, botões, links, campos, abas, chips, callouts, linhas, títulos | V-02 (base), V-04, V-05, V-09, V-10, V-20 (botões), V-21 (quebra de palavra) | `estilos.css`, CSS dos pacotes, `scripts/contraste.*`, E2E de alvos e de largura | — |
| F2 | **Casca por plataforma**: cabeçalho, pílula de navegação, "+" satélite, rodapé, safe-area | V-01, V-06, V-16, V-17 | `Shell.tsx`, casca em `estilos.css`, E2E da navegação | F1 |
| F3 | **Hoje**: Agora v2, Depois, segurança, captura inline, duas colunas, Retorno, Fechar o dia | V-07 (Hoje), V-08, V-10 (Hoje) | `hoje/*`, `componentes/AcaoAgora`, `LinhaDepois`, `dominios/hoje/depois.ts` (novo) | F2 |
| F4 | **Revisão**: cartão central, resposta, botões sem vermelho, fim de rodada | V-14 | `recall/Drill.tsx`, `RevisarFrases.tsx` | F1 |
| F5 | **Recall**: início, abas, listas, registrar, detalhe | V-02 (Recall), V-07 (Recall), V-12 | `recall/*` | F1, F2 |
| F6 | **Leitor**: dock com "Lido até aqui" primário, ferramentas agrupadas, reserva de rolagem | V-03 | `biblioteca/Leitor*`, barra | F2 |
| F7 | **Biblioteca**: abas, filtros, normas, Acervo, súmulas, teses, resumos, precedentes, importar | V-13, V-20 (Normas) | `biblioteca/*` | F1, F2 |
| F8 | **Plano**: matérias recolhidas com andamento, Pontos, Tarefas, Onboarding | V-11, V-21 (grade), V-02 (Pontos e Tarefas) | `plano/*` | F1, F2 |
| F9 | **Conta e Sessão**: Conta, Aparência, Perfis, Dados, Privacidade, Orientações, Sessão | V-15 | `conta/*`, `sessao/*`, `orientacoes/*` | F1, F2 |
| F10 | **Transições entre rotas** (View Transitions) e atraso do `Esqueleto` | V-19 | `App.tsx`/rotas, CSS de movimento | F2 |
| F11 | **Plataformas**: favicon, manifest, ícones, `theme-color`, `viewport-fit`, tablet deitado | V-18 | `index.html`, `public/`, `vite.config.ts` | F1 |

Ordem de trabalho: F1 → F2 → F3 → F11 (barata e visível) → F4 → F6 → F5 → F8 → F7 → F9 → F10. A F10 entra por último porque a transição só vale com a casca e as rotas já no desenho final; as demais podem se sobrepor duas a duas, porque depois da F1 cada tela tem o próprio CSS de pacote.

### F1 — Fundação (só CSS e testes)

- Os três blocos de tokens (`:root`, `prefers-color-scheme: dark` e `[data-tema='escuro']`) com os valores de `sistema-visual.md`; `scripts/contraste.mjs` e `.test.ts` ganham os pares novos (o teste exige claro-escuro-sistema igual ao escuro manual).
- `.principal` vira vidro caramelo/sol em todo o app (um estilo só); secundário em vidro; `.botao-texto` e `.botao-icone` novos; `.perigo` só cheio no diálogo.
- Campos: todo `input` (com ou sem `type`), `select` e `textarea` com altura 48, contorno `--borda-campo` e seta própria; caixa e rádio com marca de 24 px num rótulo de 44.
- Abas, chips, callouts, linhas de lista, cartões, estado vazio, `Esqueleto` e diálogo nos tokens novos; H1 em Literata.
- `overflow-wrap: anywhere` no conteúdo (V-21) e `min-width: 0` nos filhos de grade.
- Sai o verde-oliva: os 13 usos de `--primaria`, 6 de `--agora-fundo` e 7 de `--agora-borda` de `estilos.css` e o de `estilos-precedentes.css`; depois `--primaria`, `--agora-*`, `--progresso`, `--depois` somem (conferir com `git grep` que nenhum TSX e nenhuma outra thread dependem deles).
- Foco: `--bloco-foco` dentro de bloco-herói.
- Testes: o de alvos varre as rotas principais (hoje só `/conta/dados`); novo teste de largura (390 px, sem rolagem horizontal) nas rotas semeadas.
- **Não muda estrutura de TSX.** Se um estilo exigir classe nova, a classe entra na fatia da tela.

### F2 — Casca por plataforma

- Cabeçalho: marca, Ajuda e Conta em botões de ícone de vidro; no desktop, navegação em pílula ao centro e "Registrar erro (E)" à direita.
- Navegação: pílula flutuante de vidro no celular e no tablet em pé (`fixed`, 12 px da borda e do `safe-area`), item ativo em `--selecionado-*`; "+" de 64 px ao lado, no caramelo/sol; some com o teclado aberto (`visualViewport`).
- Rodapé legal no fim do conteúdo (botão de texto de 44), reserva de rolagem igual à altura da pílula mais 12 px, `safe-area` e 16 px: o "+" nunca cobre texto.
- Muda o ponto de aparição do "+" (hoje < 700, passa a < 900) e o do "Registrar erro" do cabeçalho (≥ 900); ajustar os E2E que dependem desses nomes acessíveis. O atalho E e o nome "Novo registro de erro" ficam.

### F3 — Hoje

- Agora v2: etiquetas (matéria e AGORA), título em Literata, "lei · quando", trecho em caixa translúcida com a linha atual em azul claro (quando a ação é leitura salva), botão com seta e estimativa em pílula, mascote de 124 px apoiado na borda; "Escolher outra coisa" como botão de texto.
- Linha "✓ Seu ponto está salvo neste aparelho." quando existe ponto de retomada.
- Depois: linha do tempo com até 2 esferas de matéria. Lista pura `listarAcoes(entrada)` em `src/dominios/hoje/depois.ts`, que importa os tipos de `proxima-acao.ts` sem mudar a assinatura de `decidirProximaAcao`.
- Captura inline ("Anote a frase correta" + Guardar no Hoje) sobre o caso de uso que o "+" já usa; só a frase é obrigatória (D25).
- Desktop em duas colunas (7fr · 5fr); Retorno com o mascote Distraído; Fechar o dia com o Sorrindo; o aviso de backup deixa de usar o rótulo "Depois".
- Conflito conhecido: `Agora.tsx`, `proxima-acao.ts` e `RecallInicio.tsx` recebem texto e fila única da thread "Aprimoramentos"; a F3 entra depois do PR deles ou rebaseia sobre ele.

### F4 a F10 (resumo)

- **F4 Revisão:** cartão central em Literata de 1,5 a 1,75 rem; "Mostrar resposta" primário; resposta em callout verde "Frase correta"; De novo, Difícil e Fácil em vidro com ícone, sem vermelho; progresso fino e "Sair" no topo; "Mais opções" numa folha; fim de rodada com bloco-herói e o mascote Sorrindo. Sem mascote durante a revisão.
- **F5 Recall:** início com resumo, abas rolantes e a lista em linhas de 56 px com esfera de matéria; resultado "Errei" em cor neutra; "Revisar frases" dentro do resumo; registrar com campo único em destaque; desktop em duas colunas.
- **F6 Leitor:** dock com "Lido até aqui" primário e quatro botões de ícone (Buscar, Filtrar, Ações, Modo foco; os nomes acessíveis ficam); reserva de rolagem para o dock nunca cobrir o texto; busca e filtro em folha; coluna de 70 ch; modo foco, penumbra e cartão de artigo **não mudam**.
- **F7 Biblioteca:** abas rolantes, filtros recolhidos, normas em cartões com esfera de matéria, Acervo com linhas de 56 px e caixa de 44, súmulas e teses numa lista só (decisão de 14/10), grade de 2 e 3 colunas em tablet e desktop.
- **F8 Plano:** matérias recolhidas com andamento ("12 de 107"), pontos ao abrir, Tarefas e Onboarding nos componentes novos; coluna `minmax(0, 1fr)` (V-21).
- **F9 Conta e Sessão:** listas de cartões agrupados, Aparência com controles próprios, Perfis, Dados, Privacidade e Orientações com índice; Sessão iniciar e encerrada em blocos; a faixa "Sessão · Pausar · Encerrar" (componente da thread "Aprimoramentos") posicionada e estilizada aqui.
- **F10 Transições:** View Transitions de até 150 ms entre rotas, desligada com `prefers-reduced-motion` e no perfil Calmo; nunca anima texto da lei nem remonta o Leitor; atraso de 150 ms no `Esqueleto`; padrão "andamento" nas operações longas ([`transicoes-e-carregamento.md`](transicoes-e-carregamento.md)).

### F11 — Plataformas

Favicon (o cacto), `manifest.webmanifest` (nome, `display: standalone`, `theme_color` e `background_color` da marca), ícones de 192 e 512 (também `maskable`) e `apple-touch-icon`, `<meta name="theme-color">` por esquema de cor, `viewport-fit=cover`, e conferência do tablet deitado (1024×768) e do aparelho instalado. A CSP já admite `manifest-src 'self'`.

## Quem mexe em quê

| Thread | Arquivos | Regra |
|---|---|---|
| Redesenho (esta) | `estilos.css`, CSS dos pacotes, `Shell.tsx`, `hoje/*`, `componentes/*`, estrutura e visual de `Drill.tsx`, do Leitor e das telas | avisa antes de tocar o que outra thread mexe |
| Aprimoramentos das revisões | texto e rótulos (`recall/rotulos.ts`, `textos.ts`), fila única (`RecallInicio.tsx`, `proxima-acao.ts`), voz regional, **componente** da faixa da Sessão (sem decisão visual) | PRs pequenos e com merge logo; a UI rebaseia |
| Contas, login e banco (F4-A) | telas de conta e login atrás de `VITE_CONTA=0` | usa os componentes da F1 quando ela chegar; até lá, estilo mínimo |
| Fila de merges | merge em `integracao` | recebe o aviso de cada PR verde |

## Perguntas ao Gabriel (vale o padrão se não houver resposta)

1. **Calmo desliga as transições**, como no plano de 14/10, mas Calmo é o perfil padrão (quem não escolheu perfil é "calmo"). Padrão adotado: seguir a regra, então a transição só aparece em Guiado e Leitura. Se preferir a transição no padrão, a regra passa a ser só `prefers-reduced-motion`.
2. O "+" vira satélite da pílula, no lugar do canto (D-D3, a).
3. O "Depois" mostra até 2 itens (D-D3, b).
4. Títulos de página em serifa (D-D3, c); links em argila (d); seis tons de disciplina (e).
5. **Dado, não design:** alguns títulos de pontos da Defensoria vêm com os espaços perdidos (por exemplo `diretrizeseinstrumentosconstitucionaisdodireitoconsumerista.19.Defesa…`). O app passa a quebrar a palavra, mas o catálogo precisa ser corrigido na origem.
