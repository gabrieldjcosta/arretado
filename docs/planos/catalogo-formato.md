# Catálogo de concursos: formato do CSV e validador (B0)

Pacote B0 da F3-B ([`f3-pacotes.md`](f3-pacotes.md)). Só documento e script: não toca `src/` nem o esquema. O prompt que gera os CSV está em [`prompt-perplexity-catalogo.md`](prompt-perplexity-catalogo.md); **o cabeçalho que o prompt pede é o contrato**.

## Fluxo

1. Uma conversa do Perplexity por carreira; cada resposta traz 3 blocos CSV e "Lacunas e dúvidas".
2. `npm run catalogo -- validar <arquivo> [<arquivo>...]` aponta erros e avisos, agrupados por regra (`--tudo` lista todos). Cada arquivo pode ser a resposta inteira colada (os blocos entre ``` são achados pelo cabeçalho) ou um CSV só; quando o Perplexity entrega um arquivo por bloco, passe os três juntos (itens, disciplinas, editais). `-` lê da entrada padrão.
3. Erro: devolver ao Perplexity a lista de linhas e a regra, ou corrigir à mão. Aviso: olhar, não bloqueia.
4. `npm run catalogo -- converter <arquivo...>` (só roda sem erros) grava em `corpus/catalogo/`, por carreira, `<carreira>.csv` (normalizado) e `<carreira>.json` (entrada do B1), mais `descartes/<carreira>.txt` e o `index.json`. Segunda rodada de uma carreira sobrescreve só os arquivos dela; versionar no git.
5. **Carreira nova = rodar `converter` só com os arquivos dela.** Nada mais muda: as outras ficam como estão e o `index.json` (lista das 10 carreiras com `disponivel`, editais e itens) a inclui sozinho. `npm run catalogo -- indice` refaz o índice sem converter. Para tirar uma carreira por enquanto, apague `<carreira>.{csv,json}` e rode `indice`.

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
| `ordem_disciplina` | inteiro ≥ 1. Edital que reinicia a numeração por bloco (gerais, depois específicas) repete ordens: não é erro | não inteiro: erro; ordem repetida entre disciplinas, disciplina com duas ordens ou lacuna: aviso |
| `numero_item` | numeração do edital ("1", "3.2") | vazio: aviso |
| `assunto` | obrigatório; não pode ser subitem solto ("a) ...") | vazio: erro; curto (<6) ou "a)": aviso |
| `faixa` | `Altíssima`, `Alta`, `Média`, `Baixa` ou vazio | inválida: erro |
| `obs_faixa` | **obrigatória se há `faixa`** (base verificável); sem `faixa`, deve ficar vazia | faixa sem base: erro; texto sobre sem faixa ou citando candidatos: aviso |
| `recorrencia` | `N/M` com N ≤ M (ex.: 3/3) ou vazio | erro |
| `fonte_url` | URL http(s) do edital oficial; agregadores e cursinhos (PCI, QConcursos, Estratégia, Gran, JusBrasil etc.) são recusados | ausente/inválida/agregador: erro |

**NÃO LOCALIZADO:** linha do órgão com `NÃO LOCALIZADO` em `assunto` (forma que o Perplexity usa: `carreira,orgao,uf,,,,,,,,NÃO LOCALIZADO,,,,`) ou em `disciplina`, e todo o resto vazio (banca, ano, cargo, URL e demais campos não são exigidos). Qualquer outro campo de conteúdo preenchido é erro.

**Duplicidade:** linha idêntica repetida no mesmo edital é erro. Mesmo `numero_item` na mesma disciplina com assuntos diferentes é aviso (editais que reiniciam a numeração por seção; também denuncia trecho de texto parar em `numero_item`). `numero_item` com 5+ dígitos ou mais de 12 caracteres: aviso.

**Edital** = carreira + órgão + ano + cargo + fase + `fonte_url`. Por isso duas edições do mesmo ano (ex.: ENAM 2026, 1ª e 2ª) ficam separadas, e `fonte_url` deve ser a mesma em todas as linhas de um edital.

## Bloco 2: disciplinas consolidadas (opcional)

`carreira,disciplina_normalizada,variantes_de_nome,presente_em_n_editais,total_editais,faixa_sugerida`

Erro: carreira fora da lista, `presente_em_n_editais` > `total_editais` ou não inteiro, `faixa_sugerida` inválida, disciplina repetida. Aviso: disciplina do bloco 1 sem par aqui (e vice-versa). O par se faz sem acento/caixa, pelo nome normalizado ou por qualquer uma das `variantes_de_nome` separadas por "; " (o Perplexity costuma deixar o nome original em caixa alta no bloco 1).

## Bloco 3: editais usados (opcional)

`orgao,ano,banca,url,situação` (o validador aceita "situacao" sem acento). `situação` ∈ `completo`, `parcial`, `NÃO LOCALIZADO`; em NÃO LOCALIZADO, ano, banca e url ficam vazios.

Erro: situação inválida, edital que não é NÃO LOCALIZADO sem `url` ou sem ano, edital NÃO LOCALIZADO que tem assuntos no bloco 1. Aviso: edital do bloco 1 ausente da lista, ou "completo" sem assuntos no bloco 1.

## Descarte (feito no `converter`)

Não entram no catálogo, e ficam listadas em `descartes/<carreira>.txt` para conferência: linha com `assunto` fragmento (menos de 6 caracteres, ex.: "Nº", "SOLUT") e linha com `numero_item` que não é numeração (5+ dígitos ou mais de 12 caracteres: CNPJ, carimbo de assinatura digital do PDF). Linhas NÃO LOCALIZADO ficam.

## Faixa das disciplinas (feita no `converter`)

`faixa` dos itens segue como veio (vazia sem base). `faixaSugerida` da disciplina, quando o Perplexity não preencheu, é derivada da presença nos editais da amostra, pela mesma regra que ele declarou na Magistratura: ≥85% Altíssima, ≥65% Alta, ≥35% Média, abaixo disso Baixa. Com menos de 3 editais na amostra não há base e fica vazia. O JSON marca `faixaOrigem` (`edital` ou `derivada`) e `faixaBase` ("presente em N de M editais"); a interface deve dizer que é sugestão pela amostra.

## Divisão de assuntos juntados (feita no `converter`; `npm run catalogo -- dividir` nos já gravados)

A extração de PDF às vezes junta vários assuntos num item só (marcadores "18." embutidos, parágrafos de frases, listas de ";" longas). `scripts/catalogo/dividir.mjs` quebra em fronteira de marcador, de frase (item > 400 caracteres) ou de ";" (item > 900), tira anexos do edital e cabeçalho de página, e some com cópias idênticas. Faixa, recorrência e fonte vão para cada assunto novo; `numero_item` novo é `N.1`, `N.2`… (ou o marcador achado). Idempotente. Resultado e tabela por disciplina: [`../revisoes/catalogo-assuntos-juntados-2026-10-19.md`](../revisoes/catalogo-assuntos-juntados-2026-10-19.md).

## Normalização (feita no `converter`)

Remove BOM e cercas ```; reduz espaços; carreira, `faixa` e `fase` para a forma canônica; `uf` em maiúsculas (`DFT` → `DF`); `recorrencia` sem espaços ("3 / 3" → "3/3"); prefixo `[Geral] ` nas disciplinas gerais; "não localizado" → `NÃO LOCALIZADO`. Idempotente: rodar sobre o CSV já normalizado dá o mesmo arquivo.

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
  editais: [{ id, orgao, uf, banca|null, ano|null, cargo|null, fase|null, situacao, fonteUrl|null,
              rotulo: "baseado no edital <orgao> de <ano>" | null,
              disciplinas: [{ nome (consolidado, quando há), nomeNoEdital, ordem, itens: [{ numero|null, assunto, faixa|null, obsFaixa|null, recorrencia|null, fonteUrl }] }] }],
  disciplinas: [{ nome, variantes[], presenteEm, totalEditais, faixaSugerida|null, faixaOrigem|null, faixaBase|null }] }
```

Sem data nem campo aleatório: a mesma entrada gera o mesmo arquivo. A faixa vem do edital e é só sugestão; o app não a mostra como verdade no onboarding ("Altíssima" fora do onboarding, conforme `f3-pacotes.md`). Edital NÃO LOCALIZADO aparece com `disciplinas: []`, `ano: null` e `rotulo: null` (o app não o oferece). Ids repetidos ganham sufixo `-2`, `-3`.

## Limites conhecidos

- O validador confere forma e coerência interna, **não a verdade** do conteúdo: não abre a URL (sem rede) nem compara com o edital. Amostrar à mão algumas linhas por carreira antes de aceitar.
- Vírgula sem aspas dentro de um campo vira erro "N colunas"; devolver ao Perplexity com a instrução de aspear.
- Mudança de cabeçalho no prompt exige mudar `CABECALHO_*` em `scripts/catalogo/nucleo.mjs` e esta página.
