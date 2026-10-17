---
name: arretado-design-principles
description: Regras de produto, linguagem, visual, acessibilidade, movimento e personagem do Arretado. Use automaticamente em qualquer trabalho de UI, UX, landing page, página de venda, conteúdo visual, avatar ou revisão de frontend deste repositório.
user-invocable: false
---

# Princípios de design do Arretado

## Fontes de verdade

`CLAUDE.md` e `docs/proxima-sessao.md` já estão em contexto; não releia. Abra só a seção pertinente de `docs/planos/plano-mestre.md`, o código/CSS/testes do fluxo afetado e o brief em `docs/design/`, se existir.

Se houver conflito, `CLAUDE.md` e o plano-mestre vencem. Não reabra uma decisão por estética. Vocabulário obrigatório, local-first, sanitização de HTML colado e ordem das fases valem como no `CLAUDE.md`.

## Promessa e ciclo

A promessa é: **volte exatamente de onde parou e faça uma coisa por vez**.

Toda interface deve fortalecer pelo menos um elo:
`retomar → ler ou responder → registrar o erro → confirmar a correção → revisar → retomar`.

O sucesso é reduzir tempo até começar, preservar o ponto de retomada e produzir uma sessão útil. Tempo no app, streak e volume de cliques não são objetivos.

## Hierarquia

- Uma ação dominante por tela.
- “Depois” é subordinado a “Agora”.
- Divulgue opções progressivamente; não despeje decisões.
- Estados vazios dizem qual é a próxima ação; não abrem chat genérico.
- Não use dashboard de métricas antes do hábito.
- Não use vermelho, perda de sequência, culpa ou urgência artificial para motivar.

## Visual vigente

- Identidade (D-D5 e D-D6, 16 e 17/10/2026; vale sobre a D-D2, a D-D3 e a D-D4): **Creme** `#fff8ec` (fundo, com pontinhos `#d6c9b3` só no `body`), **Marinho** `#14213d` (texto, título, bloco-herói), **Sol** `#ffb627` (ação), **Argila** `#c8763a` (etiqueta de matéria), **Verde-foco** `#2fa36b` (salvo e Frases; texto: `#268256`), **Azul-céu** `#3ba7f0` (Cartões), tema escuro sobre o Marinho profundo `#0c1527` —, o cacto verde ao lado do nome ("Arretado", Playfair Display) e o mascote vetorial como coadjuvante. A fonte de verdade dos valores é `src/apresentacao/estilos.css`; o sistema descrito está em `DESIGN.md` (raiz) e `docs/design/sistema-visual.md`; as decisões, em `docs/design/decisoes-design.md` (D-D5 e D-D6). Os nomes antigos (`--terracota`, `--caatinga`, `--solace`, `--acqua`, `--palha`, `--areia`) são aliases até a F12: não os use em código novo.
- **Cor tem papel (D-D5):** Sol (com texto Marinho) = a ação (botão primário, um por tela, o "+", foco no escuro); Marinho = onde estou e o que guardei (bloco-herói, item e aba selecionados, título de página, foco no claro); Verde-foco = calma (progresso, "salvo", interruptor; como texto, `--verde-foco-texto`); Argila = só a etiqueta de matéria (texto Marinho); Azul-céu = Cartões; tinta = conteúdo; vermelho = só excluir e falha técnica, nunca no estudo. **A matéria é uma etiqueta Argila: não há tom de cor por disciplina nem faixa colorida na borda de cartão, item ou aviso. Verde-oliva e caramelo não são cor de interface.**
- **Botões (D-D6, macio):** primário compacto (altura 44, raio 14; largura total só em cartão e formulário), secundário de contorno, fantasma (`.botao-texto`, ao lado do primário) e linha de ação (`.linha-acao`); nada de botão empilhado onde uma linha de ação resolve. Só o dock do Leitor, os botões do modo foco e a pílula de navegação têm transparência.
- **Blocos por estado:** no máximo um bloco-herói por tela de orientação, e a cor diz o estado (Estudando = Marinho com Sol, Distraído = creme quente, Sorrindo = cartão claro, Determinado = Marinho com Sol e as revisões prontas); Leitor e Revisão em curso ficam calmos, sem bloco-herói. Raios: 28 (bloco), 16 (cartão), 14 (botão e campo), pílula (chip, aba, navegação). O que está dentro tem raio menor que o que o contém.
- **Plataformas (D-D5):** celular (< 700) e tablet em pé (700 a 899) com pílula flutuante Marinho de navegação (Hoje · Trilha · Fixar · Biblioteca, ícone e rótulo) e o "+" redondo na linha do título das telas que criam algo, uma coluna; desktop e tablet deitado (≥ 900) com navegação no topo e duas colunas no Hoje, no Fixar e na Trilha. O "+", o dock e a pílula nunca cobrem texto. Enquanto a F2 não chega, o código tem barra reta embaixo.
- Amarelo, verde e rosa de grifo pertencem ao conteúdo marcado no leitor, não ao CTA nem à interface. Os destaques de termo (prazos, condições, absolutos, penas) são sublinhados de estilos diferentes, não fundos.
- Interface: Atkinson Hyperlegible Next. Leitura jurídica: Literata.
- Reutilize tokens de `src/apresentacao/estilos.css`; não crie uma segunda marca dentro do app.
- Tema escuro é modo de foco, não uma inversão ornamental.
- Estado não depende apenas de cor; ações importantes mantêm rótulo.
- Alvo de toque mínimo: 44 px (link no meio de frase é a única exceção). Preserve contraste AA (texto 4,5:1, gráficos 3:1, inclusive o anel de foco dentro do bloco-herói) e foco visível.
- Título de página e marca em Playfair Display 700 (hospedada em `src/apresentacao/fontes/`, nunca CDN) na cor de título; título de cartão e de bloco em sans bold; o texto quebra qualquer palavra longa e nenhuma tela rola na horizontal. Ícones são SVG de um só traço, nunca glifos Unicode (✓, ⓘ, ☆).

## Linguagem

- Português do Brasil, concreto, curto, sem jargão de startup.
- Fale de comportamentos observáveis: dificuldade de começar, perda do fio, dúvida sobre o próximo passo.
- Nunca pergunte, armazene ou use diagnóstico clínico; não faça promessa de tratamento.
- Use o vocabulário obrigatório do projeto.
- Não invente preço, depoimento, estatística, garantia, integração, roadmap ou funcionalidade.
- Diferencie claramente o que existe, o que é protótipo e o que é futuro.

## Movimento

- Movimento explica continuidade, foco ou relação espacial; não serve para decorar.
- Prefira transições discretas de 150–220 ms no aplicativo.
- Landing pages podem usar narrativa por rolagem, mas cada efeito deve responder “o que isso explica?”.
- Evite animações simultâneas, loops constantes, scroll hijacking, parallax agressiva e texto indispensável revelado só por animação.
- Implemente `prefers-reduced-motion`; a experiência reduzida deve manter ordem, conteúdo e ação.
- Leitura, formulários e revisão devem funcionar sem a camada de movimento.

## Personagem

- O personagem é opcional e coadjuvante: orienta estados, confirma conclusão e ajuda na retomada.
- Não é professor, terapeuta, chatbot, autoridade jurídica nem representação de “IA”.
- Não substitui rótulos, mensagens de erro ou navegação.
- Não aparece em toda tela nem durante leitura profunda.
- Não culpa, comemora streak, faz cara triste por ausência ou pressiona o usuário. O "andamento do dia" em pontos (cartão Sorrindo) conta as tarefas do dia, nunca uma sequência de dias.
- Deve ser original; use qualidades abstratas como formas arredondadas, expressão legível e material tátil, sem copiar personagem conhecido.

## Arquitetura

- Mantenha as quatro áreas: Hoje, Trilha (código `plano`), Fixar (código `recall`) e Biblioteca; Conta/Ajustes ficam fora da navegação principal. "Em seguida" é o antigo "Depois". Só o texto de tela muda: rotas e identificadores ficam.
- Se a ideia depender de fase bloqueada, produza spec ou protótipo isolado, não código de produção.

## Pronto visual

Uma mudança de UI só está pronta com:
- Estados principal, vazio, carregando quando aplicável, offline e erro recuperável.
- Desktop, tablet e celular; sem overflow horizontal.
- Teclado, foco visível, semântica e axe nos dois temas quando aplicável.
- Zoom 200% e tamanho de fonte ampliado.
- Movimento normal e reduzido.
- Testes existentes verdes e novos testes proporcionais ao risco.
- Evidência visual e divergências registradas; não declare sucesso por inspeção do código apenas.
