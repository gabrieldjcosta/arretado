# Próxima sessão — ponto de partida

Atualizado em 23/09/2026. Ler antes de qualquer trabalho (junto com o `CLAUDE.md`).

## Estado

- **F0 (Fundamentos) e F1 (Recall + pontos do edital) implementadas**, revisadas e testadas.
- Código no branch `claude/awesome-ride-cb1sfz`, no PR [gabrieldjcosta/arretado#1](https://github.com/gabrieldjcosta/arretado/pull/1) para o `main` (revisão do Gabriel).
- Verificação: 329 testes unitários/integração, 82 E2E (Playwright + axe, desktop e celular), carga de 10 mil registros, CI verde.
- Portões: [`portoes/F0.md`](portoes/F0.md) e [`portoes/F1.md`](portoes/F1.md).
- **Decisão de escopo (23/09/2026):** nada do Acervo antigo nem do Acumen v2 é importado; o conteúdo recomeça do zero (nota no topo das Partes 1 e 2).
- **F2 (Legislação) planejada e liberada para execução já (23/09/2026)**, em paralelo ao uso real da F1: plano em [`planos/F2.md`](planos/F2.md). **7.1 concluída (corpus de 5 normas em 7 páginas, em `corpus/normas/`); próxima atividade: 7.2** (captura do colar).

## Pendências, em ordem

### 1. Criar o projeto Supabase real (atividade 4.3) — Gabriel já autorizou

Ferramentas do conector Supabase (MCP). Organização: **GJC's Org** (`phapzxwurkbwklanvxdy`, plano free, sem projetos em 23/09/2026).

1. `create_project`: nome `arretado`, região `sa-east-1`, organização acima. Se a ferramenta pedir confirmação de custo, o plano free custa US$ 0 (projeto pausa após 7 dias sem uso).
2. Aguardar `get_project` com status `ACTIVE_HEALTHY`.
3. `apply_migration`: nome `esquema_inicial`, conteúdo de `supabase/migrations/20260923000000_esquema_inicial.sql` (inteiro, sem editar).
4. `get_advisors` (`security` e `performance`): nenhum alerta crítico. Corrigir na migração do repositório (nova migração numerada), nunca direto no painel.
5. Conferir RLS com `execute_sql`, **sempre em transação desfeita**:
   ```sql
   begin;
   insert into auth.users (id) values ('0199a6c4-0000-7000-8000-00000000000a'), ('0199a6c4-0000-7000-8000-00000000000b');
   set local role authenticated;
   set local request.jwt.claim.sub = '0199a6c4-0000-7000-8000-00000000000a';
   -- inserir um registro de A, trocar o claim para B, conferir que B não vê/altera/apaga
   rollback;
   ```
   (Se `auth.users` exigir mais colunas, usar o mínimo que o Supabase aceitar; tudo é desfeito no `rollback`.)
6. Anotar em `portoes/F0.md` a linha "RLS … projeto real" como ✅ e registrar a referência do projeto (URL pública; **nenhuma chave no repositório** — a chave anônima só entra na F4).
7. Lembrete para a F4: expor o esquema `arretado` na API (Settings › API › Exposed schemas).
8. Com o projeto ativo, a F2 usa o mesmo projeto para a Edge Function `buscar-norma` (importação por URL, T17; atividades 12.1–12.2 do plano da F2): `verify_jwt = false`, sem chave no app, e `connect-src` da CSP passa a incluir `https://<ref>.supabase.co`. Publicar a função exige confirmação do Gabriel na hora.

### 2. Publicar no Cloudflare Pages — precisa da conta do Gabriel

O build já gera `dist/_headers` (CSP com `frame-ancestors`, HSTS, nosniff etc., a partir de `config/seguranca.ts`) e há `.node-version` = 22. No painel do Cloudflare:

1. Workers & Pages › Create › Pages › **Connect to Git** › repositório `gabrieldjcosta/arretado` (autorizar o app do Cloudflare no GitHub, com acesso ao repositório privado).
2. Production branch: `main` (depois do merge do PR).
3. Framework preset: **None**. Build command: `npm run build`. Build output directory: `dist`.
4. Deploy. Conferir no celular: abrir a URL, registrar um erro, revisar; em Conta › Dados, exportar.
5. Conferir os cabeçalhos: `curl -sI https://<projeto>.pages.dev | grep -i content-security`.

### 3. Uso real da F1 (portão)

14 dias com revisão feita em pelo menos 10; metas em [`portoes/F1.md`](portoes/F1.md). Backup semanal em Conta › Dados › Exportar. Relatar problemas pelo "!".

### 4. Executar a F2 (Legislação) — plano em [`planos/F2.md`](planos/F2.md)

**Exceção à regra de fases (Gabriel, 23/09/2026):** a F2 roda já, em paralelo ao uso real da F1. O portão da F1 (item 3) continua sendo medido; a F3 só começa depois do portão da F2. O app publicado só recebe F2 ao fim de cada etapa revisada, e a subida de esquema (atividade 9.1) exige backup manual antes da publicação.

Seguir as etapas 7–13 do plano, na ordem do caminho crítico (7 → 8 → 9 → 10/11 → 13; a 12 corre por fora). Agora: **7.2 → 7.3** (captura do colar e gabarito; a 7.1 está feita — ver "Andamento" e "Fatos das fontes" no plano); a conferência da amostra do gabarito pede ~30 min do Gabriel por lei. Ler antes a Parte 2 §10.6 e a skill `acumen-extrair-normas` (armadilhas do Planalto listadas no plano). Sem importador do Acervo (decisão de escopo). O sanitizador (`src/core/seguranca/sanitizador.ts`) já entrega blocos com tachado, ênfase e link: é a entrada do estruturador.

## Armadilhas aprendidas nesta implementação

- **Escapes no texto das ferramentas:** sequências `\uXXXX` escritas no conteúdo de um comando ou arquivo chegam decodificadas (viram o caractere real). Para gravar o escape num arquivo, gerar via script a partir do código do caractere. Varredura de caracteres invisíveis em `src/`:
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

## Como validar tudo

```
npm run check      # formato, lint, tipos, 346 testes (inclui integridade do corpus), auditoria
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
scripts/corpus-normas.mjs     npm run corpus: baixa o corpus de normas (F2, 7.1)
corpus/normas/                páginas oficiais byte a byte + manifesto.json (hashes, charset)
e2e/                          Playwright + axe; vigilância automática de CSP e console
```
