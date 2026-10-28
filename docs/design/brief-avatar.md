# Brief de design — o Zé, avatar do Arretado (D-D10)

Alvo: o personagem (avatar) do app e o néon suave que o acompanha. Fontes: a D-D10 em [`decisoes-design.md`](decisoes-design.md); o contrato da Marca, com os valores do mockup, em [`referencias/2026-10-27-ze/contrato.md`](referencias/2026-10-27-ze/contrato.md) (v10, 28/10/2026); `CLAUDE.md`; `src/apresentacao/componentes/ze/`. Etiquetas: **[Fato]** do repositório, **[Gabriel]** decisão ou palavra dele, **[Marca]** hipótese de design. O nome "Zé" é codinome: nenhuma tela o diz (a decisão do nome segue aberta, §13).

## 1. Resumo

Um personagem só, o **Zé**: o cacto da marca como um tubo de néon de um traço só, com dois olhos de cápsula retos, bochechas rosa e uma flor que é o ponto de luz. Aparece só na Chegada, na Ajuda e na tela de carregamento do `index.html`, dá vida à espera nas Boas-vindas e acompanha o Passeio pelos quatro menus. O **néon suave** (o brilho azul piscina que acende quando a caneta traça) vale também para os traços que o app já tem: o nome, o traço de seleção e o quadro do cacto. O Zé é decorativo (`aria-hidden`); tudo o que ele "diz" é texto da tela.

## 2. Resultado do usuário

Chega sem medo, sabe onde fica cada menu depois de quatro toques e decide começar ou entrar sem ler preço nem termo. Quem pede ajuda reencontra o passeio e o guia da tela sem refazer a Chegada.

## 3. Público por comportamento

Quem tem dificuldade de concentração e "não sabe por onde começar", abrindo o app pela primeira vez neste Aparelho, ou voltando e pedindo ajuda. Nenhuma tela pergunta nem guarda diagnóstico, e nenhuma promete tratamento (`CLAUDE.md`).

## 4. Situação antes e depois

- **Antes** [Fato]: a Chegada é uma folha só, com as listas "Os quatro menus" e "Dentro de uma Norma" e atalhos; o app diz "Não há personagem" (D-D8); nenhum traço de caneta brilha.
- **Depois** [Gabriel]: telas curtas dentro da mesma Chegada, um passo por toque, com o mesmo texto; um personagem, o Zé, só ali e na Ajuda; os traços de caneta ganham o néon suave.
- **Objeção principal:** "mais uma espera antes de estudar" (a Abertura do Dia, de 1,8 s, repete a cada Dia). Resposta: não tem botão, não prende foco, um toque pula, e uma constante (`FREQUENCIA`) a desliga.

## 5. Mensagem e CTA

Mensagem [Gabriel, 28/10]: "Bora conhecer a ferramenta que vai facilitar de verdade seus estudos?" A tela deixa de dizer o nome do Zé. Um só botão, **"Vamos"**, começa o passeio; "Agora não" fica no alto da tela e leva ao Hoje. "Escolher meu concurso" e "Passear pelos menus" saem da Chegada: o primeiro passa a ser o estado vazio do Hoje.

## 6. História/fluxo em etapas

1. **Abertura** (camada de tela cheia): na primeira vez no Aparelho o nome se escreve em 2,64 s e a luz voa até o Zé; na primeira abertura de cada Dia seguinte, o nome em modo curto (1,2 s) e a luz leva a marca ao cabeçalho; nas demais, nada.
2. **Boas-vindas:** o Zé se desenha (1,2 s), o rosto acende (0,6 s) e ele dá uma piscadela. Depois pisca os dois olhos em rajadas curtas; se a pessoa demora, a luz amarela da mão pisca (§9).
3. **Passeio** (um passo por toque, sem atalho para outra tela): Hoje, Trilha, Fixar e Biblioteca. O Zé olha para o texto do passo, uma vez por passo.
4. **Começar:** "Vamo começar?", o botão do Google (que abre a tela Entrar, onde o aceite vem antes do login) e "Experimentar sem conta e salvar seus dados manualmente", que leva ao Hoje.
5. **Refazer:** Conta › "Passeio pelos menus" (abre os passos direto) e Ajuda › "Rever as boas-vindas". Nos dois casos é uma revisão: o último passo diz "Concluir", a tela Começar não aparece e nada se grava.

Pular: toque, tecla ou "Pular" mostram tudo pronto; "Pular o passeio" leva ao Começar.

## 7. Conteúdo comprovado

Nada de preço, "grátis", depoimento ou estatística: não existem. A frase de uso é a da tela Entrar ("só e-mails convidados"). Os textos do Passeio vivem num módulo só, com o texto do Gabriel de 28/10 (tabela completa no §7 do contrato); o guia da tela segue como está, trocando o "acendem" por "ficam marcados como feitos". Nenhuma frase soa como dívida: "Continuar" e "Retomar", nunca "Você parou em".

## 8. Direção visual e personagem

**O Zé** [Gabriel + Marca]:
- **Silhueta:** um traço aberto, de pé a pé, 19 segmentos, `viewBox="22 10 196 240"`. Sobe pelo braço esquerdo (o mais alto, como na marca), passa pelo topo do tronco, desce pelo braço direito e acaba no pé direito. Nunca se fecha (o contorno fechado e redondo era o que lia como fantasma). Sem linha do chão. Geometria paramétrica (`contornoZe`).
- **Rosto:** dois olhos de cápsula retos (12,5 por 24, de pé, sem inclinação), bochechas rosa sutis, **nenhuma boca**. Humores pelo formato dos olhos: neutro, atento, contente (os dois olhos em arco) e piscadela. Nunca triste, e nunca olho fechado parado. Abaixo de 72 px o rosto é neutro; as bochechas somem a 32 e 24 px.
- **Flor:** o ponto de luz na ponta do braço direito, amarelo cheio com brilho amarelo (`#ffc53d`), igual de dia e de noite; só a haste muda (tinta de dia, branca à noite). É o único ponto quente.
- **Cor:** a linha é branca (`#ffffff`) nos dois mundos, sobre uma faixa azul piscina (`#39caef`) com o brilho do néon na mesma cor. De dia a faixa afunda para `#0e93b4` a 32 e 24 px, por contraste. Olho: tinta de dia, branco à noite. Os dois mundos da D-D9 (dia "Tinta e marca-texto", noite "Noite de mandacaru") seguem como estão.
- **Tamanhos:** grande, médio, pequeno e mínimo (`data-tamanho`); o tamanho em tela é do CSS da tela. Boas-vindas e Começar: o maior; passos: menor; ele espia por cima da folha em altura baixa e nunca cobre texto.
- **Papel:** não é professor, terapeuta, chatbot, autoridade jurídica nem "IA". Não culpa, não comemora sequência, não faz cara triste por ausência.

**O néon suave** (regra do sistema, D-D10): só em traço que a caneta desenha; acende ao traçar, assenta em 0,6 s, nunca pulsa; uma cor só (piscina); repouso de dia 0 (0,16 no Zé) e de noite 0,30 (0,32 no Zé); nunca em botão, texto, cartão, borda, aba nem ícone parado; o brilho não carrega informação. Técnica única: cópia larga e desfocada do traço (`feGaussianBlur`), nunca `box-shadow` nem `drop-shadow`.

## 9. Movimento e reduced motion

| Momento | Normal | Calmo | Reduzido |
|---|---|---|---|
| Contorno do Zé | desenha de pé a pé em 1,2 s, com o néon aceso; o brilho assenta em 0,6 s | o Zé inteiro esmaece em 0,24 s | inteiro e parado |
| Rosto | olho esquerdo 0,14 s, o direito logo depois, bochechas 0,24 s, piscadela 0,56 s | aparece pronto | pronto |
| Piscar | só nas Boas-vindas: rajadas de 2 ou 3 piscadas dos dois olhos (0,16 s cada, no máximo 3 por segundo), a primeira aos 2,2 s e depois a cada 3,8 a 6,2 s | não pisca | não pisca |
| Luz amarela da mão | só nas Boas-vindas, 10 s sem toque, tecla nem rolagem, depois a cada 14 s, no máximo 3 rodadas de 3 piscadas | um esmaecer lento por rodada | não pisca |
| Cada passo | 0,16 s; o ícone se desenha em 0,42 s com o néon aceso | só esmaece | troca na hora |
| Fim do passeio | o Zé fica contente; o botão tocado leva o traço de seleção com néon | contorno que esmaece | sem traço |

Curva `cubic-bezier(.2, .7, .2, 1)`, transições de 160 a 220 ms. **Exceção declarada à regra de não pulsar** [Gabriel, 28/10]: a luz amarela da mão (decorativa, em rodadas, nunca `infinite`, abaixo de 3 piscadas por segundo, WCAG 2.3.1). Cores forçadas: brilho, faixa, miolo e bochechas somem; traço e olhos em `CanvasText`. **Proibido:** brilho que pulsa sem parar ou cresce; néon permanente em botão, texto, cartão ou ícone parado; luz que segue ponteiro, dedo ou rolagem; boca, balão de fala, voz, cara triste, confete, sequência de dias; o Zé fora da Chegada e da Ajuda.

## 10. Estados e viewports

Telas: Abertura (primeira vez e Dia), Boas-vindas, quatro passos, Começar, passeio refeito, Ajuda e Conta (a linha nova). Viewports: 320×568, 390×844, 768 e 1280; dia e noite; fonte a 200%; Calmo e Reduzido; cores forçadas; sem rede. A 200% e a 320 px o conteúdo rola por dentro da tela e nada se perde; alvos de 44 px; sem rolagem horizontal.

## 11. Restrições de produto, acessibilidade e privacidade

- Local-first: nada do Zé nem do Passeio usa rede; só a tela Entrar fala com o serviço de conta, como hoje.
- **LGPD e segurança:** nenhum dado novo. A única chave é a que já existe (`arretado:escrita-do-nome:v1`: só o Dia da última escrita, no Aparelho). "Rever" não grava. Sem diagnóstico, sem rastreio, sem biblioteca nova, sem HTML de fora.
- O consentimento continua na tela Entrar; o Começar não pede aceite novo.
- A Abertura é decorativa: `aria-hidden`, não prende foco, nunca atrasa um dado; quem usa leitor de tela lê a tela de baixo sem esperar.
- Orçamento de JS [Fato, PR #340]: teto de 600 kB no total e 360 kB no início; o Zé e o Passeio ficam num trecho carregado só na Chegada, fora do início; cada PR informa o tamanho.
- Vocabulário: Aparelho, Dia, Sessão, Norma, Ponto, Cartão, Frase correta; nunca "Dispositivo" para equipamento.

## 12. Critérios de aceite observáveis

1. Nenhuma boca, em tamanho nenhum; olhos retos (sem rotação); bochechas de 40 px para cima e ausentes a 32 e 24 px; nenhum humor triste; a piscadela só com a cápsula aberta e o olho feliz não pisca.
2. Nenhuma linha do chão em tamanho nenhum; o contorno nunca se fecha.
3. Contrastes do Zé medidos em `scripts/contraste.mjs`, nos dois mundos; axe limpo nos dois temas.
4. **Néon:** nenhum seletor `neon` ou `bloom` fora dos CSS dos traços de caneta e dos tokens (`scripts/contraste.test.ts`); nenhuma animação `infinite` nova; o brilho assenta em 0,6 s e o repouso vale 0 de dia (0,16 no Zé) e 0,30 de noite; Calmo mostra só o repouso, esmaecendo; Reduzido, o repouso parado; em `forced-colors: active` o brilho some.
5. Primeira vez: nome 2,64 s, pausa 0,3 s, luz 0,5 s, contorno 1,2 s, rosto 0,6 s; toque, tecla ou "Pular" mostram tudo pronto e o foco vai ao título. Primeira abertura de cada Dia: cerca de 1,8 s e cai no Hoje; segunda no mesmo Dia: nenhuma camada.
6. Boas-vindas com só dois botões ("Vamos" e "Agora não"); a luz amarela pisca só ali, 10 s depois do último toque, no máximo 3 rodadas; nenhum passo tem atalho; todo botão é alcançável a 390, 320 e 200%.
7. "Rever as boas-vindas" e "Passeio pelos menus" não gravam nada (`chegada` e `entrada-do-dia` iguais antes e depois) e terminam em "Concluir".
8. Nada guardado além do Dia; sem rede; sem dependência nova; JS dentro do orçamento.
9. Custo do néon: no máximo 2% dos quadros acima de 33 ms e sem queda de taxa (método do mockup: Abertura inteira, CPU 4× mais lenta, 390×844 a 2×); sem medida em Aparelho real, o PR diz "não medido em Aparelho real".

## 13. Decisões pendentes

1. **O nome do Zé** [Gabriel, 28/10]: aberto. [Marca] Recomenda ficar sem nome na tela por ora; se for dar nome, Caru (de Mandacaru) e, de reserva, Xique. Marca não conferida no INPI.
2. **Alcance do néon** [Marca]: só os cinco traços. Brilho em coisa parada ficou de fora por contraste, calma e "uma ação dominante por tela".
3. **Botões que saem da Chegada:** confirmar com os donos do #320 e do #325 que o diálogo pode perder "Escolher meu concurso", "Ler uma norma", "Registrar um erro" e "Montar a trilha passo a passo" (o estado vazio do Hoje já oferece os começos). Na M3.
4. **Duas portas para refazer o passeio** [Marca]: Conta e Ajuda; se parecer redundante, a Ajuda perde o item.
5. **Tensão com o #331:** a Abertura do Dia é uma espera diária; se pesar no uso, a constante `FREQUENCIA` a devolve ao cabeçalho.
6. **Piscar e luz amarela:** só no Chromium, amostrados a cada 20 ms; falta conferir num Aparelho real, com leitor de tela (VoiceOver e TalkBack) e no Safari (filtros de desfoque e `stroke-dashoffset` juntos).
7. **Juiz:** os juízes do desenho foram modelos, em imagens de exploração; o juiz de verdade é o Gabriel. Se o Zé ainda ler "fantasminha", o próximo ajuste são duas costelas finas no tronco, não o rosto.
