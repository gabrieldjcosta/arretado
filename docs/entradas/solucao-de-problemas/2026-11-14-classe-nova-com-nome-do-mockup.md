### Classe nova no Fio com nome que o mockup já usa

- **Sintoma:** um elemento novo do quadro do Fio aparece com altura, margem ou cor que ninguém escreveu (a linha de retorno do Agora nasceu com 96 px de altura mínima), e uma tela portada do mockup muda de cara sem ter sido tocada (o retorno dos passos "Lembrar", "Ache o erro" e "Ache a diferença" virou `display: flex`).
- **Causa:** `fio/mockup/mockup.css` é o CSS do mockup aprovado, com centenas de classes `.m-*`. Uma classe nova em `ajustes.css` com um nome que já existe lá (`.m-retorno`) herda as regras do mockup e, pior, aplica as suas às telas que já usavam o nome.
- **Solução:** antes de criar uma classe `.m-*`, procurar o nome: `git grep -n "\.m-nome" -- src/apresentacao/fio`. Se existir, escolher outro (a linha de retorno ficou `.m-linha-de-retorno`). O teste de unidade não pega isto (o jsdom não tem layout); o navegador pega: medir a caixa do elemento novo e rodar os specs das telas que usam o nome antigo.
