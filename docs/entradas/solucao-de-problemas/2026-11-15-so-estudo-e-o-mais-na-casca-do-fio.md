### "Só estudo" não escondia a pílula dos lugares, e o "+" ficava 2 px abaixo do meio do cabeçalho

- **Sintoma:** na Sessão, ligar o "Só estudo" tirava só a Ajuda: a pílula Agora, Destino e Varal e o menu da conta continuavam na tela. O "+" ficava 2 px abaixo do meio da linha do cabeçalho.
- **Causa:** as duas regras eram da casca de antes. O "Só estudo" escondia `.areas`, `.rodape` e `.conta-botao`, que o Fio não tem. O `--mais-topo` (0,375 rem) centrava o "+" num cabeçalho de 60 px; o do Fio tem 56.
- **Solução:** `body[data-so-estudo]` esconde `.fio-nav` (sem reservar a altura dela) e deixa invisíveis `.fio-menu` e a Ajuda, sem tirá-los do lugar, para o nome não andar no cabeçalho. `--mais-topo` passa a 0,25 rem. E2E: `sessao.spec.ts`, `areas-seguras.spec.ts` e `mais-global.spec.ts`.
- **Fica como está:** no monitor a Trilha e o Fixar têm duas colunas e são mais largos; o cabeçalho e o "+" acompanham a largura (Gabriel, 08/11/2026), então o "+" não fica no mesmo ponto dessas telas para as outras. O E2E confere a regra que vale em todas: 48 px, a mesma altura e a beirada direita do conteúdo.
- **Vale para o próximo:** ao apagar uma casca, procure os modos que escondiam partes dela pelo nome da classe; o seletor morto some no lint e a função some junto, sem teste de unidade que avise.
