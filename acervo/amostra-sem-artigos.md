# Amostra: documentos sem artigos (PNAS, SINASE, Orientações Técnicas, Tipificação)

Regra (Peça 3b, 10/10/2026), implementada em `nosDeSecoes` (`scripts/acervo/construir.ts`) e ativada por `"semArtigos": true` na curadoria:

- O Markdown não passa pelo estruturador. Vira **um Anexo** (`anexo`, rótulo = título do item) e, sob ele, **um bloco por título `#`** (`anexo.b1`, `anexo.b1.b2`…), aninhado pelo nível do título (`##` fica dentro do `#` anterior).
- O corpo da seção entra como texto do bloco, um parágrafo depois do outro, separados por quebra de linha. Texto antes do primeiro título fica no próprio Anexo.
- `~~tachado~~` vira trecho tachado. Tabelas, negrito e links perdem a marcação (ficam como texto).
- Numeração sequencial e demais validações de artigo não se aplicam. O item é bloqueado se não houver nenhum título `#`.
- Item vai sem aviso de anomalia; o curador revisa o relatório antes de liberar.

Entrada:

    # Política Nacional
    Texto de abertura.
    ## Princípios
    Primeiro princípio.
    # Diretrizes
    Texto das diretrizes.

Saída (`nos`, em ordem de leitura):

| endereço      | tipo  | pai        | rótulo            | texto                 |
| ------------- | ----- | ---------- | ----------------- | --------------------- |
| `anexo`       | anexo | —          | título do item    | —                     |
| `anexo.b1`    | bloco | `anexo`    | Política Nacional | Texto de abertura.    |
| `anexo.b1.b2` | bloco | `anexo.b1` | Princípios        | Primeiro princípio.   |
| `anexo.b3`    | bloco | `anexo`    | Diretrizes        | Texto das diretrizes. |

**Para o Gabriel:** conferir se a granularidade (um bloco por título `#`, não por parágrafo) serve para estudar. Se preferir mais fino, a regra muda em `nosDeSecoes` antes do lote.
