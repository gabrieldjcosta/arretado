---
name: brag-arretado
description: >
  Mostrar o Arretado a quem não o conhece: guia de ferramentas, texto da tela
  de primeiros passos e roteiro de vídeo de demonstração, todos a partir de um
  só inventário. Usar quando pedirem guia, tutorial, instruções iniciais,
  "o que o app faz", vídeo, demo ou divulgação. Adaptada do /brag (MIT).
license: MIT
argument-hint: "[guia|primeiros-passos|video] [foco]"
---

# Brag Arretado

Uma fonte, três saídas. Nada se escreve sobre o app sem sair do inventário.

**Fonte única:** `mapa-de-ferramentas.md` (`/mnt/project-files/produto/`; §2 inventário com arquivo:linha, §3 ligações, §4 atritos). Antes de qualquer saída: confira a base (commit) no cabeçalho dele contra `origin/integracao`. Se divergir, atualize o mapa primeiro (regra de manutenção do próprio arquivo) ou avise a defasagem na entrega.

## Leis (valem para as três saídas)

Herdadas do /brag, trocando "lançamento" por "estudo":

1. **Só o que existe.** Cada afirmação aponta uma linha do inventário. Ferramenta em PR aberto ou planejada não entra como pronta; marque "em breve" ou deixe de fora. Nunca prometer resultado de aprovação ou de nota.
2. **Mostrar a coisa.** Usar a interface real (capturas semeadas, componentes reais), não maquete. Rótulos exatos da tela, entre aspas.
3. **Estranho entende em uma leitura.** Quem nunca viu o app sabe o que ele faz, para quem é e qual o primeiro toque. Começar pela ação ("Escolher meu concurso"), não pela arquitetura.
4. **Específico.** Texto que só serve a este app. Vetado: "otimize seus estudos", "turbine", "revolucione".
5. **Curto.** Cada ferramenta cabe em uma linha de "para quê" e uma de "como chegar". Sem tela que explique tela.
6. **Dados reais nunca.** Mostrar erros, normas e Frases de exemplo evidentemente fictícios; nada do aparelho do Gabriel, de contas, e-mails, chaves ou URLs internas. Dizer no plano que são exemplos.
7. **Gerar e revisar são passos distintos.** Depois de escrever, conferir cada rótulo contra o código (`git grep`) e cada passo contra o app rodando.

## Regras do Arretado (CLAUDE.md prevalece)

- **Sem rótulo clínico.** Nunca "TDAH", "autismo" nem promessa de tratamento. Falar do comportamento: "dificuldade de concentração", "não sei por onde começar".
- **Vocabulário:** Aparelho, Problema (falha do app), Erro (só estudo), Dispositivo (só da lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- **Tom:** convidar, nunca cobrar. Proibido o que soa a dívida ("Você parou em…", "atrasado"); usar "Continuar", "Retomar". Voz regional ("danado") só se já estiver na interface, no máximo uma vez.
- **Local-first:** dizer que funciona sem rede e que os dados ficam no Aparelho; não vender sincronização que ainda não existe.
- Passar todo texto pela skill `humanizer`. Ter a skill `ponytail` ativa; `impeccable`/`bunshin` só quando a saída for tela ou vídeo.

## Saída 1: guia de ferramentas (`guia`)

Entrega: `docs/guia/ferramentas.md` (ou o caminho pedido), por área do mapa (Hoje, Trilha, Fixar, Biblioteca, Sessão, Conta).

Por ferramenta: **Nome exato** · para quê (1 linha) · como chegar (aba > botão) · quando usar (1 linha). Ordem: o que a pessoa faz no 1º dia, depois o resto. Fecha com "O que ainda não existe" tirado dos achados abertos do §4. Sem links para rotas internas no texto; sem arquivo:linha (isso fica no mapa).

## Saída 2: tela de primeiros passos (`primeiros-passos`)

**Não construir tela nova nem duplicar a Chegada.** A Chegada é dona da UI (PR #320, thread "Criar tutorial da primeira abertura"). Esta skill só fornece e confere o **conteúdo**:

- ≤ 5 linhas visíveis, uma ação principal, "Agora não" sempre presente, nunca empilhada sobre outra folha (Entrada do Dia, Retorno).
- Cada linha = um rótulo real de aba ou botão + um verbo. Sem texto sem controle correspondente na tela.
- Marca "visto" só depois de a pessoa ver de fato (regra do #313).
- Entregar como texto + tabela rótulo → rota → arquivo, para a thread da Chegada colar. Mudança de UI vai para a Marca revisar.

## Saída 3: vídeo de demonstração (`video`)

Só quando o fluxo estiver estável (fim da onda 1 do mapa). Antes, entregar apenas roteiro.

- **Propósito primeiro** (do issue #69 do brag): demonstração nova, material de ensino ou regravação de algo existente. Para ensino, gravar o app de verdade; não reconstruir tela.
- **Roteiro** `roteiro.md`: gancho (2 s, a dor: "não sei por onde começar") → 2–3 momentos reais (abrir → tocar em "Começar" → resultado) → fecho. 15–30 s por vídeo; um vídeo por ferramenta, não um tour.
- **Captura:** Playwright do repo (`executablePath: /opt/pw-browsers/chromium`, `vite preview --port 4173`), 390×844 para celular; semear `arretado:chegada:v1` e `arretado:entrada-do-dia:v1`. Desligar transições do CSS reaproveitado; tirar quadros de transição pelos tempos da linha do tempo, não a olho.
- **Vertical 9:16:** texto legível entre ~13% e 80% da altura e fora dos 140 px da direita na metade de baixo (sobreposições de Reels/Shorts/TikTok).
- **Legendas sempre**, falado opcional. Texto que se lê fica inteiro ~0,3 s por palavra.
- **Conferir após renderizar:** nº de quadros = duração × fps; pôster no quadro 0 substituindo (não somando) um quadro; nenhum quadro com dado real.
- **Trilha:** nada de música de terceiros do brag. Sem trilha, ou licenciada e registrada em `docs/licencas`.
- **Texto de divulgação:** 1–3 frases, específicas, sem "animado para compartilhar". Oferecer, nunca publicar sozinho.

## Entrega

Dizer onde está o arquivo, a base do inventário usada, o que ficou de fora por não existir, e o que o Gabriel precisa decidir (em cartão de opções, recomendada marcada). Se o trabalho gerou orientação reutilizável, acrescentar ao `guia/ORIENTACOES.md`.

## Origem

Estrutura e leis criativas adaptadas de `/brag` (latent-spaces/brag, MIT, © 2026 Shunit Haviv Hakimi); ideias adicionais dos PRs abertos #18, #32, #65, #66, #68 e dos issues #23 e #69. Nenhum código ou arquivo de áudio do brag foi copiado. Aviso de licença em `NOTICE-brag.md`.
