---
name: arretado-visual-review
description: Audita uma implementação do Arretado contra brief, DESIGN.md e referência Stitch com screenshots, responsividade, acessibilidade e evidências priorizadas. Não corrige automaticamente.
argument-hint: "[landing|vendas|rota-ou-fluxo]"
disable-model-invocation: true
context: fork
allowed-tools: Read Grep Glob Bash Write
---

# Revisão visual

Alvo: `$ARGUMENTS`.

## Regra

Esta é uma revisão independente e read-only. Não edite a implementação. Pode iniciar servidor, navegar, executar testes e escrever apenas o relatório em `docs/design/reviews/`.

## Referências

1. Leia `CLAUDE.md`, princípios, brief/spec do alvo e `docs/design/DESIGN.md`.
2. Leia o registro Stitch e referências exportadas, quando existirem.
3. Localize a rota e os testes.
4. Não compare apenas a screenshot; verifique comportamento real.

## Matriz de teste

Capture e inspecione, no mínimo:
- 1440×900.
- 768×1024.
- 390×844.
- Zoom 200% ou equivalente.
- Tema claro/escuro quando aplicável.
- `prefers-reduced-motion: reduce`.

Percorra por teclado. Rode axe nos estados representativos. Verifique:
- Ordem visual e semântica.
- CTA e ação dominante.
- Fontes, cores, bordas, espaçamento e alinhamento.
- Overflow, truncamento, sobreposição e área de toque.
- Imagens quebradas, alt text, layout shift.
- Estados vazio/offline/erro quando alcançáveis.
- Movimento, fallback reduzido e estabilidade.
- Diferenças entre implementação, brief e referência.

Não use diferença de pixels como única verdade: a implementação deve preservar intenção e acessibilidade, não copiar defeitos do mockup.

## Prioridade

- P0: bloqueia tarefa, acesso, segurança ou entendimento.
- P1: quebra promessa, responsividade ou acessibilidade importante.
- P2: fricção real ou divergência visual relevante.
- P3: acabamento opcional.

Cada achado precisa de tela/viewport, evidência, regra violada e correção mínima. Sem evidência, não registre.

## Relatório

Grave `docs/design/reviews/<slug>-AAAA-MM-DD-visual.md` com:
- Veredito.
- Matriz de execução.
- Achados ordenados P0→P3.
- Capturas/caminhos usados.
- Testes e limitações.
- Itens conformes dignos de preservação.

No final, mostre apenas contagem por prioridade, maior bloqueio e caminho do relatório. Não aplique correções.
