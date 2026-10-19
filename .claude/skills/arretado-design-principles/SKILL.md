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
- “Em seguida” é subordinado ao Agora.
- Divulgue opções progressivamente; não despeje decisões.
- Estados vazios dizem qual é a próxima ação; não abrem chat genérico.
- Não use dashboard de métricas antes do hábito.
- Não use vermelho, perda de sequência, culpa ou urgência artificial para motivar.

## Visual vigente

- **Direção (D-D7, Ponto de luz, 18/10/2026; troca os valores da D-D5 e da D-D6):** areia clara, uma folha de cal com sombra fresca e a caneta-cacto de vidro onde a pessoa parou, com um ponto de luz na ponta. Valores: `src/apresentacao/estilos.css`. Sistema: `DESIGN.md` (raiz) e `docs/design/sistema-visual.md`. Decisão: `docs/design/decisoes-design.md` (D-D7). Contrato: `docs/design/referencias/2026-10-18-ponto-de-luz/contrato.md`. Fases: `docs/planos/ponto-de-luz.md`.
- **Paleta:** Areia `#f1e6d3` (o chão, liso, sem textura), Cal `#ffffff` (a folha), Tinta `#17243a` (texto e marcado), Tinta 2 `#4f5b70` (atenuado), Vidro `#0f7f72` (ação; como texto, `#0a6157`), Luz `#6fe3d6` (estado), Traço `#c8742f` (só o sol e o miolo das flores do quadro do cacto). À noite, o mesmo mundo no azul fundo: Noite `#0b1b33`, Folha da noite `#142a4a`, tinta `#eef3f8`, Vidro claro `#7df3e1` com texto `#0b1b33`. Em código, os tokens de papel (`--fundo`, `--superficie`, `--texto`, `--acao`, `--atual-*`, `--selecionado-*`), não o hex. Os nomes da D-D5 e da D-D4 (Creme, Marinho, Sol, Argila, Verde-foco, Azul-céu, Terracota, Caatinga, Solace, Acqua) saíram do código (`TOKENS_REMOVIDOS` em `scripts/contraste.test.ts`).
- **Cor tem papel:** vidro = a ação (o botão primário, **um por tela**; também o cacto da marca e o andamento); cal = "onde estou" (a folha do Agora, a área e a aba atuais com a sombra fresca e o rótulo em negrito, o lido no Leitor); tinta = texto, títulos, foco e o marcado (caixa, rádio, botão ligado: tinta cheia com a marca em cal); luz = só estado (pontos do Dia, Estrela, ponta da caneta), nunca texto, sempre com contorno na tinta, nunca pulsa nem segue o dedo; caramelo = só o sol e o miolo das flores do quadro do cacto; vermelho = só excluir e falha técnica, nunca no estudo. **A matéria vai pelo nome, em neutro: sem cor por disciplina nem faixa colorida na borda de cartão, item ou aviso.**
- **Botões:** primário de vidro (altura 44, raio 12, Atkinson 600 de 15 px; largura total e 52 px só na folha do Agora), secundário em cal com contorno de 1 px, fantasma (`.botao-texto`, sublinhado, ao lado do primário), linha de ação (`.linha-acao`) e perigoso (contorno vermelho; cheio só no diálogo de confirmação). Transição só de transformação e sombra, nunca de cor. O "+" do título é cal com tinta, não vidro. Só os botões do modo foco têm transparência (o dock do Leitor é sólido).
- **Folha e cartões:** uma folha de cal por tela (a do que fazer agora), com a sombra fresca (`--sombra-folha`); cartão comum em cal, raio 16, borda de tinta a 12% e sombra mais baixa, só onde agrupa; o resto são linhas sobre a areia. Raios: 16 (folha e cartão), 12 (botão e campo), pílula (aba, chip, navegação); o de dentro é menor que o de fora.
- **A caneta:** a caneta-cacto de vidro é o único objeto com volume e o único gradiente; uma por tela, decorativa (`aria-hidden`), em três poses fixas: encostada na folha do Agora (Hoje; no Fixar, no Cartão atual), deitada ao fim de "Lido até aqui" (Leitor) e largada no canto do quadro do cacto (Resumo do Dia). Muda de lugar por salto; só no quadro do cacto ela anda, sobre o traço que desenha, e volta a ser largada. Nunca gira, nem vira botão, painel ou fundo de texto. Entra na P3 (`Caneta`).
- **Casca e plataformas:** celular < 700, tablet em pé 700 a 899, desktop e tablet deitado ≥ 900. Cabeçalho preso, na areia: "Arretado" em Gabarito com o cacto em vidro, Ajuda e Conta; a partir de 900 px, as áreas no centro e "Registrar erro" com a tecla E. Abas Hoje · Trilha · Fixar · Biblioteca sobre a areia, a atual em cal: embaixo até 899 px (ícone e rótulo, `safe-area`; somem com o teclado aberto), no cabeçalho a partir de 900. O "+" redondo em cal fica na linha do título do Hoje e do Fixar (`TituloComMais`); não há "+" flutuante. A rolagem reserva a altura das abas (`--abas-altura`): abas e dock nunca cobrem o texto do fim da página. Os nomes das áreas vêm só de `ROTULO_DA_AREA` (`src/apresentacao/textos.ts`).
- **Letras:** títulos e marca em Gabarito (hospedada em `src/apresentacao/fontes/`, nunca CDN), nunca em texto corrido nem em rótulo pequeno; interface em Atkinson Hyperlegible Next; a lei em Literata (18 px ajustável, até 70 ch, sem itálico). Texto mínimo de 13 px. Ícones são SVG de um só traço, nunca glifos Unicode (✓, ⓘ, ☆). O texto quebra qualquer palavra longa e nenhuma tela rola na horizontal.
- Amarelo, verde e rosa de grifo pertencem ao conteúdo marcado no leitor, não ao CTA nem à interface. Os destaques de termo (prazos, condições, absolutos, penas) são sublinhados de estilos diferentes, não fundos.
- Reutilize tokens de `src/apresentacao/estilos.css`; não crie uma segunda marca dentro do app. Todo par de cor novo é medido em `scripts/contraste.mjs` nos dois temas antes de usar.
- Tema escuro é o mesmo mundo à noite, não uma inversão ornamental.
- Estado não depende apenas de cor; ações importantes mantêm rótulo.
- Alvo de toque mínimo: 44 px (link no meio de frase é a única exceção; campos em 48). Preserve contraste AA (texto 4,5:1, gráficos 3:1, inclusive o anel de foco dentro da folha) e foco visível.

## Linguagem

- Português do Brasil, concreto, curto, sem jargão de startup.
- Fale de comportamentos observáveis: dificuldade de começar, perda do fio, dúvida sobre o próximo passo.
- Nunca pergunte, armazene ou use diagnóstico clínico; não faça promessa de tratamento.
- Use o vocabulário obrigatório do projeto.
- Não invente preço, depoimento, estatística, garantia, integração, roadmap ou funcionalidade.
- Diferencie claramente o que existe, o que é protótipo e o que é futuro.

## Movimento

- Movimento explica continuidade, foco ou relação espacial; não serve para decorar.
- Prefira transições discretas de 160 a 220 ms no aplicativo, com `cubic-bezier(.2, .7, .2, 1)`. Um ponto do Dia acende uma vez em 160 ms; o quadro do cacto se desenha uma vez, ao fechar o Dia (a caneta anda sobre o traço); o traço de seleção e a passagem do cartão são curtos e sutis; a caneta muda de lugar por salto.
- Proibido: brilho pulsando, lens flare, parallax, superfície iridescente, vidro desfocado atrás de texto, luz que acompanha o dedo ou a rolagem, ciclo de dia e noite, confete, som.
- Landing pages podem usar narrativa por rolagem, mas cada efeito deve responder “o que isso explica?”.
- Evite animações simultâneas, loops constantes, scroll hijacking, parallax agressiva e texto indispensável revelado só por animação.
- Implemente `prefers-reduced-motion` (os pontos aparecem acesos e o quadro do cacto pronto, o traço de seleção não é desenhado e o cartão troca na hora) e o perfil Calmo (o traço e o cartão só esmaecem; `movimentoAgora()`, em `src/apresentacao/movimento.ts`); a experiência reduzida deve manter ordem, conteúdo e ação. Quanto mais frequente, mais curto e mais sutil.
- Leitura, formulários e revisão devem funcionar sem a camada de movimento.

## Personagem

- Não há personagem (D-D8, 19/10/2026): o cachorro do Resumo do Dia saiu a pedido do Gabriel e o mascote antigo saiu na P2. No lugar, a caneta desenha o quadro do cacto, uma parte por Dia fechado, só no Resumo do Dia, nunca no Leitor nem na Revisão. Não traga o cachorro nem o mascote de volta.
- É opcional e coadjuvante: confirma conclusão e ajuda na retomada.
- Não é professor, terapeuta, chatbot, autoridade jurídica nem representação de “IA”.
- Não substitui rótulos, mensagens de erro ou navegação.
- Não aparece em toda tela nem durante leitura profunda.
- Não culpa, comemora streak, faz cara triste por ausência ou pressiona o usuário. Os pontos do Dia contam as tarefas do dia, nunca uma sequência de dias.
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
- Movimento normal, Calmo e reduzido.
- Testes existentes verdes e novos testes proporcionais ao risco.
- Capturas com `node scripts/capturas-ui.mjs --medir` (sem rolagem horizontal, sem texto sob as abas no fim da página) e, no PR de fase, folhas antes e depois em `docs/redesign/ponto-de-luz/<fase>/`.
- Evidência visual e divergências registradas; não declare sucesso por inspeção do código apenas.
