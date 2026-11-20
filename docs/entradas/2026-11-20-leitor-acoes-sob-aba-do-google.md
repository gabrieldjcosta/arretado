# Ações do trecho marcado sob a aba de pesquisa do Google (20/11/2026)

**Sintoma:** no Android (tablet, e provavelmente celular), ao selecionar um trecho a aba de pesquisa do Google ("Touch to Search") sobe da base e cobre as cores do grifo, "Nota" e "Enviar às frases".
**Causa:** `.acoes-leitor` é fixo na base (barra do celular, canto no tablet); o sistema desenha a aba por cima de qualquer coisa nessa faixa.
**Solução:** no toque (`pointer: coarse`, abaixo de 75 em) a barra ganha `.sobre-selecao` e `top` próprio: logo abaixo da seleção (folga de 44 px para as alças) se ainda cabe acima dos 30% de baixo; senão presa no alto, abaixo do cabeçalho (`ondeFicamAsAcoes`, `selecao.ts`). Acompanha rolagem e alças. Mouse e trilho de 75 em ficam como eram.
**Teste:** `e2e/leitor.spec.ts` (grifos e notas) confere que a barra termina acima de 70% da altura no celular e no tablet; `selecao.test.ts` cobre a função.
**Não verificado:** a aba real do Google (só existe no aparelho); o menu nativo de seleção fica junto do texto e a barra nova evita só a base.
