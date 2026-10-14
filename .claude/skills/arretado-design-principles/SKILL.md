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

- Identidade (D-D2, 14/10/2026): areia no claro, espresso no escuro, **verde-cacto** no cartão do Agora, **caramelo** (claro) e **sol** (escuro) como cor do botão primário, mascote vetorial como coadjuvante e cacto verde ao lado do nome. Detalhes em `docs/design/sistema-visual.md`.
- O fundo amarelo e as demais cores de grifo pertencem ao conteúdo marcado no leitor; o botão primário usa caramelo/sol saturado e nunca o tom claro de grifo.
- Interface: Atkinson Hyperlegible Next. Leitura jurídica: Literata.
- Reutilize tokens de `src/apresentacao/estilos.css`; não crie uma segunda marca dentro do app.
- Tema escuro é modo de foco, não uma inversão ornamental.
- Estado não depende apenas de cor; ações importantes mantêm rótulo.
- Alvo de toque mínimo: 44 px. Preserve contraste AA e foco visível.

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
- Não culpa, comemora streak, faz cara triste por ausência ou pressiona o usuário.
- Deve ser original; use qualidades abstratas como formas arredondadas, expressão legível e material tátil, sem copiar personagem conhecido.

## Arquitetura

- Mantenha as quatro áreas: Hoje, Plano, Recall e Biblioteca; Conta/Ajustes ficam fora da navegação principal.
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
