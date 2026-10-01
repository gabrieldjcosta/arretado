Leia docs/proxima-sessao.md e execute a 8.8 (reserva em texto puro: tudo fica "a confirmar"; redação anterior detectada por heurística, endereço repetido + "Redação dada"), seguindo a rotina de pronto do plano.

Contexto novo (01/10/2026): o Gabriel sai de férias em cerca de uma semana e quer estudar no Arretado. A ordem passou a ser 8.8 → 8.9 → 8.10 (subida do esquema `vetado`, com backup dele) → 9.8 → etapa 11 (11.1, 11.6, 11.4, 11.2, 11.3, 11.5, 11.8, 11.9) → uso das férias → etapa 10 → 11.7. Ver "Decisões de 01/10/2026" no plano. A reconferência dos gabaritos não trava a 8.9.

Antes de começar, leia só:
* no proxima-sessao.md, "Ordem das férias" e a seção da 8.7;
* no plano (docs/planos/F2.md): a linha da 8.8; "Fatos do estruturador (8.7)"; "Rotina de cada atividade";
* na Parte 2 §10.6, a regra do texto puro;
* em solucao-de-problemas.md: "Previsível na 8.8 e na etapa 10".
Não abra inteiros *.html, *.colado.html nem o package-lock. Use git grep, faixas de linhas ou script Node que imprima o mínimo.

Critérios: teste com o texto puro das mesmas leis (`*.colado.txt`); `npm run check` verde (no Windows, `--maxWorkers=4` se falhar só por tempo); termo novo no glossário; problemas em solucao-de-problemas.md; atualize proxima-sessao.md (próxima: 8.9; hora do merge do #27) e o plano (8.8 com ✅); commit num branch com PR para o main, merge por "Create a merge commit", e me avise.

Esforço P: se passar de ~200 mil tokens, pare no que estiver verde, atualize o proxima-sessao.md e me avise.
