# Curso de ação — um caminho só

> **Arquivado em 13/10/2026.** Vale o [`plano-mestre.md`](../plano-mestre.md); este texto é só histórico.

Decidido com o Gabriel em 09/10/2026. Junta a F2 em execução, o redesign ([`redesign.md`](redesign.md), spec em [`../superpowers/specs/2026-10-09-redesign-arretado-design.md`](../../superpowers/specs/2026-10-09-redesign-arretado-design.md)), a F3, a F4 e a decisão de cobrar. Onde este documento e outro plano divergirem, vale este (a lista do que muda em cada plano está em "Mudanças nos outros planos").

## Em uma frase

Primeiro a cara nova (cores, fontes, casca), depois a leitura artigo por artigo, depois o Recall em 1 toque; o resto da F2 e a F3 vêm em seguida; só depois da F3 outras pessoas testam, e só depois disso se decide cobrar.

## Atualização de 10/10/2026 — programa do acervo (vale no lugar das linhas 7, 10 e 12 da linha do tempo)

Decidido com o Gabriel em 10/10/2026. Desenho: [`superpowers/specs/2026-10-10-acervo-sumulas-teses-design.md`](../../superpowers/specs/2026-10-10-acervo-sumulas-teses-design.md). Plano: [`superpowers/plans/2026-10-10-acervo-sumulas-teses-plano.md`](../../superpowers/plans/2026-10-10-acervo-sumulas-teses-plano.md). A reconferência dos gabaritos deixa de ser etapa e vira **rotina de estudo** (o Gabriel lê e registra erro pelo registro de erro da plataforma). A etapa 12 (importar por URL) e a atualização pelo aparelho (6b) ficam depois.

Ordem, cada item um branch e um PR: **1** estrela discreta (feita em 10/10/2026); **2** palco do modo foco (feita em 10/10/2026, sem commit);  **3** acervo de normas com disciplinas (sobe o esquema v3 para v4: backup antes do merge); **fatia 5 do redesign** (Conta e acabamento; a primeira experiência usa o acervo); **4** súmulas; **5** teses; **6** atualização 6a (versão nova vinda do acervo). Depois, como já estava: etapa 12 e 6b, etapa 10 e 11.7, `/code-review` das etapas 8, 9 e 11, etapa 13 e portão da F2, F3, validação, F4 e decisão de cobrar.

## As próximas 3 etapas (em linguagem simples)

**Em destaque: Etapa A — cores e fontes novas.**

| | O que é | O que você ganha | Passa para a próxima quando |
|---|---|---|---|
| **A** (agora) | Fatia 1 do redesign: papel esverdeado, marca-texto como único acento, tema escuro mais calmo, fontes novas embutidas | O app inteiro com a cara nova, sem mudar nenhum botão de lugar | `npm run check` e E2E verdes; script de contraste sem reprovados; as fontes carregam sem rede; você olha as capturas (Recall, Biblioteca, leitor, claro e escuro) e aprova |
| **B** | Fatia 2: barra inferior no celular e no tablet, botão **+** flutuante, componentes "Agora" e "Depois", mensagens de vazio e de falha com voz nova | Uma coisa em destaque por tela; navegar com o polegar | Os 3 aparelhos sem quebrar nada; o grupo fixo do leitor (Buscar, Filtrar, Ações, Foco) sem colidir com a barra e o **+**; você aprova as capturas |
| **C** | Atividade 11.8 da F2: ler artigo por artigo no modo foco, vizinhos esmaecidos | Estudar a lei um artigo por vez, sem o resto disputando o olho | E2E nos 3 tamanhos; axe com o esmaecido já sobre as cores novas; "lido até" avança sozinho e nunca recua |

Depois da C: Fatia 3 (Recall em 1 toque, cota de 10, dias dos últimos 7).

**Regra que fura a fila:** relato de problema do uso das férias vira sessão curta de correção antes de qualquer etapa.

## Linha do tempo

| # | Etapa | Entrega para o Gabriel | Depende de | Esforço |
|---|---|---|---|---|
| 1 | **Fatia 1** — fundação: tokens, temas, fontes (T19) | Identidade nova em tudo | `main` atualizado | 1–2 sessões |
| 2 | **Fatia 2** — componentes e casca | Barra inferior, **+**, "Agora/Depois", voz nova | 1 | 1–2 |
| 3 | **11.8** — artigo por artigo | Leitura de um artigo por vez | 2 | 1–2 |
| 4 | **Fatia 3** — Recall: começar em 1 toque, cota, dias | Revisão em até 2 toques; fila sem culpa | 1, 2 | 1–2 |
| 5 | **11.9** + **Fatia 4** — remissões e leitor/Biblioteca | Prévia de "art. X"; "Continuar leitura" como ação principal; régua opcional | 3 (11.8), 4 (11.8 e 11.9) | 2–3 |
| 6 | **Fatia 5** — Conta e acabamento | Primeira experiência, voz revisada, roteiro da validação pronto | 1–5 | 1–2 |
| 7 | **Reconferência dos gabaritos** (CP, ECA, CDC, CF), amostra do colar real, tempo do CP no celular | Fecha pendências de dado | Você | ~1 h por norma |
| 8 | **Etapa 10** (revisão do rascunho e editor) e **11.7** (corrigir texto publicado) | Corrigir lei importada sem recolar | 7 | 4–6 |
| 9 | `/code-review` das etapas 8, 9 e 11 | Achados corrigidos | 8 | 1–2 |
| 10 | **Etapa 12** (importar por URL) | Colar vira "digitar o endereço" | Corre por fora; 12.3 depende da 9.5 (feita) | 3 |
| 11 | **Etapa 13** e **portão da F2** | 2 semanas lendo lei no Arretado | 8–10, gabaritos `conferida` | 2 + uso |
| 12 | **F3** — Hoje, Dia, Sessão, Plano, com as 3 alavancas adiadas (estacionamento de distração, fechar o dia, temporizador) | A tela Hoje com um "agora" só | Portão da F2 (regra do `CLAUDE.md`) | a planejar |
| 13 | **Validação** com 3 a 5 pessoas, 1 semana | Evidência de fora | 12 | — |
| 14 | **F4** — login, sync, PWA, exclusão de conta | Dados fora do aparelho, com segurança | 13 | a planejar |
| 15 | **Decisão de cobrar** | Sim, não ou ajustar | 13, 14 e os pré-requisitos abaixo | — |

O portão da F1 (14 dias com revisão em pelo menos 10) segue sendo medido durante tudo isso. A fatia 3 muda o Recall no meio da medição: a linha de base da 1.1 registra o dia da mudança.

## Dependências que não estavam escritas

1. **11.8 depende de contraste medido contra o fundo novo.** Por isso vem depois da fatia 1.
2. **Casca e leitor dividem o canto da tela.** A 2.5 precisa tratar o grupo fixo do leitor, o **+** e a barra inferior juntos; a barra some no modo foco como o cabeçalho some hoje.
3. **Literata muda a altura das linhas do leitor virtualizado.** A 1.7 repete os E2E do leitor (posição lembrada, abertura abaixo de 1 s, "Ir para") antes do PR.
4. **A cota usa o que já existe.** `LIMITE_FILA_DIARIA = 40` continua como aviso; a cota de 10 é outra coisa (quanto aparece por vez).
5. **Fatia 4 só implementa o que a 11.8 e a 11.9 não fizeram** (régua, Literata, "depois", "Continuar leitura" como `AcaoAgora`).
6. **Portão da F2 exige os 4 gabaritos `conferida`** e a etapa 10 (13.4 e F2.md, critérios do portão). Por isso a reconferência (7) tem data marcada no caminho, não "sem pressa".
7. **Cobrar exige F4.** Sem login e sincronização, o dado fica num navegador só.

## O que saiu do caminho

- **Nada de nova subida de esquema** em todo o redesign.
- **F3 não antecipa nada** no código: as 3 alavancas adiadas só entram nela.
- **11.9 pode ser cortada** se o tempo apertar; a fatia 4 não depende dela para funcionar, só para não duplicar (item 5 acima).
- **Etapa 12** não bloqueia nada do redesign nem a validação; fica por fora e entra quando houver sessão livre antes da 13.
- **Itens 5.4 e 5.5 do redesign** (documentos e roteiro) deixam de esperar a fatia 5: o texto da direção entrou neste PR; o roteiro pode sair antes, sem código.

## Decisões (Gabriel, 09/10/2026)

| # | Decisão | Escolha |
|---|---|---|
| 1 | Ordem entre F2, fatias e F3 | Fatias 1→2, 11.8, fatia 3, 11.9 + fatia 4, fatia 5; depois reconferência, etapa 10, 11.7, 13, portão, F3 |
| 2 | Seis ajustes à spec | Aprovados como estão em `redesign.md` |
| 3 | Cota de revisão | Preferência opcional, padrão 10, faixa de 5 a 100; a fila nunca é cortada nem reordenada |
| 4 | Validação com outras pessoas | **Só depois da F3** (não depois da fatia 5) |
| 5 | Documentos | Direção de produto no `CLAUDE.md` e no `README.md` neste PR; T19 registrada na fatia 1 (1.8), depois de conferir pacote e licença |
| 6 | Antes de cobrar | Os quatro itens abaixo, e a regra de comunicação |

**Consequência da decisão 4:** o redesign e a F3 ficam meses sem evidência externa. Risco aceito. Mitigação: o roteiro de validação (5.5) fica pronto antes, e a linha de base de uso do próprio Gabriel (1.1) é a única medida até lá. Se a F3 demorar mais que o esperado, rever esta decisão.

### Antes de cobrar (todos obrigatórios)

1. **Termos de uso e política de privacidade**, revisados por pessoa habilitada. A política v2 já está prevista na 13.1 e na F4.
2. **Diagnóstico nunca é perguntado nem guardado.** TDAH, autismo e outros transtornos são orientação interna do produto, não campo, filtro, rótulo nem dado. Sem telemetria de conteúdo, sem promessa clínica.
3. **Material de terceiros** (editais, questões, resumos) verificado caso a caso. Leis do Planalto são públicas; o resto não se presume.
4. **F4 pronta:** login, sincronização e exclusão de conta em cascata.

### Regra de comunicação (Gabriel, 09/10/2026)

O produto precisa ser sedutor **sem depender de diagnóstico**. A fala pública parte do comportamento, não do rótulo. Exemplos aprovados como ponto de partida:

- "Você tem dificuldade de concentração?"
- "Suas sessões de estudo falham depois de alguns dias de empolgação?"
- "Enquanto você estuda, fica pensando em outras coisas?"
- "Sempre em dúvida por onde começar?"

Nunca: "para quem tem TDAH", "trata", "melhora o diagnóstico". As quatro perguntas servem de texto de abertura; o app não pede resposta a elas.

## Mudanças nos outros planos

| Documento | O que muda | Quando |
|---|---|---|
| `redesign.md` | Cabeçalho: ajustes aprovados em 09/10/2026. "Ordem" passa a: 1, 2, 11.8, 3, (11.9 + 4), 5. Em 5.4, tirar `CLAUDE.md`/`README.md` (feitos); em 1.8, T19 fica aqui. "Depois da fatia 5": validação só após a F3 | Neste PR |
| `F2.md` | Em "Ordem e paralelismo": uma linha apontando para este documento; a 11.8 passa a vir depois das fatias 1 e 2 | Neste PR (uma linha) |
| `CLAUDE.md` | "O que é este repositório" com a direção de produto; regra de dados sensíveis; este plano na leitura sob demanda | Neste PR |
| `README.md` | Parágrafo de abertura com a direção de produto | Neste PR |
| `proxima-sessao.md` | Nova ordem no topo (próxima: fatia 1, não a 11.8) | Neste PR |
| `decisoes-tecnicas.md` | T19 (fontes embutidas) | Fatia 1, atividade 1.8 |
| `glossario.md` | `AcaoAgora`, `LinhaDepois`, `DiasDaSemana`, `BarraFina`, cota | Fatias 2 e 3 |
| Parte 1 §15 (F3) | Nada agora. Ao planejar a F3, incluir estacionamento de distração, fechar o dia e temporizador | Planejamento da F3 |

## Riscos do conjunto

| Risco | Mitigação |
|---|---|
| Quatro frentes (F2, redesign, F3, F4) para uma pessoa; plano se arrasta | Sempre uma etapa em destaque; este documento lista só 3 à vista |
| Fatia 3 mexe no Recall durante a medição do portão da F1 | Registrar o dia da mudança na linha de base |
| Meses sem teste externo | Roteiro pronto antes; rever a decisão 4 se a F3 atrasar |
| Fontes e cores quebram o leitor (posição, desempenho, contraste) | 1.2, 1.6 e 1.7 com o E2E do leitor repetido |
| Comunicação resvalar para diagnóstico | Regra de comunicação acima, no `CLAUDE.md` |
