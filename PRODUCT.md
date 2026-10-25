# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Quem estuda para concursos jurídicos de alta complexidade, em qualquer carreira do catálogo (hoje Defensoria, Magistratura, Ministério Público e área ambiental), e tem dificuldade de concentração: começar sem decidir, voltar depois de uma pausa sem culpa, ler sem se perder. O produto é um só para todas as carreiras e bancas, desenhado para, no futuro, ser cobrado e crescer. Hoje quem usa é o autor (Gabriel, que estuda para a Defensoria Pública de SP, banca FCC) e uma pessoa próxima a ele. Duas situações de entrada, descritas por comportamento: "não sei por onde começar" e "voltei e perdi o fio".

## Product Purpose

Converter erros, questões e leitura de legislação em uma próxima ação de estudo, com o mínimo de cadastro e sem depender de fornecedor. Promessa: volte exatamente de onde parou e faça uma coisa por vez. Sucesso é reduzir o tempo até começar, preservar o ponto de retomada e produzir uma Sessão útil. Tempo no app, streak e volume de cliques não são objetivos.

## Positioning

Dois diferenciais, com a retomada como núcleo: (1) a próxima ação única e a retomada sem culpa, com o ponto de parada sempre salvo; (2) o leitor de legislação feito para a letra de lei cobrada em provas jurídicas, com a FCC como primeira banca atendida (Estrela com herança por bloco, redações anteriores guardadas e ocultas, modo foco).

## Operating Context

Estudo diário em celular e desktop, em Sessões curtas e retomadas. Local-first: os dados vivem no aparelho (IndexedDB com log de alterações) e nenhuma funcionalidade depende de rede; o remoto (Supabase) é só espelho. Legislação entra por HTML colado ou URL, e todo HTML colado é sanitizado. As quatro áreas são Hoje, Plano, Recall e Biblioteca; Conta e Ajustes ficam fora da navegação principal.

## Capabilities and Constraints

- Vocabulário obrigatório na interface e no código: Aparelho (equipamento), Problema (falha da plataforma), Erro (só estudo), Dispositivo (só unidade da lei), Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta.
- Nada obrigatório além do mínimo nos formulários; na captura de erro só a Frase correta é obrigatória.
- Diagnóstico (TDAH, autismo etc.) nunca é perguntado nem guardado e é orientação interna. A fala pública parte do comportamento ("dificuldade de concentração", "não sei por onde começar"), sem rótulo clínico nem promessa de tratamento.
- Sem streak, ranking, perda, culpa ou urgência artificial; vermelho só para excluir e falha técnica, nunca no estudo.
- Plataforma: web agora; app nativo é uma intenção futura ainda não decidida e não deve ser prometida.
- Fases sequenciais (F0 a F4); decisões técnicas em `docs/decisoes-tecnicas.md` e decisões de produto D1–D25 em `docs/especificacao-parte1.md`, não reabertas sem motivo.

## Brand Commitments

Nome provisório "Arretado" (antes "Acumen"), escrito num traço só com o pequeno cacto ao lado; direção visual "Tinta e noite" (D-D9, 19/10/2026): dois mundos que o tema escolhe, o dia de tinta sobre papel e a noite de mandacaru; a caneta de vidro marca onde a pessoa parou e, a cada Dia fechado, ela desenha mais uma parte de um quadro de cacto, sem número nem sequência (D-D8, 19/10/2026). Sensação-alvo: ânimo e clareza, sem economia de atenção às custas do encantamento. Os detalhes visuais vigentes ficam em `DESIGN.md`, `docs/design/` e `src/apresentacao/estilos.css`, não aqui.

## Evidence on Hand

Especificação em duas partes, plano-mestre, brief de design (`docs/design/brief-app.md`), auditoria de UI de 14/10/2026 e uso real pelo autor. Não há usuários externos, depoimentos, métricas de mercado nem preços definidos: nada disso deve ser inventado. A oferta prevista é um plano único para todas as carreiras, e o preço só se discute depois do teste com pessoas e da V1 (`docs/planos/plano-mestre.md`, §1). Nada do Acervo antigo nem do Acumen v2 foi importado; o conteúdo recomeça do zero.

## Product Principles

1. Uma ação dominante por tela; "Em seguida" é subordinado a "Agora".
2. Retomar sem culpa: o ponto de parada é sempre preservado e nunca vira dívida.
3. Mínimo de cadastro: pedir só o indispensável e revelar opções aos poucos.
4. Local-first: o que o usuário guardou é dele e funciona sem rede.
5. Fala pública por comportamento, nunca por diagnóstico.

## Accessibility & Inclusion

Pensado para quem tem dificuldade de concentração: baixa carga cognitiva, uma coisa por vez, movimento só quando explica e respeitando `prefers-reduced-motion`. Contraste e alvos de toque de pelo menos 44 px seguem as regras do projeto.
