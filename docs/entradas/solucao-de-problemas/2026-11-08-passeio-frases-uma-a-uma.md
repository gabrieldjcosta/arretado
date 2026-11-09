## O Passeio revela as linhas uma a uma (08/11/2026)

- **Sintoma:** o axe do E2E acusava `color-contrast: .passo-frase` no passo 2 do Passeio.
- **Causa:** a frase e as linhas entram com animação de opacidade (0,35 s + 1,1 s por linha); o axe lê no meio dela.
- **Solução:** a função que abre cada tela em `e2e/passeio.spec.ts` espera `getAnimations().finished` das linhas antes de medir. Teste novo sobre o passo faz o mesmo.
- **Previsível:** linha nova no Passeio ganha `--n` (a ordem) e atrasa a última em 1,1 s; a altura da folha continua a de antes, então medir como em "A folha do Passeio tem altura fixa". A pílula do Fio some (`visibility`) com `dialog.dialogo-chegada[open]`: outro diálogo com essa classe também a esconde.
