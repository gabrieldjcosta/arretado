---
name: arretado-design-brief
description: Entrevista Gabriel e cria ou atualiza um brief verificável para landing page, página de venda, avatar ou fluxo do aplicativo Arretado. Use quando o pedido ainda precisa de decisões de produto, narrativa, conteúdo ou direção visual.
argument-hint: "[landing|vendas|avatar|fluxo]"
disable-model-invocation: true
allowed-tools: Read Grep Glob Write Edit
---

# Brief de design

Alvo: `$ARGUMENTS`.

## Limites

- Esta skill produz documentação; não implemente UI nem altere código de produção.
- Não faça commit, push ou PR.
- Não reabra decisões permanentes sem apontar o conflito e pedir decisão explícita.
- Não pergunte novamente o que as fontes de verdade já respondem.

## Preparação

1. Leia `CLAUDE.md`, `docs/proxima-sessao.md` e apenas as partes relevantes de `docs/planos/plano-mestre.md`.
2. Carregue `arretado-design-principles`.
3. Para fluxo existente, inspecione a rota, componentes, CSS e testes correspondentes.
4. Verifique `docs/design/` e reutilize decisões aprovadas.

## Entrevista

Faça **uma pergunta por vez**, com 2–4 opções curtas e “outro”. Priorize somente lacunas capazes de mudar o projeto. Continue até não restar ambiguidade relevante.

Cubra, conforme o alvo:
- Resultado que a pessoa deve alcançar.
- Público descrito por situação e comportamento, nunca diagnóstico.
- Situação antes/depois e objeção principal.
- Mensagem única e CTA dominante.
- Conteúdo e provas realmente disponíveis.
- Ordem da história ou do fluxo.
- Papel do personagem: nenhum, discreto ou narrativo.
- Nível de movimento e alternativa reduzida.
- Viewports, estados e limites técnicos.
- Elementos proibidos.
- Critérios verificáveis de aceite.

Para vendas, peça decisões sobre oferta, preço, teste, garantia e prova; se não existirem, registre “decisão necessária” e não invente.

## Documento

Grave em:
- `docs/design/brief-landing.md`
- `docs/design/brief-vendas.md`
- `docs/design/brief-avatar.md`
- ou `docs/design/brief-<slug-do-fluxo>.md`.

Use esta estrutura:
1. Resumo.
2. Resultado do usuário.
3. Público por comportamento.
4. Situação antes e depois.
5. Mensagem e CTA.
6. História/fluxo em etapas.
7. Conteúdo comprovado.
8. Direção visual e personagem.
9. Movimento e reduced motion.
10. Estados e viewports.
11. Restrições de produto, acessibilidade e privacidade.
12. Critérios de aceite observáveis.
13. Decisões pendentes.

Não use adjetivos vagos como “moderno” sem traduzi-los em propriedades visuais ou comportamentais. Separe fatos do repositório, decisões de Gabriel e hipóteses de design.

## Saída

Mostre:
- Caminho do documento.
- Cinco decisões mais importantes.
- Pendências que bloqueiam Stitch ou implementação.
- Próximo comando recomendado.
