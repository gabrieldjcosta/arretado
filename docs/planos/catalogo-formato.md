# Catálogo de concursos: formato do CSV e validador (B0)

Pacote B0 da F3-B ([`f3-pacotes.md`](f3-pacotes.md)). Só documento e script: não toca `src/` nem o esquema. O prompt que gera os CSV está em [`prompt-perplexity-catalogo.md`](prompt-perplexity-catalogo.md); **o cabeçalho que o prompt pede é o contrato**.

## Fluxo

1. Uma conversa do Perplexity por carreira; cada resposta traz 3 blocos CSV e "Lacunas e dúvidas".
2. `npm run catalogo -- validar <arquivo>` aponta erros e avisos. O arquivo pode ser a resposta inteira colada (os blocos entre ``` são achados pelo cabeçalho) ou o CSV puro. `-` lê da entrada padrão.
3. Erro: devolver ao Perplexity a lista de linhas e a regra, ou corrigir à mão. Aviso: olhar, não bloqueia.
4. `npm run catalogo -- converter <arquivo>` (só roda sem erros) grava em `corpus/catalogo/`, por carreira, `<carreira>.csv` (normalizado) e `<carreira>.json` (entrada do B1). Segunda rodada de uma carreira sobrescreve; versionar no git.

## Bloco 1: itens (obrigatório)

Cabeçalho exato, nesta ordem:

`carreira,orgao,uf,banca,ano_edital,cargo,fase,disciplina,ordem_disciplina,numero_item,assunto,faixa,obs_faixa,recorrencia,fonte_url`

Uma linha = um item numerado do edital. Subitens (a, b, c) ficam no mesmo `assunto`, separados por "; ".

| Campo | Regra | Se violar |
|---|---|---|
| `carreira` | uma das 10 da tabela abaixo (aceita sem acento, caixa diferente e apelido curto; o normalizador grava o nome canônico) | erro |
| `orgao` | obrigatório (ex.: DPE-SP, TJSP, TRF3) | erro |
| `uf` | sigla de 2 letras ou `BR` (federal) | vazio: aviso; inválida: erro |
| `banca` | obrigatória na prática; igual em todas as linhas do mesmo edital | vazia: aviso; divergente: erro |
| `ano_edital` | AAAA entre 2015 e 2027 | erro; antes de 2023: aviso |
| `cargo` | texto | vazio: aviso |
| `fase` | `objetiva`, `discursiva`, `oral`, `titulos` ou vazio (normaliza "Títulos", "TÍTULOS") | erro |
| `disciplina` | nome consagrado; geral leva prefixo `[Geral] ` (o normalizador acrescenta para Português, Informática, Raciocínio Lógico, Matemática, Atualidades, Inglês, Conhecimentos Gerais) | vazio: erro; geral sem prefixo: aviso |
| `ordem_disciplina` | inteiro ≥ 1; uma disciplina tem uma só ordem no edital e duas disciplinas não dividem a mesma | erro; lacuna na sequência: aviso |
| `numero_item` | numeração do edital ("1", "3.2") | vazio: aviso |
| `assunto` | obrigatório; não pode ser subitem solto ("a) ...") | vazio: erro; curto (<6) ou "a)": aviso |
| `faixa` | `Altíssima`, `Alta`, `Média`, `Baixa` ou vazio | inválida: erro |
| `obs_faixa` | **obrigatória se há `faixa`** (base verificável); sem `faixa`, deve ficar vazia | faixa sem base: erro; texto sobre sem faixa ou citando candidatos: aviso |
| `recorrencia` | `N/M` com N ≤ M (ex.: 3/3) ou vazio | erro |
| `fonte_url` | URL http(s) do edital oficial; agregadores e cursinhos (PCI, QConcursos, Estratégia, Gran, JusBrasil etc.) são recusados | ausente/inválida/agregador: erro |

**NÃO LOCALIZADO:** linha do órgão com `disciplina` (ou `assunto`) = `NÃO LOCALIZADO` e **sem** `assunto`, `numero_item`, `faixa`, `obs_faixa`, `recorrencia`. Qualquer um preenchido é erro. Sem URL: aviso.

**Duplicidade (erro):** mesma linha repetida; mesmo `numero_item` na mesma disciplina do mesmo edital com assuntos diferentes. Edital = carreira + órgão + ano + cargo + fase.

## Bloco 2: disciplinas consolidadas (opcional)

`carreira,disciplina_normalizada,variantes_de_nome,presente_em_n_editais,total_editais,faixa_sugerida`

Erro: carreira fora da lista, `presente_em_n_editais` > `total_editais` ou não inteiro, `faixa_sugerida` inválida, disciplina repetida. Aviso: disciplina que não existe no bloco 1 (e vice-versa).

## Bloco 3: editais usados (opcional)

`orgao,ano,banca,url,situação` (o validador aceita "situacao" sem acento). `situação` ∈ `completo`, `parcial`, `NÃO LOCALIZADO`.

Erro: situação inválida, edital que não é NÃO LOCALIZADO sem `url`, edital NÃO LOCALIZADO que tem assuntos no bloco 1. Aviso: edital do bloco 1 ausente da lista.

## Normalização (feita no `converter`)

Remove BOM e cercas ```; reduz espaços; carreira, `faixa` e `fase` para a forma canônica; `uf` em maiúsculas; `recorrencia` sem espaços ("3 / 3" → "3/3"); prefixo `[Geral] ` nas disciplinas gerais; "não localizado" → `NÃO LOCALIZADO`. Idempotente: rodar sobre o CSV já normalizado dá o mesmo arquivo.

## Carreiras e arquivos

| Carreira (valor canônico) | Arquivo |
|---|---|
| Defensoria Pública | `defensoria-publica` |
| Magistratura | `magistratura` |
| Ministério Público (Promotor) | `ministerio-publico` |
| Analista Judiciário | `analista-judiciario` |
| Técnico Judiciário | `tecnico-judiciario` |
| Tribunal de Contas / área de controle | `controle` |
| Área ambiental (procuradoria e órgãos ambientais) | `ambiental` |
| Procuradoria (AGU/estadual/municipal) | `procuradoria` |
| Delegado de Polícia | `delegado` |
| Cartório/notarial | `cartorio` |

## JSON gerado (entrada do B1)

```
{ versao: 1, carreira, slug,
  editais: [{ id, orgao, uf, banca, ano, cargo, fase|null, situacao, fonteUrl,
              rotulo: "baseado no edital <orgao> de <ano>",
              disciplinas: [{ nome, ordem, itens: [{ numero|null, assunto, faixa|null, obsFaixa|null, recorrencia|null, fonteUrl }] }] }],
  disciplinas: [{ nome, variantes[], presenteEm, totalEditais, faixaSugerida|null }] }
```

Sem data nem campo aleatório: a mesma entrada gera o mesmo arquivo. A faixa vem do edital e é só sugestão; o app não a mostra como verdade no onboarding ("Altíssima" fora do onboarding, conforme `f3-pacotes.md`). Edital NÃO LOCALIZADO aparece com `disciplinas: []`.

## Limites conhecidos

- O validador confere forma e coerência interna, **não a verdade** do conteúdo: não abre a URL (sem rede) nem compara com o edital. Amostrar à mão algumas linhas por carreira antes de aceitar.
- Vírgula sem aspas dentro de um campo vira erro "N colunas"; devolver ao Perplexity com a instrução de aspear.
- Mudança de cabeçalho no prompt exige mudar `CABECALHO_*` em `scripts/catalogo/nucleo.mjs` e esta página.
