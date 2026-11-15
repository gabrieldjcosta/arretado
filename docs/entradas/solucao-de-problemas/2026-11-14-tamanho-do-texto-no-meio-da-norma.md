### Mudar o tamanho do texto no meio da norma troca o trecho do alto da tela

- **Sintoma:** com a norma rolada, um toque em "A+" ou "A−" deixava outro dispositivo no alto da tela; com toques seguidos, a tela ia parar a centenas de pixels dali (227 px no celular, com três toques).
- **Causa:** (1) o tamanho novo muda a altura estimada de todas as linhas de cima (`measure()` descarta as medidas) e a rolagem em pixels fica a mesma; (2) no toque seguinte a lista ainda está assentando, e "o dispositivo do alto" lido naquele instante já é outro; (3) a letra só muda de verdade quando a preferência gravada chega (`AplicarAparencia` põe `--tamanho-leitura` depois da gravação), então a lista se remede mais uma vez, depois de o Leitor já ter dado a volta por concluída.
- **Solução:** `mudarTamanho` guarda o índice do nó do alto (`noAltoNaTroca`, válido por `SEGURA_O_ALTO` = 1,5 s e renovado a cada toque), e um efeito leva essa linha de volta ao alto (`irParaLinha`) quando muda o tamanho pedido e de novo quando chega o tamanho gravado. Toques seguidos reusam o dispositivo já seguro em vez de ler o alto da tela outra vez. No começo da norma (`scrollY` 0) nada é seguro: a barra fica à vista. Medido no E2E "ajustes de leitura no meio da norma" (três toques seguidos em "A+", cinco em "A−", nas três telas, também no modo foco).
- **Vale para o próximo:** qualquer ajuste que mude a altura das linhas com a norma rolada (fonte de leitura, espaçamento, largura da coluna) pede o mesmo cuidado. A posição é o dispositivo, nunca os pixels.

### Diálogo com a letra do aparelho a 300%: a largura some

- **Sintoma:** a 300% de fonte, no celular, a folha dos ajustes de leitura ficava com 288 px dos 390 da tela e rolava de lado por dentro (93 px).
- **Causa:** a folha de estilo do navegador limita o `<dialog>` a `max-width: calc(100% - 6px - 2em)`, e o `em` cresce com a letra; a margem e o recuo em `rem` tomavam mais 200 px; e um link com `white-space: nowrap` não cabia na linha.
- **Solução:** na `.dialogo-ajustes`, `max-width: none` (a largura já é `min(24rem, 100vw - 2 margens)`), margem e recuo com teto em px (`min(1rem, 16px)`), o título e o "Fechar" quebram de linha (`flex-wrap`) e nada leva `nowrap`. Conferido pelo E2E "ajustes de leitura com a letra do aparelho a 300%".
- **Não medido:** os outros diálogos seguem com o limite em `em` do navegador e o recuo em `rem`.
