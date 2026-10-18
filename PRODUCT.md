# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Quem estuda para concursos jurídicos de alta complexidade e tem dificuldade de concentração: começar sem decidir, voltar depois de uma pausa sem culpa, ler sem se perder. Hoje o único usuário é o autor (Gabriel, banca FCC, Defensoria Pública de SP); o produto é desenhado para, no futuro, ser cobrado e crescer. Duas situações de entrada, descritas por comportamento: "não sei por onde começar" e "voltei e perdi o fio".

## Product Purpose

Converter erros, questões e leitura de legislação em uma próxima ação de estudo, com o mínimo de cadastro e sem depender de fornecedor. Promessa: volte exatamente de onde parou e faça uma coisa por vez. Sucesso é reduzir o tempo até começar, preservar o ponto de retomada e produzir uma Sessão útil. Tempo no app, streak e volume de cliques não são objetivos.

## Positioning

Dois diferenciais, com a retomada como núcleo: (1) a próxima ação única e a retomada sem culpa, com o ponto de parada sempre salvo; (2) o leitor de legislação feito para a letra de lei cobrada pela FCC (Estrela com herança por bloco, redações anteriores guardadas e ocultas, modo foco).

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

Nome provisório "Arretado" (antes "Acumen"), com o pequeno cacto ao lado do nome; direção visual "Ponto de luz" (D-D7, 18/10/2026): a caneta-cacto de vidro marca onde a pessoa parou e o cachorro em um traço só aparece como coadjuvante, só ao fechar o Dia e a rodada. Sensação-alvo: ânimo e clareza, sem economia de atenção às custas do encantamento. Os detalhes visuais vigentes ficam em `DESIGN.md`, `docs/design/` e `src/apresentacao/estilos.css`, não aqui.

## Evidence on Hand

Especificação em duas partes, plano-mestre, brief de design (`docs/design/brief-app.md`), auditoria de UI de 14/10/2026 e uso real pelo autor. Não há usuários externos, depoimentos, métricas de mercado nem preços definidos: nada disso deve ser inventado. Nada do Acervo antigo nem do Acumen v2 foi importado; o conteúdo recomeça do zero.

## Product Principles

1. Uma ação dominante por tela; "Em seguida" é subordinado a "Agora".
2. Retomar sem culpa: o ponto de parada é sempre preservado e nunca vira dívida.
3. Mínimo de cadastro: pedir só o indispensável e revelar opções aos poucos.
4. Local-first: o que o usuário guardou é dele e funciona sem rede.
5. Fala pública por comportamento, nunca por diagnóstico.

## Accessibility & Inclusion

Pensado para quem tem dificuldade de concentração: baixa carga cognitiva, uma coisa por vez, movimento só quando explica e respeitando `prefers-reduced-motion`. Contraste e alvos de toque de pelo menos 44 px seguem as regras do projeto.
