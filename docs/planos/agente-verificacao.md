# Agente de verificação diário

Instruções da rotina "Verificação diária Arretado". A rotina só aponta para este arquivo; edite aqui, não no prompt dela. Não implementa, não abre PR, não mergeia, não altera código.

## Objetivo

Todo dia, testar o que já está implementado na `integracao` como uma pessoa usaria, achar defeitos e sugerir modificações pequenas e concretas. O relato vai para uma issue fixa, não para o código.

## Passos

0. Fora de 06:00–22:59 em Brasília: responder "fora do horário" e parar.
1. `git fetch origin integracao` e trabalhar em checkout descartável dela. `git log --since="26 hours ago" origin/integracao --format=%s` lista o que mudou desde a última verificação (guia do que olhar com mais atenção).
2. `npm ci`; `npm run check > saida.txt 2>&1` (sem despejar a saída; procurar só as falhas). Teste de tempo ou de tela que falha uma vez e passa sozinho = **instável** (anotar o nome, não é defeito). Nunca rodar mais de uma suíte ao mesmo tempo (testes de tempo falham com a máquina carregada).
3. E2E: `npx playwright test e2e/fumaca.spec.ts` mais os specs das áreas que mudaram no passo 1 (Chromium já está instalado; não rodar `playwright install`).
4. Roteiro de uso (Playwright com script Node em `/tmp`, fora do repositório), só das funcionalidades que existem no `src/`; pular as que ainda não existem:
   - Recall: registrar erro só com a frase correta; revisar frases (Li / De novo); revisar cartões; cartão de lacuna.
   - Legislação: importar por colagem uma lei pequena do `corpus/`; ler; foco; estrela; grifo; "Enviar às frases"; corrigir texto; backup exportar → apagar → restaurar.
   - Hoje e Sessão (quando existirem): abrir Hoje, ver uma próxima ação, começar, pausar, fechar, voltar e ser restaurado.
   - Plano e onboarding (quando existirem): escolher concurso, desmarcar disciplina, chegar ao primeiro assunto.
   - Transversais: 3 aparelhos (celular, tablet, desktop), tema claro e escuro, axe, alvo de toque ≥ 44 px, uso sem rede, atalho "E", Ajuda contextual, nenhum campo obrigatório além do mínimo.
5. Olhar como produto, não só como teste: onde a pessoa hesita, perde o lugar, precisa ler demais, vê jargão ("Ponto", "faixa") onde cabe "assunto", ou cai em beco sem saída.
6. Relatar (ver abaixo) e encerrar com uma linha.

## Relato

Comentar na issue **"Verificação diária"** do repositório (criar na primeira vez; um comentário por dia, com o rodapé de atribuição). Estrutura, em português e curta:

- **Estado:** `check` verde/vermelho, E2E verde/vermelho, instáveis (nomes).
- **Defeitos** (com passos para reproduzir e arquivo provável): perda de dado, perda de posição, quebra de acessibilidade e falha offline **furam a fila**: marcar `[fura-fila]`.
- **Sugestões** (no máximo 5, da mais para a menos valiosa): o que mudar, por quê, esforço estimado (P/M/G) e pacote do plano a que pertence (`f3-pacotes.md`) ou "novo".
- **Não repetir** o que já está em comentário anterior aberto; marcar "segue" em uma linha.
- Sem nota de satisfação, sem elogio, sem rótulo clínico (R7).

## Proibições

Não alterar código nem docs; não abrir PR nem issue além da fixa; não mergear; não force push; não publicar nem apagar dados do Gabriel; não enviar dados do app a serviços externos; não instalar dependências novas. Se algo exigir decisão do Gabriel, escrever a pergunta na issue em uma linha.

## Limites

Meta: sessão curta (poucas dezenas de minutos). Se o `check` estourar memória ou tempo duas vezes, relatar "máquina carregada" e parar, sem insistir.
