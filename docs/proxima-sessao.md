# Próxima sessão — ponto de partida

Atualizado em 23/09/2026. Ler antes de qualquer trabalho (junto com o `CLAUDE.md`).

## Estado

- **F0 (Fundamentos) e F1 (Recall + pontos do edital) implementadas**, revisadas e testadas.
- Código no branch `claude/awesome-ride-cb1sfz`, no PR [gabrieldjcosta/arretado#1](https://github.com/gabrieldjcosta/arretado/pull/1) para o `main` (revisão do Gabriel).
- F2 e a atividade 4.3 (projeto Supabase) no branch `claude/planejamento-proxima-etapa-09df32`, no PR [gabrieldjcosta/arretado#2](https://github.com/gabrieldjcosta/arretado/pull/2), empilhado sobre o #1.
- Verificação: 353 testes unitários/integração (inclui a integridade do corpus da F2), 82 E2E (Playwright + axe, desktop e celular), carga de 10 mil registros, CI verde.
- Portões: [`portoes/F0.md`](portoes/F0.md) (**fechado em 23/09/2026**) e [`portoes/F1.md`](portoes/F1.md).
- **Decisão de escopo (23/09/2026):** nada do Acervo antigo nem do Acumen v2 é importado; o conteúdo recomeça do zero (nota no topo das Partes 1 e 2).
- **F2 (Legislação) planejada e liberada para execução já (23/09/2026)**, em paralelo ao uso real da F1: plano em [`planos/F2.md`](planos/F2.md). **7.1 concluída (corpus de 5 normas em 7 páginas, em `corpus/normas/`); próxima atividade: 7.2** (captura do colar).

## Projeto Supabase (atividade 4.3, concluída em 23/09/2026)

| | |
|---|---|
| Nome · referência | `arretado` · `dgwoemewvpabbppascuw` |
| URL pública | https://dgwoemewvpabbppascuw.supabase.co |
| Região · banco | `sa-east-1` (São Paulo) · Postgres 17 |
| Organização · plano | GJC's Org (`phapzxwurkbwklanvxdy`) · free, US$ 0 (pausa após 7 dias sem uso; reativar no painel ou com `restore_project`) |

Migrações aplicadas pelo conector, idênticas ao repositório (MD5 conferido). O `apply_migration` registra a versão com o horário UTC da aplicação, não com o prefixo do arquivo:

| Arquivo no repositório | Versão no remoto |
|---|---|
| `20260923000000_esquema_inicial.sql` | `20260923030320` |
| `20260923000100_ajustes_advisors.sql` | `20260923030802` |

- **Advisors:** segurança sem alertas. Desempenho: a migração `ajustes_advisors` corrigiu o aviso de duas políticas permissivas de leitura em `catalogo` e a chave estrangeira `catalogo.curador_id` sem índice. Fica só o aviso informativo "índice não usado", esperado até haver tráfego. `rls.test.ts` ganhou guardas para esses dois lints.
- **RLS no projeto real:** `supabase/verificacao-rls-remota.sql`, com 15 verificações numa transação desfeita. B não lê, não altera, não apaga e não grava em nome de A. Ninguém altera nem apaga o log, nem o próprio dono. O anônimo não lê dado pessoal. Repetir depois de toda migração nova.
- **Chaves:** nenhuma no repositório. A chave anônima só entra na F4.
- **Lembretes para a F4:** expor o esquema `arretado` na API (Settings › API › Exposed schemas). Se o projeto estiver pausado, reativá-lo antes. Se um dia adotar o Supabase CLI, alinhar as versões da tabela acima com `supabase migration repair`.

## Pendências, em ordem

### 1. Publicar no Cloudflare Pages — precisa da conta do Gabriel

O build já gera `dist/_headers` (CSP com `frame-ancestors`, HSTS, nosniff etc., a partir de `config/seguranca.ts`) e há `.node-version` = 22. No painel do Cloudflare:

1. Workers & Pages › Create › Pages › **Connect to Git** › repositório `gabrieldjcosta/arretado` (autorizar o app do Cloudflare no GitHub, com acesso ao repositório privado).
2. Production branch: `main` (depois do merge do PR).
3. Framework preset: **None**. Build command: `npm run build`. Build output directory: `dist`.
4. Deploy. Conferir no celular: abrir a URL, registrar um erro, revisar; em Conta › Dados, exportar.
5. Conferir os cabeçalhos: `curl -sI https://<projeto>.pages.dev | grep -i content-security`.
6. A importação por URL da F2 (T17, atividades 12.1–12.2) roda como Cloudflare Pages Function neste mesmo projeto. Quando `functions/api/buscar-norma.ts` existir, ela sobe junto com o site, sem configuração extra no painel. Plano B, se uma lei imensa estourar o limite de processamento: Edge Function no projeto Supabase, aceitando a pausa (ver T17).

### 2. Uso real da F1 (portão)

14 dias com revisão feita em pelo menos 10; metas em [`portoes/F1.md`](portoes/F1.md). Backup semanal em Conta › Dados › Exportar. Relatar problemas pelo "!".

### 3. Executar a F2 (Legislação) — plano em [`planos/F2.md`](planos/F2.md)

**Exceção à regra de fases (Gabriel, 23/09/2026):** a F2 roda já, em paralelo ao uso real da F1. O portão da F1 (item 2) continua sendo medido; a F3 só começa depois do portão da F2. O app publicado só recebe F2 ao fim de cada etapa revisada, e a subida de esquema (atividade 9.1) exige backup manual antes da publicação.

Seguir as etapas 7–13 do plano, na ordem do caminho crítico (7 → 8 → 9 → 10/11 → 13; a 12 corre por fora). Agora: **7.2 → 7.3** (captura do colar e gabarito; a 7.1 está feita — ver "Andamento" e "Fatos das fontes" no plano); a conferência da amostra do gabarito pede ~30 min do Gabriel por lei. Ler antes a Parte 2 §10.6 e a skill `acumen-extrair-normas` (armadilhas do Planalto listadas no plano). Sem importador do Acervo (decisão de escopo). O sanitizador (`src/core/seguranca/sanitizador.ts`) já entrega blocos com tachado, ênfase e link: é a entrada do estruturador.

## Armadilhas aprendidas nesta implementação

- **Escapes no texto das ferramentas:** sequências `\uXXXX` escritas no conteúdo de um comando ou arquivo chegam decodificadas (viram o caractere real); em 23/09/2026 aconteceu também com `
` dentro de texto JSON/Markdown gerado por script. Para gravar o escape num arquivo, gerar via script a partir do código do caractere. Varredura de caracteres invisíveis em `src/`:
  `node -e 'const fs=require("fs"),p=require("path");const r=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u00a0\u200b\ufeff\uffff\u0300-\u036f]/;(function a(d){for(const n of fs.readdirSync(d)){const f=p.join(d,n);fs.statSync(f).isDirectory()?a(f):/\.(ts|tsx|css)$/.test(n)&&r.test(fs.readFileSync(f,"utf8"))&&console.log(f)}})("src")'`
  (este documento é Markdown e não passa pelo Prettier; o comando acima foi escrito com os escapes literais).
- **Fontes de normas (7.1):** o Planalto derruba a conexão com o User-Agent padrão do Node (usar `Mozilla/5.0 (compatible; …)`); Planalto e ALESP injetam um `<script>` diferente a cada requisição, então hash de norma é sempre sobre o conteúdo sem scripts (ou sanitizado), nunca sobre os bytes. Detalhes em `planos/F2.md` › "Fatos das fontes".
- **Teste que lê arquivo do repositório:** o ambiente padrão do Vitest é jsdom, onde `import.meta.url` não é `file:`. Usar `// @vitest-environment node` e `import.meta.dirname` (como em `supabase/rls.test.ts`).
- **Transações do IndexedDB:** nada além de IndexedDB pode ser aguardado dentro de `repo.transacao` (WebCrypto, `fetch`, timers) — a transação fecha antes (`PrematureCommitError`). Calcular hashes antes.
- **Códigos de saída:** `comando | head` esconde falha. Encadear com `&&`, gravar saída em arquivo e depois filtrar.
- **Playwright fixado em 1.56.1** (o Chromium do contêiner é o `chromium-1194`); `playwright-core` fixado junto para o `@axe-core/playwright` não puxar outra versão. No Windows, rodar `npx playwright install chromium` uma vez.
- **zod em modo `jitless`** (`src/core/modelo/comum.ts`): sem isso o zod sonda `Function('')` e a CSP registra violação.
- **Entrada controlada com gravação assíncrona** precisa de estado local otimista (ver `AparenciaConta.tsx`), senão a tela "volta" antes de gravar.
- **Regras do React Compiler no lint** (`eslint-plugin-react-hooks` 7): sem `setState` síncrono em efeito, sem ler `ref` durante a renderização, carregadores estáveis (fora do componente ou `useCallback`) para `useDados`.
- **Camadas** impostas pelo lint (`eslint/regra-camadas.js`): Dexie só em `src/core/persistencia`, DOMPurify só em `src/core/seguranca`, domínio não importa outro domínio.
- **TypeScript fixado em ~6.0** porque o `typescript-eslint` ainda não aceita o 7.
- **Revisão por etapa:** o `/code-review` achou problemas reais em todas as etapas; manter o hábito ao fim de cada bloco.
- **`execute_sql` do conector Supabase** devolve só o resultado do último comando que retorna linhas (o `rollback` final não conta). Para várias verificações num lote, gravar numa tabela temporária e ler no fim; recusas esperadas vão dentro de `do $$ … exception when others … $$` (ver `supabase/verificacao-rls-remota.sql`).
- **`npm run check` instável no Windows sob carga:** em 23/09/2026, duas de quatro rodadas falharam sem relação com o código. Numa, o sistema de arquivos devolveu `UNKNOWN: lstat 'C:\'` e falhou ao abrir arquivos do `node_modules`. Na outra, o boot do PGlite estourou os 10 s do `beforeAll` do `rls.test.ts`. Rodar de novo; se o timeout do PGlite se repetir, dar um limite maior só a esse `beforeAll`.
- **Migração nova no Supabase:** primeiro no repositório, com `npm run check` verde (o `rls.test.ts` aplica todas em PGlite); depois `apply_migration` com o conteúdo do arquivo sem editar; depois advisors e `verificacao-rls-remota.sql`. Nunca direto no painel.

## Como validar tudo

```
npm run check      # formato, lint, tipos, 353 testes (inclui integridade do corpus), auditoria
npm run carga      # 10 mil registros dentro dos limiares
npm run test:e2e   # 82 cenários (Playwright + axe)
npm run build      # dist/ com _headers
```

## Mapa do código

```
config/seguranca.ts           CSP e cabeçalhos da hospedagem (fonte única)
eslint/regra-camadas.js       dependências entre camadas (Parte 1 §6)
src/core/modelo/              esquemas zod de todas as entidades + registro ENTIDADES
src/core/persistencia/        Dexie, coleções paginadas, log de alterações, Repositorio
src/core/eventos/             barramento em processo
src/core/pacote/              .arretado: exportar, ler, cifra, 7 modos, snapshot, espaços
src/core/seguranca/           sanitizador de HTML → estrutura
src/dominios/recall/          agendamento (6 caixas), causa sugerida, serviço do Recall
src/integracoes/pontos/       CSV da planilha do Ciclo → Disciplinas e Pontos
src/suporte/relatos.ts        "!" Relatar problema
src/apresentacao/             shell, Conta › Dados/Aparência/Privacidade, Orientações,
                              Recall (captura, completar, abas, drill), Plano
supabase/migrations/          esquema remoto com RLS; teste em supabase/rls.test.ts
supabase/verificacao-rls-remota.sql   conferência da RLS no projeto real (não é migração)
scripts/corpus-normas.mjs     npm run corpus: baixa o corpus de normas (F2, 7.1)
corpus/normas/                páginas oficiais byte a byte + manifesto.json (hashes, charset)
e2e/                          Playwright + axe; vigilância automática de CSP e console
```
