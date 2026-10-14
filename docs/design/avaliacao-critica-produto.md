# Avaliação crítica de design de produto — 14/10/2026

Base: `integracao` em `a620cd9` (inclui #120, #122, #123). Método: leitura do código das telas (`src/apresentacao/`), do spec do redesign, do plano-mestre e de `docs/planos/f3-pacotes.md`. **Não** foi feita revisão visual renderizada nem teste com pessoas: o que depende de ver a tela está marcado *a verificar*. Critério: os princípios do spec (§2: uma coisa em destaque, agora/depois, poucas etapas, sem ruído, recompensa discreta) e as regras do `CLAUDE.md` (sem rótulo clínico, sem culpa, nada obrigatório).

Severidade: **Alta** = fere um princípio ou o critério de sucesso (começar em ≤2 toques/10 s); **Média** = atrito ou inconsistência real; **Baixa** = acabamento.
Dono: **UI** = thread "Ajuste de UI" (estilos, tokens, `AcaoAgora`, Hoje/Sessão visual) → só proposta. **Livre** = ninguém edita hoje.

## 1. Resumo (o que mais importa)

1. **Caminho até o primeiro cartão tem 4 toques.** Hoje › Começar → Sessão › Começar → Sessão atual › "Abrir a revisão" → Revisar › "Mostrar resposta". O critério do redesign é 2 toques e 10 s. (A-1)
2. **O botão Registrar erro do topo era primário e disputava com o "Agora".** (N-1; a duplicação com o "+" no celular que eu havia apontado não existe, ver N-2)
3. **O leitor tem 5 botões de mesmo peso fora do foco**, e a ação de progresso mais importante ("Lido até aqui") é igual às outras. (L-1)
4. **O "Errei" usa borda de perigo (vermelho)**, contra "sem vermelho punitivo" (plano-mestre §72). (R-2)
5. **Dois vocabulários para o mesmo gesto** (Errei/Difícil/Fácil nos cartões; Li/De novo nas frases) e **duas telas de revisão** que o usuário precisa escolher. (R-3, R-4)
6. **Itens planejados** (onboarding, contas, backup, IA) têm riscos de desenho já previsíveis; ver §6 com regras para cada um antes de implementar.

## 2. Menus e navegação (Shell)

| # | Elemento | Problema | Sev. | Sugestão | Dono |
|---|---|---|---|---|---|
| N-1 | Botão **Registrar erro** no topo, classe `principal`, em todas as telas | Segundo ponto de maior peso visual da tela; compete com o `AcaoAgora` (princípio 1). No Drill e no leitor, onde o foco é outro, ainda aparece (no foco some, ok) | Alta | Rebaixar a `botao` neutro/discreto no desktop; no celular, remover do topo (fica só o "+"). A captura continua a 1 toque pelo "+" e pela tecla E | UI |
| N-2 | **"+ Erro" (topo) e "+" flutuante** | **Correção (14/10):** no celular (≤699 px) o botão do topo já é ocultado (`estilos.css` ~1777); a duplicação só existe entre 700 e 899 px, onde o "+" não aparece. Sem problema real | — | Nada a fazer | — |
| N-3 | Topo com 7 alvos (marca, 4 áreas, Registrar, Ajuda, Conta) no desktop | Áreas + ações no mesmo nível visual; "Ajuda" e "Conta" são rótulos de texto soltos | Média | Áreas à esquerda, ações à direita; Conta como ícone de pessoa com rótulo acessível (prepara a F4-A: ali vai o estado de sincronização). Ajuda continua texto até haver ícone consistente | UI |
| N-4 | **Menu Ajuda** com 2 itens | Correto e leve. "Relatar problema" some dentro do menu (bom: não é do estudo). Fecha em Escape/clique fora (ok) | — | Manter. Falta anunciar o menu como `role="menu"` ou mantê-lo como disclosure; hoje é disclosure, aceitável | — |
| N-5 | **Rodapé legal** longo em toda tela (`RODAPE`, D6) | Parágrafo de 2 linhas em cada tela, inclusive em Revisar e no leitor; ruído permanente (princípio 4) | Média | Rodapé de uma linha ("Seus dados ficam neste aparelho · Dados") com o texto integral em Conta › Dados e na primeira abertura. **Muda o D6: decisão do Gabriel** | Gabriel |
| N-6 | **Barra inferior** com 4 áreas (≤899 px) | Boa para o polegar. Rótulos sem ícone; "Biblioteca" é o mais longo e aperta em 320 px *(a verificar)* | Baixa | Ícones simples + rótulo; testar 320 px | UI |
| N-7 | **Skip link** e foco do `#conteudo` | Correto | — | Manter | — |
| N-8 | Atalho global **E** | Útil, mas invisível; só no `title` do botão | Baixa | Citar na primeira Orientação e no menu Ajuda ("Atalhos") | Livre |

## 3. Hoje, Sessão e Plano (itens e botões)

| # | Elemento | Problema | Sev. | Sugestão | Dono |
|---|---|---|---|---|---|
| A-1 | **Fluxo Começar** (`rotaDeInicio` → `/sessao/iniciar` → `/sessao/atual` → "Abrir a revisão") | 4 toques até o primeiro cartão; "Começar" aparece duas vezes seguidas com o mesmo rótulo; `Atual` exige um link manual "Abrir a revisão" mesmo com alvo definido | Alta | Quando a ação vem do Hoje (alvo conhecido), **iniciar a Sessão já na rota do Agora e ir direto ao alvo** (revisão/leitor). A Sessão vira uma faixa mínima ("Sessão · Pausar · Encerrar") no topo do Drill/leitor. `/sessao/iniciar` fica só para "Sessão livre" e para quem quer dizer "até onde" | UI + A-sessão |
| A-2 | **`Iniciar`**: bloco `<details>` "Dizer o que e até onde (opcional)" | Bom (tudo opcional). O "até onde" é útil, mas escondido num `details` com rótulo longo | Baixa | Rótulo curto: "Definir até onde" | Livre |
| A-3 | **`Atual`** | "Pausada. Sem pressa" é bom (sem culpa). "Pausar" e "Encerrar" têm o mesmo peso; "Encerrar" leva a outra tela | Média | Pausar neutro, Encerrar discreto; confirmar nada. Quando houver temporizador, ele só informa (já é a regra) | UI |
| A-4 | **Mascote 96 px em todo `AcaoAgora`** (Hoje e início do Recall) | Decisão D-D2: mascote só em pontos estratégicos. Aparece em toda ocorrência do cartão, inclusive repetido em duas áreas | Média | Mascote só no Hoje (primeira dobra) e em estado vazio/conclusão; `AcaoAgora` ganha prop `mascote?` (padrão off) | UI |
| A-5 | **"Escolher outra coisa"** | Bom (saída sem culpa). O link fica solto sob o cartão e perde a escolha ao recarregar (estado em memória) | Baixa | Manter; guardar a dispensa só na sessão do navegador do dia | Livre (A1) |
| A-6 | **Plano atual** diz "mudar faixas e receber sugestão chega numa próxima fase" | Texto de roadmap/fase dentro do produto | Média | Trocar por uma frase de uso ("Os pontos servem para ligar seus erros ao edital.") até B3 chegar | Livre |
| A-7 | **Plano**: faixa "Altíssima/Alta/Média/Extra" como marcador por ponto | Ordem visual de prioridade em lista longa vira "parede de rótulos" *(a verificar com 300+ pontos)* | Média | Agrupar por disciplina recolhida; faixa só no detalhe do ponto; a lista mostra o status | Livre (B3) |
| A-8 | **Hoje**: ordem Retorno → Agora → Revisões → Depois → Captura | Boa (retorno sem culpa primeiro). `Captura` e `Depois` ainda vazios | — | Manter. `Depois` (B4) deve ser uma linha, não uma lista | — |

## 4. Recall (Revisar, erros, frases, cartões)

| # | Elemento | Problema | Sev. | Sugestão | Dono |
|---|---|---|---|---|---|
| R-1 | **Início do Recall**: `AcaoAgora` + `DiasDaSemana` + aviso de fila + 4 abas + lista | A lista de erros abaixo da ação diluiu o "uma coisa só" quando há erros | Média | Fora do primeiro uso, mostrar só Agora + Depois + "Ver erros, frases, cartões" (as abas) recolhidas; a lista abre sob demanda | Livre |
| R-2 | **Botão "Errei" com `border-color: var(--perigo)`** (`estilos.css` 2226) | Vermelho em cima do erro do aluno: punitivo; cor como único diferencial, embora haja ✕ e texto | Alta | Os três botões com a mesma borda neutra; ênfase só por posição e texto/ícone. Opcional: "Errei" em cor de ênfase suave (âmbar do tema), nunca vermelho | UI |
| R-3 | **Dois vocabulários**: Errei/Difícil/Fácil (cartões) × Li/De novo (frases) | O mesmo gesto com dois nomes; o aluno reaprende | Média | Unificar: "De novo / Bom / Fácil" ou manter dois verbos só se a ação for de fato diferente (frase: sobe um degrau; cartão: 3 níveis). Se diferente, explicar na ajuda | Gabriel (decisão de texto) |
| R-4 | **Duas revisões** (`/recall/revisar` e `/recall/frases/revisar`) com botão "Revisar frases (n)" | O aluno decide entre dois fluxos antes de estudar (carga de decisão) | Média | Uma fila "Revisar" que alterna os dois tipos (frases curtas primeiro como aquecimento), com o Agora dizendo o total. Telas de revisão continuam separadas por dentro | Livre + Gabriel |
| R-5 | **Drill**: "Sair" no topo, "Mais opções" no fim | Sair longe do polegar; `Mais opções` (suspender, editar, abrir erro) bem recolhido | Baixa | Manter "Sair" no topo (ação rara); ok | — |
| R-6 | **Drill**: `LinhaDepois` "você diz como foi" | Texto de instrução sem valor depois da primeira vez | Baixa | Mostrar só "mais N nesta rodada"; a instrução vai para a primeira revisão | Livre |
| R-7 | **Barra fina** no Drill | Progresso discreto, correto. Falta o fim de rodada com um fechamento curto (recompensa discreta) *(a verificar o texto atual)* | Baixa | "Rodada feita. Depois: …" + mascote só aqui | UI |
| R-8 | **RegistrarErro** (2 campos obrigatórios; `CamposErro` 284 linhas) | Cumpre a D25; o risco é o formulário crescer com "facultativos" | Média | Manter a frase correta sozinha na primeira tela; o resto num único "Mais detalhes" | Livre |

## 5. Biblioteca e leitor

| # | Elemento | Problema | Sev. | Sugestão | Dono |
|---|---|---|---|---|---|
| L-1 | **Barra do leitor**: Buscar, Filtrar, Ações, Modo foco, Lido até aqui (+ "Voltar a …" quando há remissão) | 5 botões de mesmo peso (`Leitor.tsx` ~2076–2130). A ação de progresso ("Lido até aqui") não se destaca | Alta | "Lido até aqui" fixo na zona do polegar e primário; Buscar+Filtrar viram um "Procurar"; Ações em "⋯"; Modo foco continua visível | UI (Leitor é grande: coordenar com arquitetura) |
| L-2 | **Modo foco** | Bom: some navegação e "+" (`data-modo-foco`), centra o cartão do artigo | — | Manter. Garantir o caminho de saída por toque no celular (não só F/Esc) *(a verificar)* | — |
| L-3 | **`<h1>` oculto** no leitor | Correto para leitores de tela | — | Manter | — |
| L-4 | **Normas** (`Normas.tsx`): três atalhos "Importar", "Acervo da norma", "Tudo do edital" no estado vazio | Três caminhos de entrada com igual peso no primeiro uso *(a verificar)* | Média | Um primário ("Baixar do acervo"), os outros em "Outras formas" | Livre |
| L-5 | **Acervo / Importar / RevisaoDoRascunho** (784 e 696 linhas) | Fluxos de especialista expostos ao usuário comum. Importar é para o Gabriel; o produto futuro precisa esconder | Média | Marcar como "Avançado" e esconder por perfil; o usuário novo só vê acervo/catálogo | Livre + Arquitetura |

## 6. Transições, estados e microinterações

| # | Elemento | Problema | Sev. | Sugestão |
|---|---|---|---|---|
| T-1 | **Sem transição de rota nem de cartão** (só `pulsar` do esqueleto e `penumbra-entra` do foco; `prefers-reduced-motion` respeitado) | Troca seca entre Hoje → Drill → próximo cartão não confirma que algo mudou; para quem se distrai, o salto é neutro, não ruim | Média | Transição de ≤150 ms (opacidade) entre cartões e na troca de rota, via View Transitions API quando existir; desligada por `prefers-reduced-motion` e pelo perfil "Calmo". Nunca animar texto da lei |
| T-2 | **Feedback de conclusão** | Hoje só texto em `role="status"` | Baixa | Marca estática (✓ + frase curta) por 2 s; sem confete (regra do spec) |
| T-3 | **Esqueleto** com `pulsar` infinito | Piscar contínuo contraria "nada pisca" | Média | Sem animação além de 1,2 s; depois, estático. Em "Calmo", estático desde o início |
| T-4 | **Falhas** (`Falha`, `Vazio`) | Bom padrão ("o quê / o que fazer"). Verificar se todas as telas usam | Baixa | Auditar `grep "role=\"alert\"" ` e uniformizar |

## 7. Itens planejados: regras de desenho antes de implementar

**B2 Onboarding do plano**
- Uma pergunta por tela, `BarraFina` ("2 de 4"), **Voltar sempre**, **Pular sempre** (cai em carreira genérica).
- Resultado imediato: a última tela é o "Comece por aqui", não um resumo de configuração.
- Disciplinas pré-marcadas, assuntos recolhidos; rótulo honesto "baseado no edital X de AAAA"; nada de "Altíssima" aqui.
- Salvar a cada tela (fechar o aplicativo no meio não perde nada) e retomar de onde parou, sem culpa.
- Nenhuma pergunta que revele diagnóstico; "o que mais atrapalha?" só com opções de comportamento e opcional.

**B3 Pontos / B4 Tarefas**
- Status e prioridade são campos diferentes e aparecem em lugares diferentes; atividade nunca vira "dominado".
- "Depois" = uma linha. Sugestão sempre com "por quê" e botão "não agora" (some, sem registrar falha).

**F4-A Contas e sincronização**
- Conta é **opcional** e a primeira vez que aparece é depois de valor entregue (não na abertura). Local-first intacto.
- Estado de sincronização como indicador pequeno no ícone de Conta: "Salvo neste aparelho" / "Sincronizado às 14:20" / "Sem conexão: nada se perde". Nunca vermelho; a falha vira texto com ação.
- Conflito: mostrar a escolha em linguagem de estudo ("esta versão tem 3 erros novos") e nunca descartar sem cópia.

**Backups**
- Já existe Exportar (Conta › Dados). Falta **lembrete discreto**: no Hoje, uma linha única após N dias sem backup ("Faz 9 dias do último backup · Fazer agora"), dispensável por 7 dias. Nunca bloqueia.
- Ação em um toque + confirmação do que foi guardado e onde (arquivo ou nuvem).

**Integração de IA**
- Sem chat vazio na abertura (plano-mestre). IA aparece **no contexto**: "Sugerir frase" no erro, "Resumir o artigo" no leitor, "Explicar" no cartão.
- Sempre **rascunho para aprovar**: o resultado entra com selo "sugerido por IA" (`origemTipo: ia` já existe) e só vira cartão/frase se o aluno aceitar.
- Transparência: antes do primeiro uso, tela única com o que sai do aparelho; desligável em Conta; funciona sem IA.
- Estado de erro/fora do ar: cai para o fluxo manual sem mensagem alarmante.
- Custo e limite visíveis só quando relevantes ("restam 8 hoje").

## 8. O que não mexer / já está certo

- Cartão Agora + Depois, retorno sem dívida, cota diária e "nada é apagado", dias da semana que não zeram.
- Modo foco (sem navegação, escuro, esmaecimento, penumbra de 200 ms).
- Alvos de 44 px, skip link, axe nos dois temas, `prefers-reduced-motion`.
- Conta com descrição de uma linha por item.

## 9. Proposta de implementação (pequena, sem colisão)

| Passo | Mudança | Arquivos | Colisão |
|---|---|---|---|
| P-1 | A-6 (texto do Plano), A-2, R-6 | `plano/Plano.tsx`, `sessao/Iniciar.tsx`, `recall/Drill.tsx` (só texto) | Pedir ok da arquitetura; nenhum em PR aberto *(verificar)* |
| P-2 | N-8 (atalho listado em Orientações) | `orientacoes/conteudo.ts` (só acréscimo) | Nenhuma |
| — | N-1, N-2, A-1, A-3, A-4, R-2, L-1, T-1, T-3 | `Shell.tsx`, `estilos.css`, `AcaoAgora.tsx`, `Leitor.tsx`, `hoje/rota-de-inicio.ts` | **Proposta para a UI/arquitetura**; nada feito aqui |
| — | N-5, R-3, R-4, L-4/L-5 | decisão do Gabriel | — |

Nenhuma decisão D1–D25 é reaberta, exceto N-5 (muda D6) que depende do Gabriel.
