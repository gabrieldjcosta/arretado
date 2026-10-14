# Transições e carregamento — medição e plano (14/10/2026)

Medido com `scripts/medir-carga.mjs` (acervo real, `dist/` servido por `vite preview`, Chromium em contêiner; o disco do contêiner é lento e ruidoso, então valem as proporções, não os milissegundos).

## O que demora

| Cenário (acervo real, 175 normas + súmulas + teses já no aparelho) | Tempo |
|---|---|
| Abrir Hoje, Biblioteca, Acervo, Súmulas, Teses, Precedentes, Resumos, Recall, Plano (recarregando) | 0,5–0,7 s cada |
| Abrir o Leitor da CF/88 (3.572 dispositivos) | 0,8–0,9 s (1,3 s com CPU 4× mais lenta) |
| Abrir a lista do acervo (índice de 89 kB) | 0,1 s (0,4 s a 4×) |
| **Adicionar a CF/88 (1,9 MB)** | **~10 s** (não muda com CPU lenta: espera de IndexedDB) |
| **"Tudo do edital" (175 normas, 20 MB)** | **~183 s** |
| Adicionar todas as súmulas / todas as teses | 9 s / 0,8 s |

Conclusão: nenhuma tela **lê** devagar. A lentidão do acervo é a **adição**: baixar leva ~130 ms; o resto (~9,5 s na CF) é gravar `dispositivos` (5 índices) e `textosDispositivo` (3 índices), cada registro duplicado no log de alterações (`alteracoes`, 3 índices). Cortar em transações menores, `durability: relaxed` e afins não ajudaram (testados em microbenchmark; o ruído do disco é maior que o efeito).

## Feito neste PR

- Adição com andamento honesto: barra `<progress>`, "n de N: título (tamanho)" e, para norma acima de 500 kB, aviso de que salvar leva alguns segundos. Antes: "0 de 1" parado por ~10 s.
- `scripts/medir-carga.mjs`: repete a medição (`node scripts/medir-carga.mjs [lento]`).

## Não feito (decisão do Gabriel / F4-A)

1. **Log sem cópia do registro em lote de acervo** (maior ganho: corta cerca de um terço a metade da escrita). Mexe no formato do log que o sync da F4 vai ler; decidir junto com a poda do log (já adiada para o sync). Recomendação: na F4-A, o log de um lote de acervo guarda só `{item do acervo, versão, hash}` e o sync rebaixa o conteúdo do acervo.
2. Baixar o próximo item enquanto grava o atual (~10% em lote, pelo tempo de download); só vale com a mudança 1.

## Telas de transição (plano; implementação fica com a thread de UI)

Princípios: 150–220 ms, só para continuidade; `prefers-reduced-motion` mantém ordem e conteúdo; nada de spinner solto.

1. **Entre rotas** (View Transitions, T-1, da thread "Ajuste de UI"): fade curto do conteúdo, cabeçalho fixo. Como todas as telas abrem em ≤ 0,7 s, não é preciso tela de carregamento cheia.
2. **Carregando rota preguiçosa** (Leitor, Importar, Dados): já usa `Esqueleto`; manter. Só acrescentar um atraso de 150 ms antes de mostrá-lo, para não piscar em abertura rápida.
3. **Operações longas** (adicionar norma/lote, importar backup, importar lei): padrão único "andamento": título do que está sendo feito, barra `<progress>`, texto honesto sobre a espera e, quando possível, "Parar". Aplicado à adição do acervo neste PR; próximos: Importar backup (Dados) e Importar lei.
4. **Mascote**: não em carregamento (regra do guia de voz: não aparece em leitura profunda e não substitui rótulos).
