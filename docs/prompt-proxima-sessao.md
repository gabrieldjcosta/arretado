Leia docs/proxima-sessao.md e execute a 8.10 (subida do esquema `vetado`), seguindo a rotina de pronto do plano.

Contexto (decisões de 01/10/2026, plano em "Decisões de 01/10/2026"): o Gabriel sai de férias em cerca de uma semana e quer estudar no Arretado. Ordem: 8.10 → 9.8 → etapa 11 (11.1, 11.6, 11.4, 11.2, 11.3, 11.5, 11.8, 11.9) → uso das férias → reconferência dos gabaritos → etapa 10 → 11.7 → /code-review das etapas 8, 9 e 11 → 13. A 8.10 é a única subida de esquema prevista antes do uso real e vem antes de ele importar a LEP e o ECA para ler (a reimportação cria outra norma).

Antes de começar, leia só:
* no proxima-sessao.md: "Ordem das férias", "Feita: 8.9", "Feita: 8.8" e a seção 4;
* no plano (docs/planos/F2.md): a linha da 8.10; "Fatos da subida de esquema descobertos na 9.1"; "Fatos da regressão do corpus descobertos na 8.9" (a métrica e a `LINHA_DE_BASE`, que acompanham o `vetado`); "Fatos do leitor descobertos na 9.6" (linha atenuada do revogado); "Rotina de cada atividade";
* em solucao-de-problemas.md: "Previsível na 8.10 (subida do esquema `vetado`)", o item "VETADO no modelo" de "Previsível na 8.7" e "npm run check falha no Windows…".
Não abra inteiros *.html, *.colado.html, *.colado.txt, *.gabarito.json nem o package-lock. Use git grep, faixas de linhas ou um script Node que imprima o mínimo.

8.10: `vetado` no enum `Dispositivo.status` (tipo e zod; o Supabase guarda `jsonb`, sem migração); tirar a troca em `registros.ts` (hoje grava `vigente` com "(VETADO)"); linha atenuada do vetado no leitor, como a do revogado; teste de subida com o pacote anterior (pacote sem `vetado` restaura). E2E do leitor com o ECA.

Critérios: `npm run check` verde (no Windows, se falhar só por tempo, `--maxWorkers=3` e o `desempenho.test.ts` sozinho; o CI do PR é a referência); E2E verde (com o Chrome instalado, ver solucao-de-problemas); a métrica da 8.9 sem queda; termo novo no glossário; problemas em solucao-de-problemas.md; proxima-sessao.md atualizado (próxima: 9.8; hora do merge do #29) e o plano (8.10 com ✅); commit num branch com PR para o main, merge por "Create a merge commit".

**Backup obrigatório antes do merge:** o PR da 8.10 sobe o esquema local. Antes de o Gabriel fazer o merge, ele exporta o backup (Conta › Dados › Exportar) no aparelho em uso e, depois do merge publicado, recarrega as abas abertas do Arretado. Lembre isso no PR e no aviso final.

Esforço P: se passar de ~200 mil tokens, pare no que estiver verde, atualize o proxima-sessao.md e me avise.
