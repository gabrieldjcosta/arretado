# Entradas novas dos registros

Uma entrada nova de registro vai num arquivo próprio aqui, e não no fim do registro. Dois PRs que acrescentavam no mesmo fim davam conflito no GitHub e obrigavam a trazer a integracao para o branch, refazer o check e esperar o CI (regra R1 de [`estrategia-de-desenvolvimento.md`](../planos/estrategia-de-desenvolvimento.md)).

| Pasta | Registro | Como escrever |
|---|---|---|
| `desvios/` | `docs/design/desvios.md` | Só a linha (ou linhas) da tabela, com as seis colunas. O nome do desvio é o número do PR: "(desvio 440)". |
| `decisoes-design/` | `docs/design/decisoes-design.md` | A seção inteira, com o título `## D-Dn — ...`. |
| `glossario/` | `docs/glossario.md` | A linha da tabela ou o parágrafo, como entraria no fim do glossário. |
| `solucao-de-problemas/` | `docs/solucao-de-problemas.md` | A seção inteira, com título `## ...` ou `### ...` e Sintoma, Causa e Solução. |

Nome do arquivo: `AAAA-MM-DD-<nome>.md`, com a data do dia e um nome curto do assunto (por exemplo `2026-11-05-440-sequencia.md`). A data põe as entradas em ordem; o nome só evita colisão.

Ler: a entrada vale desde o merge. Para achar tudo sobre um arquivo, rode `npm run licoes -- <arquivo>`: ele lê estas pastas junto com os registros.

Consolidar: uma vez por dia, quem leva a integracao ao main roda `npm run entradas:consolidar` num PR próprio. O script acrescenta cada entrada ao registro (desvio na tabela, o resto no fim) e apaga o arquivo. `--seco` mostra o que faria.
