# O Fio: o mockup aprovado e o que o app faz com ele

O arquivo `mockup-aprovado.html` é o que o Gabriel mandou em 04/11/2026 ("É isso aqui ó."). É a fonte: em
divergência entre o app e ele, vale o arquivo, salvo desvio registrado em `docs/design/desvios.md`. Não se edita
nem se reformata (`.prettierignore`), e o teste `scripts/fio-mockup-css.test.ts` trava o hash
(`e70647a8d65a54e95b6922cf2c05fed7c43f35a2f0e1dad1e6039557324978af`): trocar o arquivo é decisão do Gabriel e da
Marca. As 10 telas do mockup (`data-tela`): abertura, prova, inicio (Agora), ler, lembrar, achar, pouso, mapa
(Destino), varal e folheto, mais as folhas (Conta, Guardar um erro, Caderno, Porteira, Organizar).

`docs/design/mockups/fio-v16.html` é outra versão do protótipo (sha256 `4a9963b9…`, mais de cem linhas de diferença) e NÃO é o
arquivo que o Gabriel aprovou: não serve de fonte, de medida nem de comparação.

## Como o app o veste (em camadas)

Tudo mora em `src/apresentacao/fio/mockup/` e `src/apresentacao/fio/m/`. O prefixo `m-` marca o que vem do mockup
(`.cartao` do mockup é `.m-cartao` no app, `#puxador` é `#m-puxador`, `--mola` é `--m-mola`).

1. `reset.css` (antes): o que o protótipo supunha da página (caixa, margens, fonte).
2. `mockup.css` (gerado, **não se edita**): `npm run fio:css` lê o `<style>` do mockup e escreve este arquivo,
   trocando `.x` por `.m-x`, ids e propriedades personalizadas pelo mesmo prefixo, `:root` pela raiz do Fio
   (`.m-fio`) e pondo todo seletor dentro dela, para nada vazar para o resto do app. Tira o que só existe no
   protótipo (a página, a barra de controles, a nota). `npm run fio:css:check` confere (o teste faz o mesmo).
3. `fontes.css`: as fontes do mockup servidas do próprio site (T19), com nomes só do Fio.
4. `ajustes.css` (depois): os desvios, numerados, cada um com o motivo. É o único lugar onde o app se afasta do
   mockup. Cada desvio também tem uma linha em `docs/design/desvios.md`. Sem motivo escrito, não é desvio: é erro.

## O movimento

Tudo passa por `m/anima.ts`: `animar(el, quadros, opções)` é `el.animate(quadros, { fill: 'both', ...opções })`,
igual ao `animar` do mockup, com os três modos dele (`normal`, `calmo` e `reduzido`; o sistema pedindo menos
movimento liga o calmo). A troca de telas (`m/transicao.ts`) deixa um fantasma da tela que sai (`.m-saindo`) e
entra a nova, como o `ir()` do mockup. A onda de luz do botão de ação (`m/onda.ts`) é um ouvinte do documento,
como no mockup, e o mundo noite ou dia vem de `m/mundo.ts`.
O movimento também escolhe a cara do botão de ação (desvio 17): `m/movimento.ts` põe `data-movimento` (`vivo` ou
`calmo`) na raiz, e `ajustes.css` veste o **Sol** no Vivo (o padrão do app) e o **Só contorno** no Calmo. O Calmo é o
mesmo de `anima.ts`: o perfil Calmo em uso ou o sistema pedindo menos movimento.

Só a Web Animations API, como o mockup: nenhuma biblioteca de movimento entrou neste porte, porque o mockup
aprovado não usa nenhuma. Quando uma entrar (Motion, View Transitions, Auto-Animate;
`docs/design/movimento-e-bibliotecas.md`), passa por `anima.ts` e vira decisão em `docs/decisoes-tecnicas.md`.

## Como conferir (a prova)

- `npm run test`: o gerador do CSS, o hash do mockup e o CSS em disco igual ao gerado.
- `e2e/fio-passos.spec.ts`, "o movimento do mockup está todo no app": a jornada puxar, Ler, Lembrar, pouso e volta,
  com cada `Element.animate` do mockup (alvo, propriedades, duração, atraso e curva). Tirar uma animação ou trocar
  a mola por um `ease` quebra o teste.
- `node scripts/fio-animacoes-do-mockup.mjs`: anota as animações do mockup na mesma jornada (e, com
  `--app http://localhost:4173`, as do app já com a matéria e a lei da prévia). É daí que sai a tabela do teste;
  um mockup novo aprovado pede rodar de novo e atualizar a tabela. Com `CHROMIUM_PATH` onde o Playwright não
  acha o navegador.
- `node scripts/fidelidade-fio.mjs`: o par mockup | app | diferença (medidor, não portão: o conteúdo semeado
  difere). O que vale é olhar o par, nos quatro cantos: 360 e 1280 de largura, dia e noite, e uma foto no meio
  de uma troca de tela.
- O teste verde não prova fidelidade: a Marca revisa contra o arquivo antes do merge.

## Como acrescentar um desvio

1. Escrever o desvio em `ajustes.css` (número seguinte, motivo no comentário), nunca em `mockup.css`.
2. Pôr a linha em `docs/design/desvios.md` (tela, o que o mockup faz, o que o app faz, motivo, quem aprovou).
3. Cortar algo do mockup, não só acrescentar, exige cartão de opções ao Gabriel antes.

## Para não perder algo ao portar

- O mockup tem comportamento fora dos componentes: ouvintes do `document` e da `window`. Antes de dar a tela por
  portada, listar todos (`grep -n "document.addEventListener\|addEventListener('resize" mockup-aprovado.html`).
  A onda de luz do botão foi o que escapou da primeira passada, e só apareceu lendo a regra de UI.
- `Element.animate`, transições e animações de CSS: conferir os três, não só os dois primeiros.
- A troca de tela cruza a que sai com a que entra, sem vão. Dados que a tela nova espera (a leitura do app, um
  pedaço do pacote) criam um vão que o mockup, que é estático, não tem: a tela parte da última leitura e a
  fronteira do `Suspense` fica no quadro, nunca em cada tela (`docs/solucao-de-problemas.md`, "A troca de tela
  deixava o quadro vazio"). O E2E mede a cobertura do quadro a cada quadro.
- O que o mockup faz só por gesto (o Lembrar se pula arrastando o cartão) precisa de um caminho por teclado e por
  leitor de tela, e esse caminho é um desvio registrado.

## Onde está cada tela do mockup

| Mockup | App |
| ------ | --- |
| inicio (Agora) | `m/AgoraM.tsx`, `m/PuxarM.tsx`, `m/NavM.tsx` |
| ler | `m/PassoM.tsx`, `m/LerM.tsx` |
| lembrar | `m/LembrarM.tsx` |
| pouso | `m/PousoM.tsx`, `m/CenaM.tsx`, `pouso/` (os lugares e o Zé) |
| porteira (deque) | `m/DequeM.tsx` |
| guardar, revisar, o passo da pessoa | `m/OutrosPassosM.tsx` |
| trilho, toast, "+" e mundo | `m/TrilhoM.tsx`, `m/ToastM.tsx`, `m/MaisM.tsx`, `m/mundo.ts` |
| abertura, prova, achar, mapa, varal, folheto e as folhas | ainda não portados (próximos PRs) |
