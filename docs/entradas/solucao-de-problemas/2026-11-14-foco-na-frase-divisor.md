### Foco na frase: a frase partia dentro de parênteses e não fechava em número nem em "lei"

- **Sintoma:** com "Só a frase em leitura", "(salvo se houver recurso; nesse caso, 60 dias)" acendia em dois pedaços, "(art. 66, III; art. 68)" partia no meio e "(Res. CNJ nº 113, de 2010. Ver o anexo)" partia depois de "Res." e de "2010."; "…de 1984. O juiz decidirá." e "…previstos em lei. O juiz decide." ficavam uma frase só.
- **Causa:** `frasesDoTexto` (`biblioteca/regua-de-foco.ts`) fechava em todo ";" e não sabia de parênteses; todo número antes do ponto segurava a frase (regra feita para "Art. 121. Matar alguém"); e "lei" estava na lista de abreviações.
- **Solução:** nada fecha a frase entre parênteses que abrem e fecham na mesma linha (`entreParenteses`; o parêntese sem par, como o da alínea "a)", não segura nada); o número só segura a frase quando é rótulo, isto é, quando começa a frase ("1. Primeiro") ou vem de uma abreviação que a começa ("Art. 121. Matar alguém"); "lei" saiu das abreviações e "res" entrou. Testes em `regua-de-foco.test.ts`, que falham com o divisor de antes.
- **Fica como está:** a letra sozinha antes do ponto ("inciso I. O juiz") ainda segura a frase, e a frase inteira entre parênteses, com o ponto dentro ("(Vide a Lei X.) O juiz"), não fecha no parêntese.

### Conta oferecia "Só a frase em leitura" em navegador que não a pinta

- **Sintoma:** em navegador sem a API de realce (`CSS.highlights`), Conta › Aparência deixava escolher "Só a frase em leitura", e o Leitor não fazia nada.
- **Solução:** a opção só aparece com `temRealce()`. A escolha gravada antes aparece como "Desligado", que é o que a tela faz ali, e continua gravada (vale em outro aparelho). É a mesma regra da folha dos ajustes de leitura. Teste em `conta/AparenciaConta.test.tsx`.
