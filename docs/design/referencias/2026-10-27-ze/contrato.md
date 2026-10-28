> **Cópia do contrato da Marca (v8, 28/10/2026; snapshot `66f1a3b` dos arquivos do projeto), levada ao repositório na M1 do Zé.** O texto depois da linha é o da Marca, sem edição; esta nota diz só o que a construção resolveu ou mudou.
>
> - **Decisão.** O registro é a D-D10 ([`../../decisoes-design.md`](../../decisoes-design.md)), aprovada pelo Gabriel em 28/10/2026 (16:38Z, "Construir"). O Apêndice A traz a D-D10 proposta; vale a do `decisoes-design.md`, que corrige "acrescenta o néon suave à D-D7" para a D-D8 (onde mora "A caneta que desenha"). O brief é [`../../brief-avatar.md`](../../brief-avatar.md).
> - **Fora do repositório.** O mockup (https://claude.ai/artifact/FzdekXeQSJAL2NTSVpS1XW, arquivo `ze-mockup.html`), a fonte reproduzível (`fonte/`, com `ze.js` e `ze.css`), a primeira rodada (`arquivo/fiapo/`) e as imagens de referência do Gabriel (`referencias/`) ficam nos arquivos do projeto: o repositório é público e as imagens são de terceiros. Onde o texto diz `fonte/…`, é lá.
> - **Olhos.** A linha `ZP` do §8 diz `ew:11, eh:27, ed:19`, mas o texto "Olhos" do mesmo §8, o Apêndice C e o código do mockup usam 12,5 × 24 a 18 do eixo. O componente usa 12,5, 24 e 18 (`PARAMETROS_DO_ZE` em `src/apresentacao/componentes/ze/geometria.ts`).
> - **Halo dos olhos.** No mockup a região do filtro do halo é proporcional à caixa do traço do olho: à noite ela corta o desfoque do olho em arco numa faixa reta (humores contente e piscadela) e, na cápsula (caixa de largura zero), desliga o filtro, então o olho de pé aparece sem halo. O componente usa uma região fixa em volta do olho e mantém a cápsula nítida: o halo cresce com o quanto o olho é arco (`opacidadeDoHalo`, `geometria.ts`).
> - **Construção.** A M1 (componente, tokens, pares de contraste, docs) é um PR próprio; as telas vêm na M2, na M3, no N1 e na M4 (Apêndice D). O que o §8b e o Apêndice E pedem de cada traço fica no PR dele.

---

# Contrato do Zé, o mascote de néon suave do Arretado

Marca · 27/10/2026, revisado em 28/10 com os retornos das 23:41Z, das 12:54Z, das 14:54Z e das 14:59Z às 15:22Z · **proposta, segunda rodada**: nada disto está no código ainda. A primeira rodada (o Fiapo) está em `arquivo/fiapo/`; o Zé com sorriso, olhos inclinados e néon de lima e âmbar ficou no histórico do git desta pasta (`snapshot: mascote Zé…`).
Mockup interativo: https://claude.ai/artifact/FzdekXeQSJAL2NTSVpS1XW (arquivo: [ze-mockup.html](/mnt/project-files/mascote/marca/ze-mockup.html); fonte legível e reproduzível em `fonte/`, com `node montar-ze.mjs`).
Referências do Gabriel: `referencias/letreiro-neon-cacto.jpg` (o letreiro de um tubo só), `referencias/grok-olhos.jpg` (as cápsulas) e `referencias/rosto-avatar.jpg` (o rosto de 27/10, 23:41Z: dois olhos de cápsula retos, bochechas rosa e nenhuma boca).
Etiquetas: **[Fato]** do repositório, **[Gabriel]** decisão ou palavra dele, **[Marca]** hipótese de design.

## Tese

**Tese visual.** O cacto da marca, expandido e chibi, desenhado como um tubo de néon de uma linha só: tronco, dois braços em gancho (o esquerdo mais alto, como na marca), pés abertos e, no braço direito, uma flor que é o ponto de luz. A linha é branca, com brilho azul piscina, de dia e de noite. O rosto não tem boca: dois olhos de cápsula retos (a ideia do mascote do Grok, sem a inclinação) e duas bochechas rosa; a expressão vem de piscadelas e do formato dos olhos.

**Tese de interação.** O brilho só existe onde a caneta passa: acende ao ser traçado, assenta em 0,6 s e nunca pulsa. A luz que escreve o nome desenha o Zé uma vez. Nas Boas-vindas ele dá vida à espera: pisca os dois olhos em rajadas curtas e, se a pessoa demora, a luz amarela da mão dele pisca (3 rodadas, no máximo). No passeio ele fica parado e só muda de expressão quando a pessoa toca: cada passo é um toque, e nada mais anda sozinho.

**Allowed patterns:** contorno de um traço só, de pontas redondas, na espessura do cacto da marca; néon suave só em traço que a caneta desenha (acende ao traçar, assenta em 0,6 s); olhos de cápsula retos, bochechas rosa e humores pelo formato dos olhos (neutro, atento, contente em arco, piscadela); uma viagem da luz em arco por abertura; desenho de traço (`stroke-dashoffset`); uma piscadela na chegada; nas Boas-vindas, rajadas de 2 ou 3 piscadas dos dois olhos e a luz amarela da mão piscando 3 vezes se a pessoa demora (no máximo 3 rodadas); transições de 160 a 220 ms com `cubic-bezier(.2,.7,.2,1)`; Calmo só esmaece; Reduzido mostra tudo pronto e parado. **Proibido:** brilho que pulsa sem parar ou cresce; néon permanente em botão, texto, cartão ou ícone parado; luz que segue ponteiro, dedo ou rolagem; boca, balão de fala, voz, cara triste, confete, sequência de dias; o Zé fora da Chegada e da Ajuda.

## 1. Resumo e o que mudou

[Gabriel, 27/10, 15:34Z] Um mascote sutil e fofo, feito da linha de luz, na chegada e no pedido de ajuda: abertura "arretado" com a caneta virando cacto, boas-vindas com a luz se apresentando, cartões que ensinam cada menu e uma última página no estilo Google com uso gratuito/teste.

Cinco cartões respondidos (17:29 a 17:30Z). Quatro seguem a recomendação; o 3 foi escolha dele:

| # | Pergunta | Resposta [Gabriel] |
|---|---|---|
| 1 | Onde o mascote aparece | Só Chegada e Ajuda |
| 2 | Rosto | Dois pontos de luz e sorriso (**substituído** pelos retornos abaixo: olhos de cápsula retos, sem sorriso) |
| 3 | Quando o nome se escreve em tela cheia | **Toda primeira do Dia** (a recomendação era só a primeira vez) |
| 4 | Como apresenta os menus | Quatro passos, um por toque |
| 5 | Última página | Começar ou Entrar, sem preço (em 28/10 virou "Vamo começar?", com o Google e "Experimentar sem conta") |

**Retorno do Gabriel sobre a primeira rodada** (21:51Z e 21:59Z, com duas imagens):
- "Ele parece um fantasma e não passa a vibe cacto tecnológico que eu queria." O nome pode ser **"Zé"**.
- Referência: um letreiro de néon de cacto, de um tubo contínuo. "Os olhos podem ser inspirados no mascote de Grok."
- "O efeito néon suave que tem na imagem de referência é o que eu pretendia pra o app como um todo. Seria legal acrescentá-lo às partes que já têm a animação do traço da caneta."

**Retorno do Gabriel sobre o Zé** (27/10, 23:41Z, com a imagem de um avatar: dois olhos de cápsula retos, bochechas rosa, nenhuma boca; `referencias/rosto-avatar.jpg`):
- "O efeito néon ficou ótimo, só precisa ter a linha branca com brilho azul mais escuro, na versão clara, e linha branca com brilho azul piscina, na escura (pra manter o esquema de cores da identidade visual)."
- "A expressão facial do Zé ainda precisa melhorar: tirar o sorriso e ajustar os olhos, deixando retos ao invés de inclinados, e com uma marca rosa sutil de bochechas avermelhadas. As expressões podem ser expressas por piscadelas e modificações nos formatos dos olhos."

**Retorno do Gabriel sobre a cor de dia** (28/10, 12:54Z; troca o "azul mais escuro" do retorno anterior):
- "O da noite ficou ótimo. No do dia (e nas animações que o acompanham), quero mudar a cor do brilho para azul piscina também, igual ao da noite."

**Retorno do Gabriel sobre o ponto** (28/10, 14:54Z, dois comentários no mockup; o primeiro sobre a flor da vitrine de dia):
- "O ponto deve ser igual no diurno e no noturno, amarelo cheio e com brilho amarelo."
- Sobre as Boas-vindas: "ficou ótimo!"

**Retornos do Gabriel de 28/10, das 14:59Z às 15:22Z** (dezessete comentários no mockup; a v7 e este contrato absorvem todos, menos o nome do Zé, que segue aberto):
- Boas-vindas, texto: "bora conhecer a ferramenta que vai facilitar de verdade seus estudos?" (no lugar de "Eu sou o Zé…").
- Boas-vindas, botões: "vamos substituir por um botão de 'vamos' e manter lá em cima o 'agora não'. na aba de conta\configurações vamos inserir a possibilidade de fazer o tour, caso a pessoa queira."
- Hoje: "Aqui você vê o que tem pra fazer, sem agonia pra decidir." no lugar de "A próxima ação do seu Dia."; uma versão sucinta do texto do botão + ("Ali no botão + você vai construindo seu caderno de erros. Fez questão e errou? Traga a frase ou alternativa certa, pra poder revisar e lembrar depois"); e o "acendem" "não ficou claro".
- Trilha: no lugar dos itens, "uma informação curta sobre a possibilidade de definir ciclos de estudo"; e, sobre o botão "Montar a trilha passo a passo", "retirar essa opção".
- Fixar: "humanizar e resumir. tipo 'gosta de cartões de revisão? aqui você pode montar os seus para se testar'." E, sobre o botão "Registrar um erro": "tirar a opção e acrescentar uma versão concisa de 'dica: depois do passeio, experimente fazer cinco questões e registrar o que precisa lembrar sobre elas'."
- Biblioteca: a frase, "mudar para 'onde ficam as normas pra ler e os seus resumos'"; os itens, "exaltar os elementos positivos, tipo 'termos-chave de cada lei já destacados pra você'; 'modo foco para ver só o artigo que está lendo'; 'o mapa da norma mostra o que mais cai, e te guia pela leitura'"; e, sobre o botão "Ler uma norma", "retirar."
- Começar: "Vamo começar? E aí, embaixo, já aparecer o simbolo do google, pra a pessoa se registrar com ele, ou uma opção abaixo 'experimentar sem conta e salvar seus dados manualmente'."
- A tabela de textos (§7): "adotar os textos e orientações conforme comentários lá em cima."
- O Zé: "retire essa linha" (a linha do chão); "depois da primeira piscadela, faça ele piscar os dois olhos algumas vezes a cada intervalo, pra dar mais vitalidade. se o usuário demorar pra escolher, pisque a luz amarela na mão dele".
- O nome: "vamos fazer um brainstorming de nomes. estou temeroso de que 'zé' fique muito estereotípico. pensei em 'Caru', de 'Mandacaru'. mas talvez ele nem precise de nome." (aberto: §13, item 7).

| | Fiapo (1ª rodada) | Zé (esta) |
|---|---|---|
| Silhueta | contorno fechado, corpo redondo | um tubo aberto, de pé a pé: tronco de topo redondo, braços em gancho, flor no braço direito |
| Rosto | dois pontos de luz | cápsulas retas, bochechas rosa, sem boca; expressão pelo formato dos olhos e por piscadelas |
| Luz | halo parado | néon suave que acende ao traçar e assenta |
| Cor | sem néon | linha branca com brilho azul piscina e ponto amarelo cheio com brilho amarelo, tudo igual nos dois mundos |
| Alcance da luz | só o mascote | os cinco traços de caneta do app (§8b e Apêndice E) |

[Marca] O que lia como fantasma era o contorno fechado e redondo, sem braços saindo do corpo, e os olhos redondos. O Zé abre o contorno (os pés ficam livres), põe braços de tubo e uma flor, e dá olhos de cápsula.

[Marca] Sem a boca e com bochechas, o juiz cego voltou a dar fantasma 3 de 5 (cacto 4): é o rosto que puxa para "fantasminha fofo", não o corpo; a silhueta com braços e a flor seguram o cacto (Apêndice C). Se o Gabriel sentir isso, o próximo ajuste são duas costelas finas no tronco, não o rosto.

## 2. Resultado da pessoa

Chega sem medo, sabe onde fica cada menu depois de quatro toques e decide começar ou entrar sem ler preço nem termo. Quem pede ajuda reencontra o passeio e o guia da tela sem refazer a Chegada.

## 3. Público por comportamento

Quem tem dificuldade de concentração e "não sabe por onde começar", abrindo o app pela primeira vez neste Aparelho ou voltando e pedindo ajuda. Nenhuma tela pergunta nem guarda diagnóstico, e nenhuma promete tratamento.

## 4. Antes e depois

- **Antes** [Fato, #320 na `integracao`]: a Chegada é uma folha só, com as listas "Os quatro menus" e "Dentro de uma Norma" e os atalhos.
- **Depois**: telas curtas dentro da mesma Chegada, um passo por toque, com o mesmo texto; a Chegada continua sendo o `<dialog>` do app. Os três traços de caneta que já existem (nome, seleção, quadro do cacto) ganham o néon suave.

## 5. Mensagem e botão

Mensagem [Gabriel, 28/10]: "Bora conhecer a ferramenta que vai facilitar de verdade seus estudos?" Ela substitui "Eu sou o Zé. Vou mostrar onde fica cada coisa, um passo por vez." e a tela deixa de dizer o nome do Zé.
Um só botão, **"Vamos"**, que começa o passeio; "Agora não" fica no alto da tela e leva ao Hoje [Gabriel, 28/10]. "Escolher meu concurso" e "Passear pelos menus" saem desta tela: o primeiro passa a ser o estado vazio do Hoje [Fato, `src/dominios/hoje/proxima-acao.ts:13`], e o Começar já não o oferece. "Vamos" leva `aria-describedby` para a frase, e o leitor de tela ouve a pergunta junto com o botão. Ver §13, item 3.

## 6. Fluxo

| Etapa | Primeira vez no Aparelho | Primeira abertura de cada Dia seguinte | Outras aberturas do Dia |
|---|---|---|---|
| Tela cheia | Nome completo (2,64 s), a luz voa ao Zé (0,5 s) | Nome em modo curto (1,2 s), a luz voa ao ponto da marca do cabeçalho (0,45 s) | Nenhuma |
| Depois | Boas-vindas com o Zé se desenhando (1,2 s), o rosto (0,6 s) e uma piscadela (até 1,4 s) | Hoje (se o #331 entrar, a Entrada do Dia vira linha quieta) | Hoje |
| Total até o texto | cerca de 4 s | cerca de 1,8 s | 0 s |
| Pular | toque, tecla ou "Pular": tudo pronto na hora | toque ou tecla (sem botão) | n/a |

Passeio: Boas-vindas ("Vamos") → Hoje → Trilha → Fixar → Biblioteca → Começar. Cada menu é um passo, sem atalho para outra tela [Gabriel, 28/10]; "Pular o passeio" leva ao Começar. Os passos não se chamam Cartões: Cartão é o item da Revisão no vocabulário do app.

**Começar** [Gabriel, 28/10]: o título "Vamo começar?"; embaixo, o botão do **Google** (a marca oficial de quatro cores, no botão claro de dia e escuro à noite, como pedem as diretrizes do Google) com a nota "Em fase de teste: por enquanto só e-mails convidados entram."; e a saída "Experimentar sem conta e salvar seus dados manualmente", que leva ao Hoje. O botão do Google abre a tela Entrar, onde o aceite vem antes do login, como hoje (§13, item 12). O "Agora não" do alto saiu, porque a saída de baixo faz o mesmo; Esc segue fechando.

**Quem já tem o app refaz o passeio quando quiser** [Gabriel, 28/10: "na aba de conta\configurações vamos inserir a possibilidade de fazer o tour"]. Há duas portas: a linha nova **"Passeio pelos menus"** na Conta (abre os quatro passos direto, sem as Boas-vindas; "Voltar" no passo 1 devolve ao app) e Ajuda › "Rever as boas-vindas" (abre as Boas-vindas, que levam ao passeio com "Vamos"). Nos dois casos é uma **revisão**: o último passo diz "Concluir" e volta ao app, "Pular o passeio" e Esc também voltam ao app, a tela Começar não aparece e nada se grava.

## 7. Conteúdo comprovado (textos)

Nada de preço, "grátis", depoimento ou estatística: não existem. A frase de uso é a da tela Entrar ("só e-mails convidados"). **Uma fonte só:** os textos do Passeio vivem num módulo só (`passos.ts`), com o texto do Gabriel de 28/10; as duas listas da Chegada (#320) saem, porque os passos as substituem, e o guia da tela (`guia/conteudo.ts`, #313) segue como está, com uma troca: o "acendem" da linha Leitura · Cartões · Frases (`conteudo.ts:27`) vira "ficam marcados como feitos". Um teste falha se o componente repetir uma frase literal.

| Tela | Texto | Origem [Fato] |
|---|---|---|
| Boas-vindas | "Boas-vindas ao Arretado!" · "Bora conhecer a ferramenta que vai facilitar de verdade seus estudos?" · Vamos · Agora não | Título e "Agora não" já existem (#320). A frase e "Vamos" são novos [Gabriel, 28/10]; "Escolher meu concurso" sai desta tela. |
| Hoje | "Aqui você vê o que tem pra fazer, sem agonia pra decidir." · No botão + você monta seu caderno de erros. Errou? Traga a Frase correta pra revisar e lembrar depois. · Leitura, Cartões e Frases ficam marcados como feitos quando você lê, revisa ou fixa. | Textos do Gabriel (28/10), no lugar da frase da Chegada e das linhas do guia do Hoje (#313). "Ficam marcados como feitos" troca o "acendem" do guia, que ele achou confuso (a primeira troca, "se completam", ainda era vaga). |
| Trilha | "O edital em Pontos, montado pelo catálogo ou trazido por você." · Você também pode definir ciclos de estudo aqui na Trilha. | Frase da Chegada; o item é do Gabriel (28/10) e fala dos ciclos, que existem (`plano/ciclo/`). Sem atalho: o "Montar a trilha passo a passo" saiu a pedido dele. |
| Fixar | "Suas Frases e Cartões, com a Revisão de cada dia." · Gosta de cartões de revisão? Aqui você pode montar os seus para se testar. · Dica: depois do passeio, faça cinco questões e registre o que precisa lembrar. | Frase da Chegada; os dois itens são do Gabriel (28/10): o primeiro troca as duas linhas do guia do Fixar (`guia/conteudo.ts:66`), o segundo é a dica, em versão concisa da frase dele. Sem atalho. |
| Biblioteca | "Onde ficam as normas pra ler e os seus resumos." · Termos-chave de cada lei já destacados pra você. · Modo foco para ver só o artigo que está lendo. · O Mapa da norma mostra o que mais cai e te guia pela leitura. | Frase e itens do Gabriel (28/10), no lugar da frase da Chegada e das linhas "Dentro de uma Norma". Sem atalho. O guia real diz que o Mapa da norma vale "nas normas do acervo com dados"; esta frase não diz (§13, item 11). |
| Começar | "Vamo começar?" · Entrar com o Google · "Em fase de teste: por enquanto só e-mails convidados entram." · Experimentar sem conta e salvar seus dados manualmente | "Vamo começar?" e as duas saídas são do Gabriel (28/10). "Entrar com o Google" é o texto da tela Entrar (`Entrar.tsx`), que este botão abre; a nota do convite vem dessa tela. |
| Conta | Aparência · Perfis de estudo · Dados · Privacidade e segurança · Orientações · **Passeio pelos menus** · "Os quatro menus, um por vez, quando você quiser." · Fazer o passeio · (no último passo do passeio refeito) Concluir | Os cinco primeiros são `ITENS_CONTA` (`conta/Conta.tsx`); "Passeio pelos menus" é a linha nova [Gabriel, 28/10], depois de "Orientações". |
| Ajuda | Ajuda sobre esta tela · O que cada opção faz · Rever as boas-vindas · Relatar problema | Os quatro itens já existem em `MenuAjuda.tsx`. Muda só o que "Rever as boas-vindas" abre. |

**Dois textos vão mudar sob os pés do Passeio** (por isso a fonte única):
- **#332** faz o Cartão nascer marcado ao salvar um erro, mas a linha do Fixar (`guia/conteudo.ts:66`) segue dizendo "o Cartão só nasce se você quiser". A linha do guia real precisa mudar junto com o #332 (já avisei o dono, na revisão dele); o Passeio já não repete essa frase, desde o texto novo do Gabriel.
- **#330** reduz a Biblioteca a três abas (Normas · Súmulas e teses · Meus textos). A frase "Normas, Súmulas, Teses, Resumos e Precedentes" continua verdadeira como lista de conteúdo, mas a Chegada e o Passeio devem seguir os nomes das abas quando o #330 entrar.

Sem "Você parou em" nem nenhuma frase que soe como dívida: "Continuar" e "Retomar".

## 8. Direção visual e personagem

**O Zé** [Marca; nome do Gabriel, 27/10]:
- **Um traço aberto, de pé a pé.** Parte do pé esquerdo, sobe pelo braço esquerdo (o mais alto, como na marca), passa pelo topo do tronco, desce pelo braço direito e acaba no pé direito. A linha nunca se fecha. 19 segmentos, cerca de 810 unidades, `viewBox="22 10 196 240"`. Cada braço é um tubo (duas retas e uma ponta redonda) e a ponta e os cantos são redondos, como o cacto do nome.
- **Sem linha do chão** [Gabriel, 28/10: "retire essa linha"]. A primeira rodada tinha um traço fino sob os pés; saiu de todos os tamanhos e telas. O `viewBox` não mudou, e sobra um respiro de 20 unidades sob os pés.
- Geometria **paramétrica**: `ZP = { cx:120, a:36, yT:26, yB:230, bL:16, gL:14, yLt:84, ySL:150, bR:14, gR:14, yRt:112, ySR:176, ew:11, eh:27, ed:19 }` e a função `contornoZe(ZP)` em `fonte/src/ze.js`. Tubo esquerdo de 32, direito de 28, vão de 14 até o tronco, tronco de 72 de eixo a eixo e 204 de altura. O componente real porta a função, não um `d` colado.
- **Espessura:** 6 no traço e 17 na faixa. O traço e a faixa engrossam nos pequenos para manter 1,5 a 2 px na tela: 8 e 21 a 72 e 48 px; 10 e 25 a 32 e 24 px, e de dia a faixa afunda de `#39caef` para `#0e93b4` a 32 e 24 px (ver Cores). "Atento" e "contente" só a partir de 72 px; abaixo disso, neutro. As bochechas somem a 32 e 24 px.
- **Olhos** [Gabriel, 27/10 23:41Z: retos, sem inclinação, como no avatar da referência; a cápsula veio da ideia do mascote do Grok]: cada olho é um traço de ponta redonda (não um retângulo): cápsula reta de 12,5 por 24, a 18 do eixo, de pé (rotação 0). A referência é mais cheia (cerca de 1,65 de altura por largura); o Zé fica em 1,9 para não perder a cápsula do Grok. **Não há boca.** **Humores pelo formato dos olhos** (`HUMORES` em `fonte/src/ze.js`; `a` é quanto cada olho é arco e `b` a força das bochechas): neutro (cápsulas); atento (olhos 4% mais largos e 12% mais altos, sobem 2, bochechas mais fracas); contente (os dois olhos viram arcos "^" de 7 de espessura, bochechas no máximo); **piscadela** (o olho direito vira arco por 0,56 s e volta; só com a cápsula aberta). O piscar é o olho a 12% da altura por 0,16 s; o olho feliz não pisca. **Nunca triste**, e nunca olho fechado parado (só no piscar, na piscadela e no olho feliz). O olhar desvia 3 unidades de lado quando o passo muda, uma vez. De dia o olho não tem halo; à noite leva um halo piscina 8 maior, desfocado.
- **Bochechas** [Gabriel: "uma marca rosa sutil de bochechas avermelhadas"]: duas manchas ovais de 16 por 10, a 20,5 do eixo e 26 abaixo do centro dos olhos, desfocadas em σ 1,8, por baixo do traço. Cor `#ec5675` a 85% de dia e `#ff86a6` a 100% de noite, vezes a força do humor (neutro 0,65; atento 0,5; contente 1; piscadela 0,85). Somem a 32 e 24 px e em cores forçadas. São decoração: sem contraste exigido.
- **Flor:** o ponto de luz, na ponta do braço direito (haste de 10, ponto de 5,5, brilho de 10): ponto **amarelo cheio** `#ffc53d` com **brilho amarelo** `#ffc53d` (um disco desfocado em σ 4,5, a 0,6), **igual de dia e de noite** [Gabriel, 28/10 14:54Z]; só a haste muda (tinta de dia, branca à noite). É o único ponto quente do Zé. A luz que decola do nome na primeira abertura e desenha o Zé já é esse ponto (sem o disco de lima da marca), e a luz dos quadros parados do néon também; a luz da primeira do Dia, que só leva a marca ao cabeçalho, segue a marca. Tokens `--z-ponto` e `--z-ponto-brilho`: um valor só, declarado na raiz. **Custo, medido:** de dia o amarelo sobre o papel mede **1,5:1** (a flor de tinta no halo de lima media 14,8:1); a flor é decoração (`aria-hidden`, não carrega informação) e a haste de tinta marca o lugar. Se o ponto sumir numa tela clara, o ajuste é um contorno fino de tinta só de dia (deixa de ser igual) ou mais brilho nos dois mundos. **Fora do pedido, e como está:** o ponto do nome (de dia, tinta com halo de lima; à noite, âmbar) e os pontos de estado do app (pontos do Dia, Estrela, "onde parei") seguem a D-D9; a luz que sai do nome vira o ponto amarelo ao decolar.
- **Cores** [Gabriel, 27/10 23:41Z e 28/10 12:54Z]: **a linha é branca** (`#ffffff`) nos dois mundos, e o brilho é o **azul piscina** `#39caef` **nos dois mundos**: de dia ele era azul escuro (`#1744c0`) e o Gabriel pediu o piscina da noite também de dia, no Zé e nas animações que o acompanham. De dia a linha vai sobre uma **faixa piscina** `#39caef` (17 de largura, desfocada em σ 2,4), com o brilho do néon na mesma cor (σ 11; aceso 0,55 e repouso 0,16). À noite a faixa é desfocada em σ 4,5 a 0,55, com brilho aceso 0,6 e repouso 0,32. O miolo do tronco é um degradê do piscina (10%, 5% e zero) e existe para dar corpo ao tronco (Apêndice C). [Marca] O azul do vidro da noite que já está na identidade (`#9db7e8`) continua servindo de troca se o piscina sair do esquema. **Custo do piscina de dia, medido:** a linha branca sobre `#39caef` mede só **1,9:1** e a faixa sobre o papel, **1,8:1**, abaixo dos 3:1 que o contrato pede para linha. De 48 px para cima a silhueta se lê pelo tamanho e pelo brilho, e o Zé é decorativo; a **32 e 24 px** (os tamanhos do cabeçalho) ela ficava lavada, e por isso a faixa de dia **afunda para `#0e93b4`** (token `--z-banda-p`, o mesmo matiz de 192°, mais escuro: linha branca 3,6:1 sobre ela e faixa no papel 3,4:1). Se o Gabriel quiser a faixa funda em todos os tamanhos, é trocar o valor de `--z-banda` de dia; se quiser o piscina inteiro também a 32 e 24 px, é trocar `--z-banda-p`. Olho: tinta `#0f1c3a` de dia, branco de noite. **Contraste medido no mockup:** dia, olho no papel 15,8:1 e flor amarela no papel 1,5:1; noite, linha e olho brancos na noite 18,6:1, brilho piscina na noite 9,6:1 e flor amarela 11,8:1. O brilho é halo e o Zé é decorativo. O build leva os pares para `scripts/contraste.mjs`.
- **Tamanhos** (em `em` da tela): Boas-vindas e Começar `min(10,5em, 52%)`; passos `min(4,5em, 26%)`; cabeçalho do guia reaberto pela Ajuda 2,75 em, **opcional** (pode sair em PR depois). Em altura baixa (320×568 e 200% de fonte) o Zé do passo encolhe para `min(3,4em, 20%)` e espia por cima da folha (margem de −1,25 em, a folha por cima): nunca cobre texto.
- O Zé é `aria-hidden`; tudo o que ele "diz" é texto da tela. Não é professor, terapeuta, chatbot, autoridade jurídica nem "IA". Não culpa, não comemora sequência, não faz cara triste por ausência.

**Os dois mundos** [Fato, D-D9]: o dia "Tinta e marca-texto" é anguloso (botão raio 6, folha 8, sombra seca, Schibsted Grotesk 800); a noite "Noite de mandacaru" é arredondada (12 e 14, sem sombra, Familjen Grotesk 700). O mockup troca de mundo por tema, não por um filtro. Interface em Atkinson Hyperlegible Next.

## 8b. O néon suave (regra do sistema)

[Gabriel, 21:59Z] "Seria legal acrescentá-lo às partes que já têm a animação do traço da caneta." [Marca] Lido assim: **em todo traço que a caneta desenha**, e só neles. É regra do sistema (entra na D-D10), não efeito de tela.

1. **Acende ao ser traçado.** O brilho aparece junto com o traço, nunca antes; é uma cópia larga e desfocada do próprio traço, no azul piscina (o mesmo de dia e de noite).
2. **Assenta em 0,6 s** quando o traço fecha, com a curva do app. Repouso: de dia **zero** nos traços do app (o traço do nome e dos ícones fica limpo) e **0,16 no Zé** (fica a faixa piscina com um brilho leve); de noite **30%**, o letreiro aceso em repouso. Aceso: dia 0,55, noite 0,6.
3. **Nunca pulsa**, nunca cresce, nunca repete. Uma animação, uma vez.
4. **Uma cor só**: azul piscina `#39caef`, de dia e de noite (pedidos do Gabriel, 27/10 23:41Z e 28/10 12:54Z; antes, de dia, era azul escuro `#1744c0`). O ponto do Zé é amarelo cheio com brilho amarelo (`#ffc53d`), igual de dia e de noite (pedido de 28/10 14:54Z), e é o único ponto quente. O brilho nunca é verde, rosa nem arco-íris (a foto de referência é verde; a marca não é). **A linha:** no Zé é branca nos dois mundos (de dia, sobre a faixa piscina; senão sumiria no papel); nos outros quatro traços fica a linha do app, tinta de dia e luz à noite, e só o brilho é piscina. [Marca] Li "linha branca" como a linha do Zé; se o Gabriel quiser tudo branco, é trocar um token por traço.
5. **Só traço de caneta.** Botão, texto, cartão, borda, ícone parado e aba não brilham. O brilho não carrega informação: o estado continua dito pela forma e pelo texto.
6. **Calmo:** o traço não viaja; aparece o repouso, esmaecendo em 0,24 s. **Reduzido:** o repouso, parado. **Cores forçadas** (`forced-colors: active`): o néon, a faixa, o miolo e as bochechas somem; o traço e os olhos usam o texto do sistema (o `luz.css` do app já trata o ponto assim).
7. **Tokens** por mundo, em `estilos.css`: `--neon-cor`, `--neon-aceso`, `--neon-repouso`. Valores: dia `#39caef`, 0,55, 0; noite `#39caef`, 0,6, 0,30. O Zé usa também `--z-bloom-aceso` (0,55 | 0,6), `--z-bloom-repouso` (0,16 | 0,32), `--z-nucleo` (`#fff` nos dois), `--z-banda` (`#39caef` nos dois), `--z-banda-p` (a faixa a 32 e 24 px: `#0e93b4` de dia, `#39caef` de noite), `--z-miolo`, `--z-olho`, `--z-olho-halo`, `--z-haste`, `--z-bochecha` e `--z-bochecha-op`, mais o ponto, que **não é por mundo**: `--z-ponto` e `--z-ponto-brilho`, `#ffc53d` nos dois, declarados uma vez na raiz.
8. **Técnica única** nos cinco traços: um grupo gêmeo do traço, mais largo, com `<filter>` SVG de `feGaussianBlur` (σ 7 na escrita do nome, σ 11 no Zé, σ 1,1 no ícone, σ 2,4 no traço de seleção, σ 6 no quadro do cacto; no Zé de dia a faixa também é desfocada, σ 2,4, e as bochechas levam σ 1,8). Sem `box-shadow` nem `drop-shadow` de CSS.
9. **Custo** (medido, `fonte/custo.cjs`): a Abertura inteira (6,4 s), tela de 390 por 844 a 2×, CPU 4 vezes mais lenta: 59,6 a 60,1 quadros por segundo com e sem néon, de dia e de noite (medido de novo com o piscina de dia, 28/10); quadros acima de 33 ms, 0 a 1 em cerca de 385, com e sem néon (ruído da medida); tarefa da página sem diferença que se meça. Foi num Chromium **sem placa de vídeo**; falta um Aparelho de entrada de verdade. Reserva se pesar: três traços largos e translúcidos no lugar do desfoque, sem filtro.

## 9. Movimento e reduced motion

| Momento | Normal | Calmo | Reduzido |
|---|---|---|---|
| Nome, primeira vez | escreve em 2,64 s, o néon acende em cada letra e assenta ao fim | esmaece em 0,24 s (repouso) | não aparece: vai às Boas-vindas |
| Nome, primeira do Dia | modo curto, 1,2 s, entra em 0,16 s | esmaece em 0,24 s, fica 0,7 s | sem tela cheia |
| A luz leva a marca | pausa de 0,3 s, arco de 0,45 a 0,5 s | sem voo | sem voo |
| Contorno do Zé | desenha de pé a pé em 1,2 s, com o néon aceso; o texto sobe na metade | o Zé inteiro esmaece em 0,24 s | inteiro e parado |
| Flor e miolo | a luz salta do pé direito à flor (0,24 s), a flor surge em 0,16 s, o miolo acende, o brilho assenta em 0,6 s | aparece pronta | pronta |
| Rosto | olho esquerdo 0,14 s, o direito logo depois (0,12 s), bochechas 0,24 s, piscadela do olho direito 0,56 s | aparece pronto | pronto |
| Piscar | só nas Boas-vindas [Gabriel, 28/10: "depois da primeira piscadela, faça ele piscar os dois olhos algumas vezes a cada intervalo"]: rajadas dos dois olhos, a primeira aos 2,2 s e depois uma a cada 3,8 a 6,2 s de pausa; cada rajada tem 2 piscadas (às vezes 3) de 0,16 s, uma a cada 0,34 s (no máximo 3 por segundo); a ordem é fixa (2, 2, 3, 2, 3), não sorteada | não pisca | não pisca |
| A luz amarela da mão | só nas Boas-vindas, se a pessoa demora [Gabriel, 28/10: "pisque a luz amarela na mão dele"]: 10 s sem toque, tecla nem rolagem e depois a cada 14 s, no máximo 3 rodadas; cada rodada apaga o ponto e o brilho da flor até 12% e acende de volta, 3 vezes de 0,46 s; um toque, uma tecla ou a rolagem zera a espera | uma rodada é um só esmaecer lento de 0,9 s | não pisca |
| Cada passo | 0,16 s: o conteúdo sai 12 px e o seguinte entra; o ícone se desenha em 0,42 s com a luz à frente e o néon aceso, que assenta ao fechar; o traço sob a aba salta em 0,2 s; o Zé olha para o cartão | só esmaece | troca na hora |
| Fim | o Zé fica contente (os olhos viram arcos); o botão tocado leva o traço de seleção que o app já tem (240 ms), agora com néon | contorno que esmaece, sem néon | sem traço |
| Troca de tela | 200 ms de esmaecer | idem | na hora |

**Frequência** [Fato + Gabriel]: a constante `FREQUENCIA` em `src/apresentacao/componentes/escrita/frequencia.ts` já diz `primeiraVez: 'completa'`, `primeiraDoDia: 'curta'`, `demais: 'parada'`. A escolha do cartão 3 **não muda a constante**: muda onde a escrita toca (da marca pequena do cabeçalho para uma camada de tela cheia). Se o Gabriel achar 1,8 s por Dia demais, trocar uma palavra devolve tudo ao cabeçalho.

**Regras**
- A escrita acontece **uma vez por abertura, ou na tela cheia ou no cabeçalho, nunca nos dois**. A Abertura chama `tomarEscrita(agora)`: lê `escritaDaAbertura`, grava o Dia (`lembrarDaEscrita`) e avisa o `Marca` do cabeçalho, que então nasce `parada` (o nome já escrito, o ponto de luz que a viagem vai pousar). A decisão é tomada **uma vez**, no arranque, antes de qualquer componente montar.
- A Abertura é uma camada **decorativa**: `aria-hidden`, nunca prende foco, nunca atrasa um dado. Um toque ou a primeira tecla pula, e esse primeiro toque ou tecla é consumido (não aciona o controle de baixo). Quem usa leitor de tela lê a tela de baixo sem esperar a animação.
- **Camadas** (testado em Chromium 141): uma `div` fixa, mesmo com `z-index` máximo, fica **abaixo** de um `<dialog>` modal, porque o modal vai para a camada de topo do navegador; quem entra na camada de topo depois fica por cima (um `popover="manual"` aberto depois do dialog cobre o dialog; reabrir com `hidePopover()` e `showPopover()` o põe de volta no topo). E, com um modal aberto, um toque sobre o popover cai no dialog (a camada de baixo): o "toque pula" escuta o `document` em captura, não o elemento da Abertura. A Abertura é, portanto, um `popover="manual"`, e o E2E prova que o nome escrito nunca fica coberto pela Chegada nem pelo Retorno.
- Primeira vez ainda leva "Pular" visível (passa de 5 s no total, WCAG 2.2.2); a Abertura do Dia dura 1,8 s e não leva botão.
- **Quando a tela cheia não abre** [Marca, a confirmar]: Reduzido; "só estudo" ligado; Sessão aberta; qualquer abertura do Dia depois da primeira. Nesses casos o cabeçalho escreve o nome como hoje (`primeiraDoDia: 'curta'`). O Retorno à vista **não** dispensa: quem volta depois de dias ganha a entrada calma antes da folha do Retorno.
- Foco: ao fim da Abertura da primeira vez o foco vai ao título das Boas-vindas; na do Dia, o foco fica onde o app o põe (o título do Hoje ou o diálogo do Retorno).
- A luz só reporta estado: não segue o dedo, o cursor nem a rolagem; o Zé não olha para o ponteiro (só para o texto do passo, uma vez por passo).
- Ajuda → "Rever as boas-vindas": reabre sem escrever o nome e **sem gravar** nada; mostra o Zé inteiro, sem desenhar. Conta → "Passeio pelos menus": abre o passo 1 direto. Os dois são revisão (§6).
- **Exceção declarada à regra "nunca pulsa"** [Gabriel, 28/10]: a luz amarela da mão pisca quando a pessoa demora. É uma rodada de 3 piscadas (2,2 por segundo, abaixo do limite de 3 da WCAG 2.3.1), no máximo 3 rodadas por visita à tela, só nas Boas-vindas, nunca contínua (sem `infinite`); a luz é decorativa (`aria-hidden`) e o botão "Vamos" segue sendo a ação. As rajadas dos olhos, por sua vez, seguem enquanto a tela estiver aberta (a cada 4 a 6 s, menos de 1 s cada, só em Movimento normal); a pessoa as desliga em Calmo ou Reduzido (WCAG 2.2.2, pausar), e o sistema (`prefers-reduced-motion`) já as desliga. [Marca] Se isto pesar para quem se distrai fácil, o ajuste é limitar as rajadas a 6 por visita, como as rodadas da luz.

## 10. Estados e viewports

Telas: Abertura (primeira vez, Dia), Boas-vindas, quatro passos (nenhum com atalho), Começar (o botão do Google nos dois temas), passeio refeito (termina em "Concluir"), Ajuda (menu, guia reaberto), Conta (a linha nova), Entrar (não muda).
Viewports: 320×568, 390×844, 768, 1280; dia e noite; fonte a 200%; Calmo e Reduzido; néon ligado e desligado (o mockup tem o controle); cores forçadas; estado offline (nada depende de rede).
No 200% e no 320, o conteúdo **rola dentro da tela** e nada se perde (o mockup usa consultas de contêiner em `em`, que disparam com a fonte ampliada); com o Zé, a 200% rola 26 a 33 px a mais que com o Fiapo. Alvos ≥ 44 px. Sem rolagem horizontal (a página do mockup foi medida de 360 a 1100 px nos dois temas). A ordem de foco é [Seguir, Voltar], com a ordem visual invertida só no modo compacto (altura de até 41 em e largura de pelo menos 13 em; abaixo disso, a 200% em tela estreita, os dois ficam um sobre o outro e nenhum texto corta, o que o "Seguir" fazia no 390 a 200%). O cabeçalho do app (marca, Ajuda e Conta) quebra em duas linhas quando a fonte está a 200% em tela estreita, para a marca não encolher.

## 11. Restrições (produto, acessibilidade, privacidade)

- Local-first: nada do Zé, da Abertura nem do Passeio usa rede. Neste fluxo, só a tela Entrar fala com o serviço de conta, como hoje.
- **LGPD/segurança desta entrega:** nenhum dado novo. A única chave é a que já existe (`arretado:escrita-do-nome:v1`, só o Dia da última escrita, no Aparelho). "Rever" não grava. Sem diagnóstico, sem rastreio, sem biblioteca nova.
- O consentimento continua na tela Entrar: tocar em Entrar aceita, como hoje. O Começar não pede aceite novo: o botão do Google dele abre a tela Entrar, onde o texto "O que sai do seu Aparelho" vem antes do clique (`Entrar.test.tsx`, "o aceite só existe depois do clique em entrar"), e "Experimentar sem conta" não pede nada.
- Sem dependência nova. Nenhum HTML de fora: o desenho é SVG do próprio app e o desfoque é um filtro SVG nativo.
- **Orçamento de JS** [Marca, estimado, não medido]: o Zé e o Passeio ficam num trecho carregado só na Chegada (primeira vez), **fora do `inicioKb`**, até 6 kB gzip, medidos e informados no PR. O néon nos traços do início (nome e seleção) é CSS e poucas linhas: até 1,5 kB gzip; se passar, o CSS do néon vai junto do trecho que desenha. [Fato] O teto é `{ totalKb: 500, inicioKb: 320 }` (`scripts/tetos-do-pacote.json`); segundo o #336, o app fecha em 481 kB no total e 313 kB no início, então sobram uns 19 kB no total e 7 no início. Se a onda 2 ainda crescer, o teto é decisão da thread dona dele.
- Vocabulário: Aparelho, Dia, Sessão, Norma, Ponto, Cartão, Frase correta; nunca "Dispositivo" para equipamento.

## 12. Critérios de aceite observáveis

1. Primeira vez: nome 2,64 s, pausa 0,3 s, luz 0,5 s, contorno 1,2 s, rosto 0,6 s e piscadela até 1,4 s; o texto sobe na metade do contorno (cerca de 4 s); toque, tecla ou "Pular" mostram tudo pronto e o foco vai ao título.
2. Primeira abertura de cada Dia seguinte: a tela cheia dura cerca de 1,8 s e cai no Hoje; segunda abertura no mesmo Dia: nenhuma camada. O cabeçalho não escreve de novo.
3. Reduzido: nenhuma camada; Boas-vindas com o Zé inteiro e parado, sem piscar e sem a luz amarela piscando. Calmo: só esmaece, sem voo e sem néon aceso; os olhos não piscam e a luz amarela esmaece uma vez por rodada.
4. Esc fecha a Chegada e o foco volta a quem a abriu. "Rever as boas-vindas" não grava.
5. 320×568 e 200%: nada some, rola por dentro, alvos ≥ 44 px, sem rolagem horizontal, dia e noite; o Zé do passo nunca cobre texto.
6. axe limpo nos dois temas; contrastes do Zé medidos em `scripts/contraste.mjs`.
7. Nada guardado além do Dia; sem rede; sem dependência; JS dentro do orçamento (§11).
8. O fluxo de `/comecar` (#325) e a tela Entrar passam nos E2E que já existem, sem mudança; só mudam os E2E da Chegada que tocavam os botões que saíram (o #325 passa a ser alcançado pelo estado vazio do Hoje).
9. Os textos do Passeio vêm da fonte única (teste unitário).
10. Capturas com `node scripts/capturas-ui.mjs --medir` e folhas antes e depois em `docs/redesign/ze/`.
11. O nome escrito nunca fica coberto pela Chegada nem pelo Retorno (E2E: amostra de pixel ou `elementFromPoint` no centro do nome durante a Abertura); o primeiro toque e a primeira tecla só pulam, sem acionar o botão de baixo; "Rever as boas-vindas" continua sem gravar (`chegada` e `entrada-do-dia` iguais antes e depois).
12. **Néon:** nenhum seletor de brilho (`neon`, `bloom`) fora dos cinco traços e dos tokens (`rg` no PR); nenhuma animação `infinite` nova; o brilho assenta em 0,6 s e o repouso vale 0 de dia (0,16 no Zé) e 0,30 de noite; Calmo mostra só o repouso, esmaecendo; Reduzido, o repouso parado; em `forced-colors: active` o brilho some e o traço fica em `CanvasText`.
14. **Rosto:** nenhuma boca em tamanho nenhum; olhos retos (sem rotação); bochechas de 40 px para cima e ausentes a 32 e 24 px; a piscadela só com a cápsula aberta e o olho feliz não pisca; nenhum humor triste; em cores forçadas, sem bochechas e com linha e olhos em `CanvasText`.
15. **Boas-vindas vivas:** (a) só dois botões, "Vamos" e "Agora não"; (b) em Movimento normal as rajadas de piscadas seguem a tabela do §9 e nunca passam de 3 por segundo; (c) a luz amarela pisca só nas Boas-vindas, 10 s depois do último toque, tecla ou rolagem, no máximo 3 rodadas, e nunca nos passos nem no Começar (teste com relógio falso); (d) Calmo: um esmaecer lento por rodada; Reduzido: nada.
16. **Passeio refeito:** a linha "Passeio pelos menus" da Conta abre o passo 1 sem as Boas-vindas; "Voltar" no passo 1 devolve ao app; o último passo diz "Concluir" e volta ao app; Pular e Esc também; nenhuma das duas portas mostra o Começar nem grava nada.
17. O desenho do Zé não tem linha do chão em tamanho nenhum.
18. **Começar:** o título "Vamo começar?"; o botão do Google com a marca oficial de quatro cores (`aria-hidden`), nome acessível "Entrar com o Google", claro de dia e escuro à noite e sem a cor de ação do app; a nota do convite sob ele; "Experimentar sem conta e salvar seus dados manualmente" embaixo, que leva ao Hoje; o Google abre a tela Entrar; sem "Agora não" no alto; Esc leva ao app.
19. Nenhum passo do passeio tem botão de atalho, e todo botão de cada tela é alcançável (cabe na tela ou a tela rola) a 390, 320 e 200%.
13. **Custo do néon:** o mesmo método de `fonte/custo.cjs` (Abertura inteira, CPU 4×, 390×844 a 2×) com no máximo 2% dos quadros acima de 33 ms e sem queda de taxa; e uma medida num Aparelho real (o do Gabriel) quando houver; sem ela, o PR do N1 diz "não medido em Aparelho real".

Testes: unitário da frequência (a Abertura toma a escrita e o `Marca` nasce `parada`), de componente (Zé `aria-hidden`, passos sem atalho, o botão do Google, néon só em traço), E2E por Playwright (primeira vez, primeira do Dia, outras aberturas, Calmo, Reduzido, 320×568, 200%). **Rodar subconjuntos:** a suíte E2E inteira é lenta.

## 13. Decisões pendentes

1. **D-D10 (só o Gabriel).** O app diz "Não há personagem" (D-D8). O Zé emenda isso, e a regra do néon (§8b) entra junto; texto proposto no Apêndice A. Sem o OK dele, nada disto vira código.
2. **Alcance do néon.** [Marca] Li "para o app como um todo" como "em todo traço que a caneta desenha": são cinco traços, três deles já existentes. Brilho em coisa parada (borda, botão, o ponto do Dia feito) ficou de fora por contraste, calma e "uma ação dominante por tela". Se o Gabriel quiser mais, é decisão dele, com contraste medido.
3. **Botão principal das Boas-vindas:** decidido em 28/10: um só botão, "Vamos". Falta confirmar com os donos do #320 e do #325 que o diálogo da Chegada pode perder "Escolher meu concurso", "Ler uma norma", "Registrar um erro" e "Montar a trilha passo a passo": o estado vazio do Hoje já oferece os começos (`proxima-acao.ts`), inclusive "Escolher meu concurso".
5. **Cores e rosto do retorno de 27/10 (23:41Z).** [Marca] Três leituras, todas reversíveis: (a) "linha branca" vale para o Zé, e nos outros quatro traços só o brilho vira azul; (b) o azul piscina `#39caef` é um token novo, medido, igual de dia e de noite desde o pedido de 28/10 (12:54Z), e pode trocar pelo azul do vidro da noite (`#9db7e8`); a faixa de dia afunda a 32 e 24 px para `#0e93b4` por contraste (Cores); (c) o rosto não tem boca, e a alegria vem dos olhos em arco e da piscadela. O juiz cego deu cacto 4 e fantasma 3 com o dia em azul escuro e, com o piscina de dia, cacto 4 nas três imagens e fantasma 2, 3 e 2 (Apêndice C): se o Gabriel sentir "fantasminha", o próximo ajuste são duas costelas finas no tronco, não o rosto.
4. **Tensão com o S4 (#331).** O Gabriel acabou de tirar a folha diária da Entrada do Dia por ser atrito antes de estudar; a Abertura do Dia é uma camada de 1,8 s com a mesma frequência. Ela não tem botão, não prende foco e um toque pula, mas é uma espera diária. Se pesar no uso, a constante resolve.
6. **O ponto amarelo e a marca (retorno de 28/10, 14:54Z).** [Marca] Li o pedido como valendo para o Zé e para a luz que o desenha. O ponto do nome e os pontos de estado do app ficam como a D-D9 os define (de dia, tinta com halo de lima; à noite, âmbar). Se o Gabriel quiser o amarelo na marca também, é decisão da D-D9 (e do `luz.css`), com contraste medido, e não do mascote.

7. **O nome do Zé** [Gabriel, 28/10: "estou temeroso de que 'zé' fique muito estereotípico. pensei em 'Caru', de 'Mandacaru'. mas talvez ele nem precise de nome"]. Aberto, sem pressa: o texto das Boas-vindas já não diz o nome, então a tela funciona sem ele. [Marca] Recomendo **sem nome na tela por ora**, com "Zé" só como codinome nos arquivos, até haver um nome; se for dar nome, **Caru**, e **Xique** (do xique-xique, o cacto da caatinga) de reserva. Evitar Facho (gíria para fascista), Pavio ("pavio curto"), Cacá (cocô, na fala de criança), Arre e Coroa. Marca não conferida no INPI.
8. **Duas portas para refazer o passeio.** [Marca] O pedido era só a Conta; mantive também Ajuda › "Rever as boas-vindas". Se parecer redundante, a Ajuda perde o item e fica a Conta.
9. **Alcance do piscar.** [Marca] Li a luz amarela como valendo só nas Boas-vindas, onde a pessoa escolhe, e não no Começar; as rajadas dos olhos, só nas Boas-vindas também. Se quiser nos dois, é uma linha.
10. **O "acendem" do guia real.** [Marca] O Gabriel achou o verbo confuso no passeio; o guia da tela (#313, `guia/conteudo.ts:27`) tem a mesma frase. Proponho "ficam marcados como feitos" nos dois; mudar o guia sobe a `versao` dele.
11. **O Mapa da norma sem o qualificador.** [Marca] O texto do Gabriel diz que o Mapa "mostra o que mais cai e te guia pela leitura"; o guia real diz "nas normas do acervo com dados". Onde a norma não tem dados, a frase promete o que o app não entrega. Adotei o texto dele; se preferir, "nas normas que já têm dados" fecha a lacuna.
12. **O Google no Começar abre a tela Entrar.** [Marca] O Gabriel pediu o símbolo do Google na última página, para a pessoa se registrar. O botão abre a tela Entrar, e não o login direto, porque o aceite (o que sai do Aparelho e a política) vem antes do clique, como hoje. Entrar direto pede o aviso curto ao lado do botão e a decisão da thread de Contas. O código por e-mail e o "Usar sem conta" continuam na tela Entrar. A mesma marca do Google poderia entrar no botão da tela Entrar, que hoje é só texto.
13. **Detalhes do Começar.** [Marca] O "Agora não" do alto saiu, porque "Experimentar sem conta…" leva ao mesmo lugar; Esc segue fechando. "Vamo começar?" segue a grafia do Gabriel, e o botão das Boas-vindas é "Vamos": uniformizar é trocar uma palavra.

**Não verificado:** a redação do botão do Google (a tela Entrar diz "Entrar com o Google"; não conferi se as diretrizes de marca do Google pedem outra em português); o piscar da luz amarela e das rajadas num Aparelho real (só Chromium, amostrado a cada 20 ms); VoiceOver e TalkBack no fluxo da Chegada; Aparelhos reais (só Chromium, sem placa de vídeo); Safari e WebKit (filtros SVG de desfoque e `stroke-dashoffset` juntos); o fundo nativo de abertura do app instalado em tema escuro (o `background_color` do manifest é o papel claro; pode lampejar antes da tela cheia, limite da plataforma); o custo real em kB do componente em React (as metas de 6 e 1,5 kB são estimadas); se o Zé agrada de verdade (os juízes foram modelos, em imagens de exploração; o juiz é o Gabriel).

## Apêndice A. D-D10 proposta (para `docs/design/decisoes-design.md`)

> ## D-D10, O Zé: um mascote de néon suave só na Chegada e na Ajuda (data, decisão do Gabriel)
>
> **Emenda a D-D8 só na regra "Não há personagem"** e **acrescenta o néon suave à D-D7 ("A caneta que desenha")**. O cachorro do Resumo do Dia e o mascote antigo não voltam; o quadro do cacto, o traço de seleção e a passagem do cartão valem inteiros.
>
> **Origem.** Pedido do Gabriel em 27/10/2026, cinco cartões (17:29 a 17:30Z) e o retorno de 21:51Z e 21:59Z: o Zé (nome dele), cacto de um tubo só como um letreiro de néon, olhos de cápsula inspirados no mascote do Grok, e o néon suave nas partes que já têm o traço da caneta; e o retorno de 27/10, 23:41Z: linha branca com brilho azul (escuro de dia, piscina à noite) e rosto sem boca, com olhos retos e bochechas rosa.
>
> **Regras do personagem.** (1) Um só personagem, o Zé: o cacto da marca expandido, num traço aberto de pé a pé, com uma flor que é o ponto de luz; olhos de cápsula retos e bochechas rosa, sem boca. (2) Aparece só na Chegada (Boas-vindas, passos, Começar), no passeio refeito (Ajuda › "Rever as boas-vindas" e Conta › "Passeio pelos menus") e no guia da tela reaberto pela Ajuda; nunca no Hoje, na Trilha, no Fixar, na Biblioteca, no Leitor, na Sessão, na Revisão, no Resumo do Dia, em erros ou avisos. (3) Humores pelo formato dos olhos: neutro, atento, contente (olhos em arco) e a piscadela; nunca triste, nunca cobra, nunca comemora sequência. (4) Não substitui rótulos, mensagens nem navegação; é `aria-hidden` e o texto é sempre da tela. (5) Movimento: a luz só leva a marca e mostra estado; não segue ponteiro nem rolagem; Calmo só esmaece; Reduzido mostra tudo pronto e parado. Nas Boas-vindas o Zé pisca os dois olhos em rajadas curtas e, se a pessoa demora, a luz amarela da mão pisca (3 piscadas por rodada, no máximo 3 rodadas): exceção declarada à regra de não pulsar, pedida pelo Gabriel em 28/10. (6) Sem dado novo: só o Dia da escrita do nome, no Aparelho.
>
> **Regra do néon suave.** (1) O brilho existe só em traço que a caneta desenha (a escrita do nome, o Zé, os ícones do passeio, o traço de seleção, o quadro do cacto): acende ao ser traçado e assenta em 0,6 s; nunca pulsa. (2) Repouso: de dia zero (0,16 no Zé), de noite 30%. (3) Uma cor só: azul piscina, de dia e de noite; o ponto do Zé é amarelo cheio com brilho amarelo, igual nos dois mundos. (4) Nunca em botão, texto, cartão, borda ou ícone parado; o brilho não carrega informação. (5) Calmo mostra só o repouso, esmaecendo; Reduzido, o repouso parado; cores forçadas, sem brilho. (6) Tokens `--neon-cor`, `--neon-aceso`, `--neon-repouso` por mundo, e os `--z-*` do Zé.

**Skill `arretado-design-principles` (caminho protegido, PR próprio com o rótulo `aprovado-gabriel`).** Em "Personagem", trocar a primeira linha por: "Há um personagem só (D-D10): o Zé, na Chegada e na Ajuda; nunca fora delas. O cachorro e o mascote antigo não voltam." E manter as demais linhas (opcional e coadjuvante; não é professor, terapeuta, chatbot, autoridade jurídica nem "IA"; não substitui rótulos; não culpa; original). Em "Movimento", acrescentar: o néon suave (brilho só em traço que a caneta desenha, acende ao traçar e assenta em 0,6 s; nunca pulsa; nunca em botão, texto, cartão ou ícone parado) e a Abertura do Dia (modo curto, 1,8 s, sem botão) como exceção declarada à regra "quanto mais frequente, mais curto". Na "Visual vigente", dizer que o desfoque é do próprio traço, nunca vidro desfocado atrás de texto.

## Apêndice B. Como entra no app

| Peça | Faz | Mexe em |
|---|---|---|
| `componentes/ze/` (`Ze.tsx`, `geometria.ts`, `humores.ts`) | O SVG `aria-hidden`, a função `contornoZe`, os humores, o desenho de traço, as camadas de néon | arquivos novos |
| `entrada/Abertura.tsx` | A camada de tela cheia: usa o `EscritaDoNome` que já existe (`curta` ou `completa`), faz o voo da luz medindo `.eb-disco` e `.lockup-ponto` | arquivo novo + montagem na raiz |
| `escrita/frequencia.ts` | `tomarEscrita(agora)`; `Marca` nasce `parada` quando a Abertura tomou a escrita | só aqui |
| `entrada/Passeio.tsx` | Os quatro passos e o Começar, dentro do `<dialog>` da Chegada; os ícones que se desenham | arquivo novo + `Chegada.tsx` |
| `entrada/BotaoGoogle.tsx` | O botão do Google do Começar: marca de quatro cores, claro de dia e escuro à noite; abre `/conta/entrar` | arquivo novo |
| `MenuAjuda.tsx` | Item "Rever as boas-vindas" (abre a Chegada sem gravar; o passeio termina em "Concluir") | só o item |
| `conta/Conta.tsx` (`ITENS_CONTA`) | A linha "Passeio pelos menus", depois de "Orientações": abre o passeio direto, em modo revisão | só a linha |
| `guia/GuiaDaTela.tsx` | O Zé pequeno no cabeçalho do guia reaberto (opcional) | só o cabeçalho |

(Os caminhos de `entrada/`, `guia/`, `conta/` e `componentes/` são de `src/apresentacao/`.)

**Harness E2E** [Fato, `e2e/apoio.ts`]: o harness semeia só `arretado:chegada:v1` e `arretado:entrada-do-dia:v1`. Como a Abertura do Dia cobre a tela e consome o primeiro toque, o M2 passa a semear também `arretado:escrita-do-nome:v1` com o Dia civil de hoje (Brasília) em todo teste; só `escrita-do-nome.spec.ts` e o novo `abertura.spec.ts` desligam isso (`semearAbertura: false`). Sem isso, todo E2E começaria com a tela cheia.

**Ordem e tempo** [Fato, `entrada/regras.ts`, `EntradaDoDia.tsx`]: a Chegada e a Entrada do Dia são decididas **uma vez, na abertura a frio, depois que o Hoje carregou** (`decidirNaAberturaAFrio`); a Chegada só abre em Aparelho que nasceu hoje e ainda não a viu (`chegadaJaVista`, `aparelhoNasceuHoje`), e "Rever as boas-vindas" abre a `Chegada` sem `dia`, que **não grava**. Já a escrita do nome é decidida na hora, só com o localStorage. Então: (1) a Abertura nasce de `escritaDaAbertura` e começa sem esperar dados; (2) na primeira vez, quando o nome termina, a luz voa ao pé esquerdo do Zé das Boas-vindas se a Chegada já decidiu abrir; se não decidiu em até 0,6 s, a luz vai ao ponto do cabeçalho e o Zé aparece pronto quando a Chegada abrir (sem desenho); (3) a Chegada e o Retorno só abrem por cima depois que a Abertura sai, ou a Abertura é reaberta no topo (ver Camadas, §9).

Não tocam: a tela Entrar, o fluxo `/comecar` (#325), o consentimento, o esquema, a sincronização.
Conflitos previstos: #331 (Entrada do Dia vira linha quieta) é compatível: a Abertura sai da frente antes, e como ela só escreve o nome (não saúda), a saudação "Bom dia." da linha do Hoje não se repete; se a Abertura ganhar saudação um dia, decidir ali qual das duas fica (achado da revisão do #331, 27/10). #320 já está na `integracao`; os passos reaproveitam os componentes da Chegada.

## Apêndice C. Plano ambicioso e juízes

**Objetivo além do objetivo:** a pessoa começa a primeira Sessão no mesmo dia em que instala.
- **Altitude.** (1) O Zé e o Passeio, como acima. (2) Medir, no teste com outras pessoas da V1, o tempo até a primeira ação e quantas pedem ajuda para achar a Trilha. (3) Passeio que se adapta: só mostra os menus que a pessoa ainda não usou.
- **Profundidade.** Partir do que o app já faz (a escrita do nome, o guia, a Chegada, os três traços de caneta), não de uma ilustração: o Zé é geometria paramétrica e herda a curva de desenho do nome; o néon é uma regra com tokens, não um enfeite por tela.
- **Alcance.** Princípios de animação (antecipação e acompanhamento: a luz sai do cacto e pousa na flor); letreiros de néon (o que importa: um tubo só, brilho que cai com a distância, nunca piscando); mascotes de onboarding (o que evitam: culpa, cara triste, sequência); tipografia de traço único.
- **Juízes de fora, já usados:**
  - *Juiz cego* (um agente novo por imagem, sem saber o que era; "o que vê", "cacto N/5", "fantasma N/5"). Rodada do sorriso e dos olhos inclinados: dia, faixa nítida, cacto 5 e fantasma 2; dia, faixa desfocada, 4 e 2; noite sem miolo, 4 e 3; noite com o miolo da primeira rodada, 4 e 2 a 3. **Rodada do rosto sem boca (28/10, imagens do próprio mockup):** com olhos de 11 por 27, dia 4 e 3 e noite 4 e 3; com os olhos finais de 12,5 por 24, também 4 e 3 nos dois mundos. Com o corpo mais cheio (miolo uniforme a 20%) deu 4 e 3 de novo, então o miolo não é a alavanca: o que puxa para "fantasminha fofo" é o rosto sem boca com bochechas (os próprios juízes dizem isso), enquanto a silhueta com os braços em U e a flor seguram o cacto. **Rodada do piscina de dia (28/10, três imagens do próprio mockup: 200, 120 e 72 px):** cacto 4 nas três e fantasma 2, 3 e 2; a troca de cor não piorou a leitura. Limites: são modelos, viram imagens de exploração e não as telas finais; o juiz de verdade é o Gabriel.
  - *Medidor de contraste* (dia: linha branca na faixa funda 3,6:1, faixa funda no papel 3,4:1, olho 15,8:1 e flor amarela 1,5:1; noite 18,6:1, 9,6:1 e flor amarela 11,8:1) e *medidor de custo* (`fonte/custo.cjs`, §8b item 9).
  - *Medidas de layout* (`fonte/lote-ze.cjs`): sem rolagem horizontal em 320, 390 e 768, nos dois temas; a 200% rola por dentro.
- **Juízes que faltam:** axe, capturas medidas do app, E2E, o orçamento de JS e, na V1, as outras pessoas. Enquanto a V1 não existe, "funciona" quer dizer que esses medidores passam; não quer dizer que a pessoa gostou.

## Apêndice D. Quem constrói

Uma thread de UI/design (esforço máximo, não conta nas duas tarefas de código), aberta pela coordenação **depois** do OK do Gabriel à D-D10 (o botão principal já está decidido: "Vamos"; o nome do Zé pode esperar). Cinco PRs de rascunho para a `integracao`, cada um com o tamanho de JS informado e revisão de design da Marca. Ordem: M1; depois M2, M3 e N1 em paralelo (arquivos separados); M4 por último.

| PR | Conteúdo |
|---|---|
| M1 Fundação | D-D10 e este contrato em `docs/design/referencias/2026-10-27-ze/`; `brief-avatar.md`; os tokens `--neon-*` por mundo em `estilos.css`; componente `Ze`; pares de contraste; glossário (Zé, Abertura, Passeio, Passo, Néon suave). A skill de princípios vai em PR próprio com `aprovado-gabriel`. |
| M2 Abertura | Camada, `tomarEscrita`, voo da luz, E2E (primeira vez, Dia, outras, Calmo, Reduzido). Dono: `Abertura.tsx`, `frequencia.ts`, a raiz. Usa o `EscritaDoNome` sem editá-lo. |
| M3 Passeio | Boas-vindas com "Vamos", quatro passos sem atalho, Começar com o botão do Google e "Experimentar sem conta", ícones que se desenham, o modo revisão ("Concluir"), "Rever as boas-vindas", a linha da Conta, guia com Zé pequeno. Dono: `Passeio.tsx`, `BotaoGoogle.tsx`, `Chegada.tsx`, `MenuAjuda.tsx`; `Conta.tsx` só a linha. |
| N1 Néon nos traços que já existem | O Apêndice E: `EscritaDoNome` (+ `escrita-b.css`), `tracar.ts` (+ `traco.css`), `desenhar.ts` e `cena.ts` (+ `quadro.css`). Mede o custo (§12, item 13). Dono desses arquivos. |
| M4 Fecho | Capturas antes e depois, folhas em `docs/redesign/ze/`, `docs/solucao-de-problemas.md`. |

A Marca revisa o design de cada PR. bunshin cai para `paint` e `cast` (o bunshin é para um site inteiro); o `impeccable` entra no polimento.

## Apêndice E. O néon nos cinco traços

Cada linha é o que o mockup já faz (`fonte/src/ze.js` e `ze.css`, seção "Folha do néon suave"); o PR porta, não copia.

| Traço | Arquivo no app [Fato] | O que o néon é | Acende | Repouso dia / noite | Calmo | Reduzido |
|---|---|---|---|---|---|---|
| Escrita do nome | `componentes/escrita/EscritaDoNome.tsx`, `escrita-b.css` | cópia dos 14 traços das letras e do cacto, 30 de largura, num grupo com `feGaussianBlur` σ 7; `@keyframes eb-neon` (aceso até 66% da escrita, assenta até 84%) | com cada letra | 0 / 0,30 | só o repouso, esmaecendo | sem abertura |
| O Zé | novo, `componentes/ze/` | traço largo (faixa × 1,9) com σ 11; faixa piscina desfocada σ 2,4 de dia e σ 4,5 (0,55) de noite | enquanto a luz desenha | faixa piscina e 0,16 / 0,32 | pronto, esmaecendo | pronto |
| Ícones do passeio | novo, `entrada/Passeio.tsx` | cópia do ícone, 4,2 de largura, σ 1,1; classe `acesa` | com o desenho (0,42 s) | 0 / 0,30 | o ícone esmaece | pronto |
| Traço de seleção | `componentes/traco/tracar.ts`, `traco.css` | segundo `rect` do contorno, 7 de largura, σ 2,4; acende com o contorno (240 ms) e some com ele (260 ms); não tem repouso | com o traço | some com o traço | contorno esmaece (380 ms), sem néon | sem traço |
| Quadro do cacto | `componentes/quadro/desenhar.ts`, `cena.ts`, `quadro.css` | grupo gêmeo dos traços do cacto, 34 de largura, σ 6; acende enquanto a caneta anda e assenta em 0,6 s | com a caneta | 0 / 0,30 | quadro pronto, esmaecendo | quadro pronto |

Ordem de leitura para quem constrói: §8b, esta tabela, depois a seção "Folha do néon suave" do mockup (as três fotos "Traçando, Acabou de fechar, Em repouso" e as duas demonstrações com "Repetir").
