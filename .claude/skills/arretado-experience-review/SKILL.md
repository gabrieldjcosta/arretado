---
name: arretado-experience-review
description: Faz crítica rigorosa e read-only da história, copy, ritmo, movimento, personagem, confiança e carga cognitiva de uma página ou fluxo do Arretado, comparando a experiência ao brief.
argument-hint: "[landing|vendas|rota-ou-fluxo]"
disable-model-invocation: true
context: fork
allowed-tools: Read Grep Glob Bash Write
---

# Revisão de experiência

Alvo: `$ARGUMENTS`.

## Regra

Julgue como produto real, não como demo de efeitos. Não edite produção; escreva apenas relatório.

## Testes de compreensão

Avalie se uma pessoa consegue responder rapidamente:
- O que é isto?
- É para uma situação que reconheço?
- O que ganho ou faço agora?
- Por que confiar?

Para fluxo interno, substitua por:
- Onde estou?
- O que faço agora?
- O que acontece depois?
- Como volto se interromper?

## Critérios

### História
- Cada bloco avança a ideia; remova repetição.
- A ordem deve ir de situação a mecanismo e ação.
- A narrativa funciona sem movimento.

### Copy
- Comportamental, específica, humana e curta.
- Sem diagnóstico, cura, “revolucionário”, falsa escassez ou superlativo sem prova.
- Sem prometer recurso futuro como atual.
- CTA descreve a ação.

### Movimento
- Cada efeito tem função nomeável.
- Ritmo não exige rolagem excessiva.
- Nada pisca, disputa atenção, causa enjoo ou impede leitura.
- Reduced motion preserva a história.

### Personagem
- Reforça marca/estado sem virar protagonista.
- Não infantiliza, culpa nem simula autoridade.
- Pode ser removido sem perder instrução essencial.

### Confiança
- Privacidade e local-first são explicados de modo verificável.
- Oferta, prova, preço e limites são honestos.
- Formulários pedem o mínimo.

### Carga cognitiva
- Uma decisão principal por momento.
- Hierarquia clara e densidade adequada.
- Opções secundárias chegam quando necessárias.

## Método

1. Leia brief, princípios e revisão visual mais recente.
2. Percorra em desktop e celular, normal e reduced motion.
3. Faça uma passada rápida de primeira impressão e outra deliberada.
4. Liste primeiro o que remover, depois o que reescrever, só então o que adicionar.
5. Classifique P0–P3 e vincule cada achado a um critério.

## Relatório

Grave `docs/design/reviews/<slug>-AAAA-MM-DD-experiencia.md` com:
- Veredito em uma frase.
- Teste dos 5 segundos.
- Mapa de narrativa/fluxo.
- Achados priorizados.
- Copy atual → problema → alternativa curta.
- Movimento a remover/reduzir/manter.
- Uso do personagem.
- Cinco correções de maior retorno.
- Aspectos que não devem ser alterados.

Não imite Awwwards por prestígio; use excelência editorial e funcional, submetida às necessidades do Arretado.
