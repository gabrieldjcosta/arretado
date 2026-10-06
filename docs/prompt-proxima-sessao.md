Leia docs/proxima-sessao.md e execute a 11.1 (modo foco), seguindo a rotina de pronto do plano.

Contexto (decisões de 01/10/2026, plano em "Decisões de 01/10/2026"): o Gabriel sai de férias e quer estudar no Arretado. Ordem: 8.10 e 9.8 feitas → etapa 11 (11.1, 11.6, 11.4, 11.2, 11.3, 11.5, 11.8, 11.9) → uso das férias → reconferência dos gabaritos → etapa 10 → 11.7 → /code-review das etapas 8, 9 e 11 → 13. O uso das férias (o marco antecipado) começa assim que a 11.1 estiver publicada.

Antes de começar, leia só:
* no proxima-sessao.md: "Ordem das férias", "Feita: 9.8", "Feita: 9.7" e a seção 4;
* no plano (docs/planos/F2.md): a linha da 11.1 e o cabeçalho da etapa 11; "Fatos do leitor descobertos na 9.6"; "Fatos da posição descobertos na 9.7"; "Fatos do destaque descobertos na 9.8" (o botão "Destaques" e a legenda ficam na barra do leitor, que rola com a página); "Rotina de cada atividade";
* em solucao-de-problemas.md: "Posição de leitura perdida" (o previsível da 11.1), "Atalho de teclado rouba a tecla de outro controle", "Celular: seleção, toque longo e navegador não testado" e "npm run check falha no Windows…".
Não abra inteiros *.html, *.colado.html, *.colado.txt, *.gabarito.json nem o package-lock. Use git grep, faixas de linhas ou um script Node que imprima o mínimo.

11.1: modo foco: só o texto, botão fixo semitransparente para sair, atalho de teclado (só fora de campo de texto), saída na mesma posição (o `posicaoId` da 9.7, não pixels), nos 3 tamanhos (celular, tablet e desktop). Novo projeto "tablet" no Playwright. Decidir com cuidado onde ficam no modo foco o "Lido até aqui", o "Destaques" e o A−/A+ (registrar a decisão no plano).

Critérios: `npm run check` verde (no Windows, se falhar só por tempo, `--maxWorkers=3` e cada arquivo que falhou sozinho; o CI do PR é a referência); E2E verde nos 3 tamanhos (com o Chrome instalado, ver solucao-de-problemas); termo novo no glossário (o "modo foco" está como proposto); problemas em solucao-de-problemas.md; proxima-sessao.md atualizado (próxima: 11.6; hora do merge do PR da 9.8) e o plano (11.1 com ✅); commit num branch com PR para o main, merge por "Create a merge commit".

Sem subida de esquema prevista (a preferência de modo foco, se houver, opcional como a da 9.8). Esforço P: se passar de ~200 mil tokens, pare no que estiver verde, atualize o proxima-sessao.md e me avise.
