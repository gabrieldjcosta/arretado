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

- **Direção (D-D9, “Tinta e noite”, 19/10/2026; troca a D-D7, Ponto de luz):** dois mundos que o tema escolhe. O dia é “Tinta e marca-texto”: tinta azul-noite sobre papel quase branco, folha branca de cantos pouco arredondados com uma linha fina em volta e, no botão principal, uma sombra baixa e dura de carimbo. A noite é “Noite de mandacaru”: azul fundo, formas arredondadas, nenhuma sombra e o ponto em âmbar. A caneta de vidro marca onde a pessoa parou. Valores: `src/apresentacao/estilos.css`. Sistema: `DESIGN.md` (raiz) e `docs/design/sistema-visual.md`. Decisão: `docs/design/decisoes-design.md` (D-D9). Contrato: `docs/design/referencias/2026-10-19-tinta-e-noite/contrato.md`. Fases: `docs/planos/tinta-e-noite.md`. A D-D7 (Ponto de luz) fica como histórico; a D-D8 (o quadro do cacto e a caneta que desenha) segue, só com as cores novas.
- **Paleta:** dia: Papel `#f6f8fb` (o chão, liso, sem textura), Folha `#ffffff`, Tinta `#0f1c3a` (texto, ação e “onde estou”), Tinta 2 `#4a5878` (atenuado), Linha `#838fa7` (a linha de 1 px da folha), Lima `#eefa4b` (o marca-texto, só halo). Noite: Noite `#0b1322` (o chão), Serra `#131d31` (a folha), Texto `#eef2fa`, Luz `#f2f6ff` (a ação), Âmbar `#ffc53d` (o ponto), Borda `#34425e`. Em código, os tokens de papel (`--fundo`, `--superficie`, `--texto`, `--luz`, `--acao`, `--selecionado-*`, `--borda-folha`), não o hex; a paleta crua da noite leva o prefixo `--n-`, e os três blocos de token de `estilos.css` (`:root`, a noite do aparelho e o escuro manual) ficam iguais. Os nomes das identidades anteriores (areia, cal, vidro, caramelo, `--caneta-*`, `--atual-*`, e os da D-D5 e da D-D4) saíram do código (`TOKENS_REMOVIDOS` em `scripts/contraste.test.ts`).
- **Cor tem papel:** a luz do mundo (`--luz`: tinta de dia, luz à noite) é a ação (o botão primário, **um por tela**), o foco, o link, o “onde estou” (a aba atual) e o marcado (caixa, rádio, botão ligado: luz cheia com a marca invertida); o ponto de luz só reporta estado (pontos do Dia, Estrela, ponta da caneta), nunca é texto, sempre leva o contorno na luz do mundo, nunca pulsa nem segue o dedo; a lima é só halo e marca-texto, atrás do ponto, na ponta da caneta e na marca de hoje do quadro do cacto, nunca fundo nem cor de texto (1,07:1 no papel); vermelho = só excluir e falha técnica, nunca no estudo. **A matéria vai pelo nome, em neutro: sem cor por disciplina nem faixa colorida na borda de cartão, item ou aviso.**
- **Botões:** primário na luz do mundo cheia (altura 44, Atkinson 600 de 15 px; de dia raio 6, sombra dura de 2 px e desce 1 px ao apertar; à noite raio 12, sem sombra e aperto em escala 0,975; largura total e 52 px só na folha do Agora), secundário no fundo do controle com o contorno do mundo, fantasma (`.botao-texto`, sublinhado, ao lado do primário), linha de ação (`.linha-acao`) e perigoso (contorno vermelho; cheio só no diálogo de confirmação). Transição só de transformação e sombra, nunca de cor. O “+” do título é redondo, no fundo do controle, e não é a ação da tela. Só os botões do modo foco têm transparência (o dock do Leitor é sólido).
- **Folha e cartões:** uma folha por tela (a do que fazer agora), separada do chão pela linha de 1 px do mundo (`--borda-folha`) e não por sombra, porque folha e chão quase não se separam pela cor (1,06:1 de dia, 1,10:1 à noite); o cartão comum é igual, só onde agrupa; o resto são linhas sobre o chão. Raios por mundo (dia: 6 botão e campo, 8 folha, 6 chip; noite: 12, 14 e 10), sempre pelos papéis `--raio-*`: o de dentro é menor que o de fora, e não há pílula de 999 px (a guarda de `scripts/contraste.test.ts` recusa `border-radius` de três dígitos). A única sombra do app é a dura do botão primário de dia; nenhuma sombra leva desfoque.
- **A caneta:** a caneta de vidro (a ponta também é de vidro, com o furo de tinta à vista) é o único objeto com volume e o único gradiente; as cores são os 13 `--pen-*` de cada mundo. Uma por tela, decorativa (`aria-hidden`), em três poses fixas: encostada a 35° na folha do Agora (Hoje; no Fixar, no Cartão atual), deitada a 65° ao fim de “Lido até aqui” (Leitor) e largada no canto do quadro do cacto (Resumo do Dia). Muda de lugar por salto; só no quadro do cacto ela anda, sobre o traço que desenha, e volta a ser largada. Nunca gira, nem vira botão, painel ou fundo de texto (`Caneta`).
- **Casca e plataformas:** celular < 700, tablet em pé 700 a 899, desktop e tablet deitado ≥ 900. Cabeçalho preso, no chão, com o nome “arretado” escrito num traço só e o cacto ao lado (o lockup), Ajuda e Conta; a partir de 900 px, as áreas no centro e “Registrar erro” com a tecla E. Abas Hoje · Trilha · Fixar · Biblioteca no chão, a atual em negrito com o traço de caneta embaixo: embaixo até 899 px (ícone e rótulo, `safe-area`; somem com o teclado aberto), no cabeçalho a partir de 900. O “+” redondo fica na linha do título do Hoje e do Fixar (`TituloComMais`); não há “+” flutuante. A rolagem reserva a altura das abas (`--abas-altura`): abas e dock nunca cobrem o texto do fim da página. Os nomes das áreas vêm só de `ROTULO_DA_AREA` (`src/apresentacao/textos.ts`).
- **Letras:** os títulos usam a Schibsted Grotesk (800) de dia e a Familjen Grotesk (700) à noite, hospedadas em `src/apresentacao/fontes/` (nunca CDN; o `index.html` pré-carrega só a do tema do aparelho); só em título, na folha e, de dia, no rótulo “Em seguida” (à noite ele é da interface), nunca em texto corrido nem em rótulo pequeno. Interface em Atkinson Hyperlegible Next (400, 500 e 700); a lei em Literata (18 px ajustável, até 70 ch, sem itálico). Texto mínimo de 13 px. Ícones são SVG de um só traço, nunca glifos Unicode (✓, ⓘ, ☆). O texto quebra qualquer palavra longa e nenhuma tela rola na horizontal.
- Amarelo, verde e rosa de grifo pertencem ao conteúdo marcado no leitor, não ao CTA nem à interface. Os destaques de termo (prazos, condições, absolutos, penas) são sublinhados de estilos diferentes, não fundos.
- Reutilize tokens de `src/apresentacao/estilos.css`; não crie uma segunda marca dentro do app. Todo par de cor novo é medido em `scripts/contraste.mjs` nos dois temas antes de usar.
- O tema escolhe o mundo (claro = dia, escuro = noite): a noite tem forma própria, não é uma inversão ornamental. Todo token de cor ou de forma existe nos três blocos de tema.
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
- Prefira transições discretas de 160 a 220 ms no aplicativo, com `cubic-bezier(.2, .7, .2, 1)`. Um ponto do Dia acende uma vez em 160 ms; o quadro do cacto se desenha uma vez, ao fechar o Dia (a caneta anda sobre o traço); o traço de seleção e a passagem do cartão são curtos e sutis; a caneta muda de lugar por salto. O nome “arretado” se escreve na abertura; quanto e quando é uma constante só (`src/apresentacao/componentes/escrita/frequencia.ts`; a escolha é do Gabriel e segue aberta), e um toque ou uma tecla pula.
- Proibido: brilho pulsando, lens flare, parallax, superfície iridescente, vidro desfocado atrás de texto, luz que acompanha o dedo ou a rolagem, ciclo de dia e noite, confete, som.
- Landing pages podem usar narrativa por rolagem, mas cada efeito deve responder “o que isso explica?”.
- Evite animações simultâneas, loops constantes, scroll hijacking, parallax agressiva e texto indispensável revelado só por animação.
- Implemente `prefers-reduced-motion` (os pontos aparecem acesos e o quadro do cacto pronto, o traço de seleção não é desenhado, o cartão troca na hora e o nome fica no quadro final) e o perfil Calmo (o traço, o cartão e o nome só esmaecem; `movimentoAgora()`, em `src/apresentacao/movimento.ts`); a experiência reduzida deve manter ordem, conteúdo e ação. Quanto mais frequente, mais curto e mais sutil.
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
- Os dois mundos (tema claro e escuro), com teclado, foco visível, semântica e axe nos dois temas quando aplicável.
- Zoom 200% e tamanho de fonte ampliado.
- Movimento normal, Calmo e reduzido.
- Testes existentes verdes e novos testes proporcionais ao risco.
- Capturas com `node scripts/capturas-ui.mjs --medir` (sem rolagem horizontal, sem texto sob as abas no fim da página) e, no PR de fase, folhas antes e depois em `docs/redesign/tinta-e-noite/<fase>/`.
- Evidência visual e divergências registradas; não declare sucesso por inspeção do código apenas.
