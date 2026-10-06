Leia docs/proxima-sessao.md e execute a 11.6 (busca dentro da norma), seguindo a rotina de pronto do plano.

Contexto (decisões de 01/10/2026, plano em "Decisões de 01/10/2026"): o Gabriel está de férias estudando no Arretado. Ordem: 11.1 feita → 11.6 → 11.4 → 11.2 → 11.3 → 11.5 → 11.8 → 11.9 → reconferência dos gabaritos → etapa 10 → 11.7 → /code-review das etapas 8, 9 e 11 → 13. Relatos do uso das férias que chegarem antes têm prioridade (sessão curta de correção, registrada em solucao-de-problemas.md).

Antes de começar, leia só:
* no proxima-sessao.md: "Ordem das férias", "Feita: 11.1", "Feita: 9.7" e a seção 4;
* no plano (docs/planos/F2.md): a linha da 11.6 e o cabeçalho da etapa 11; "Fatos do leitor descobertos na 9.6"; "Fatos da posição descobertos na 9.7"; "Fatos do modo foco descobertos na 11.1"; "Fatos da normalização descobertos na 8.1" (a `chaveDeCasamento`); "Rotina de cada atividade";
* no glossário: as linhas "Ações por dispositivo" (`analisarEndereco`) e "Modo foco";
* em solucao-de-problemas.md: "Posição de leitura perdida" (o previsível depois da 11.1), "Atalho de teclado rouba a tecla de outro controle" (o atalho da busca não usa F nem E) e "npm run check falha no Windows…".
Não abra inteiros *.html, *.colado.html, *.colado.txt, *.gabarito.json nem o package-lock. Use git grep, faixas de linhas ou um script Node que imprima o mínimo.

11.6: busca dentro da norma, por texto (sem acento e sem caixa, pela `chaveDeCasamento`) e por endereço ("112", "art. 112", "§ 2º do 112", "112, § 2º", "art. 5º, LXXIV", com sufixo "9-A"); `analisarEndereco(texto)` puro e testado com casos da LEP, do CP e da CF. O Ctrl+F do navegador não acha o texto fora da tela (a lista é virtualizada): a busca é o caminho. "Ir para" o resultado leva o dispositivo ao alto da tela como o "Ir ao lido até" (`scrollToIndex` e conferência), sem mexer no "lido até". Decidir com cuidado onde fica a busca no modo foco e no celular (registrar no plano).

Critérios: `npm run check` verde (no Windows, se falhar só por tempo, `--maxWorkers=3` e cada arquivo que falhou sozinho; o CI do PR é a referência); E2E verde nos 3 aparelhos (desktop, celular e tablet; com o Chrome instalado, ver solucao-de-problemas); termo novo no glossário; problemas em solucao-de-problemas.md; proxima-sessao.md atualizado (próxima: 11.4; hora do merge do PR da 11.1) e o plano (11.6 com ✅); commit num branch com PR para o main, merge por "Create a merge commit".

Sem subida de esquema prevista. Esforço P: se passar de ~200 mil tokens, pare no que estiver verde, atualize o proxima-sessao.md e me avise.
