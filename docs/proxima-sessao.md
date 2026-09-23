# Próxima sessão — ponto de partida

Atualizado em 23/09/2026. Ler antes de qualquer trabalho (junto com o `CLAUDE.md`). Problemas conhecidos, armadilhas e suas soluções: [`solucao-de-problemas.md`](solucao-de-problemas.md). Vocabulário → identificadores: [`glossario.md`](glossario.md).

## Estado

- **F0 (Fundamentos) e F1 (Recall + pontos do edital) implementadas**, revisadas e testadas. **Portões:** [`portoes/F0.md`](portoes/F0.md), **fechado em 23/09/2026**, e [`portoes/F1.md`](portoes/F1.md), aguardando o uso real.
- **Tudo no `main` desde 23/09/2026:** merge dos PRs [#1](https://github.com/gabrieldjcosta/arretado/pull/1) (F0/F1) e [#2](https://github.com/gabrieldjcosta/arretado/pull/2). O #2 trouxe o plano da F2, a 7.1, o projeto Supabase (4.3), a T17 no Cloudflare, o glossário e o arquivo de solução de problemas. Toda sessão nova já parte do código atual.
- **Verificação:**
  - 353 testes unitários e de integração, incluindo a integridade do corpus da F2;
  - 82 E2E (Playwright + axe, desktop e celular);
  - carga de 10 mil registros;
  - CI verde.
- **Decisão de escopo (23/09/2026):** nada do Acervo antigo nem do Acumen v2 é importado; o conteúdo recomeça do zero (nota no topo das Partes 1 e 2).
- **F2 (Legislação) em execução**, em paralelo ao uso real da F1. Plano em [`planos/F2.md`](planos/F2.md).
  - Feito: 7.1, o corpus de 5 normas em 7 páginas, em `corpus/normas/`.
  - **Próxima atividade: 7.2** (captura do colar), depois 7.3 (gabarito) e 8.1 (tipos do rascunho e normalização).

## Como abrir a próxima sessão (meta: até ~200 mil tokens por sessão)

Abrir uma sessão nova do Claude Code no repositório. Ela parte do `main` atualizado. Pedido sugerido:

> Leia `docs/proxima-sessao.md` e execute a próxima atividade da F2 seguindo a rotina de pronto do plano. Ao terminar, atualize este arquivo e `docs/solucao-de-problemas.md`, faça o commit num branch com PR para o `main` e me avise.

Uma sessão por atividade ou por par de atividades pequenas (7.2 + 7.3 cabem juntas; da etapa 8 em diante, uma por atividade). Regras de economia de contexto no `CLAUDE.md`.

## Projeto Supabase (atividade 4.3, concluída em 23/09/2026)

| | |
|---|---|
| Nome · referência | `arretado` · `dgwoemewvpabbppascuw` |
| URL pública | https://dgwoemewvpabbppascuw.supabase.co |
| Região · banco | `sa-east-1` (São Paulo) · Postgres 17 |
| Organização · plano | GJC's Org (`phapzxwurkbwklanvxdy`) · free, US$ 0 (pausa após 7 dias sem uso; reativar no painel ou com `restore_project`) |

Migrações aplicadas pelo conector, idênticas ao repositório (MD5 conferido; conferência de 23/09/2026 também confirmou as duas no remoto e o projeto ativo). O `apply_migration` registra a versão com o horário UTC da aplicação, não com o prefixo do arquivo:

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
2. Production branch: `main`.
3. Framework preset: **None**. Build command: `npm run build`. Build output directory: `dist`.
4. Deploy. Conferir no celular: abrir a URL, registrar um erro, revisar; em Conta › Dados, exportar.
5. Conferir os cabeçalhos (no Git Bash): `curl -sI https://<projeto>.pages.dev | grep -i content-security`. No PowerShell, usar `curl.exe` e `findstr /i`.
6. A importação por URL da F2 (T17, atividades 12.1–12.2) roda como Cloudflare Pages Function neste mesmo projeto. Quando `functions/api/buscar-norma.ts` existir, ela sobe junto com o site, sem configuração extra no painel. Plano B, se uma lei imensa estourar o limite de processamento: Edge Function no projeto Supabase, aceitando a pausa (ver T17).

Os dados ficam no navegador de cada endereço. Usar sempre a mesma URL publicada; trocar de endereço ou de navegador pede exportar e importar em Conta › Dados.

### 2. Uso real da F1 (portão)

14 dias com revisão feita em pelo menos 10; metas em [`portoes/F1.md`](portoes/F1.md). Backup semanal em Conta › Dados › Exportar. Relatar problemas pelo "!".

### 3. Executar a F2 (Legislação) — plano em [`planos/F2.md`](planos/F2.md)

**Exceção à regra de fases (Gabriel, 23/09/2026):** a F2 roda já, em paralelo ao uso real da F1. O portão da F1 (item 2) continua sendo medido; a F3 só começa depois do portão da F2. O app publicado só recebe F2 ao fim de cada etapa revisada, e a subida de esquema (atividade 9.1) exige backup manual antes da publicação.

Seguir as etapas 7–13 do plano, na ordem do caminho crítico: 7 → 8 → 9 → 10/11 → 13, com a 12 correndo por fora.

- **Agora: 7.2 → 7.3** (captura do colar e gabarito). A 7.1 está feita; ver "Andamento" e "Fatos das fontes" no plano.
- **Primeiro passo da 7.2:** ensinar `verificarCorpus` e `baixarCorpus` a reconhecer os derivados (`*.colado.html`, `*.gabarito.json`). Hoje todo `.html` fora do manifesto quebra o `npm test` e é apagado pelo `npm run corpus`.
- **Tempo do Gabriel:** a conferência da amostra do gabarito pede ~30 min por lei.
- **Ler antes:** a Parte 2 §10.6 e a skill `acumen-extrair-normas`. As armadilhas do Planalto estão no plano e em `solucao-de-problemas.md`, seção Legislação.
- Sem importador do Acervo (decisão de escopo).
- O sanitizador (`src/core/seguranca/sanitizador.ts`) já entrega blocos com tachado, ênfase e link: é a entrada do estruturador.

### 4. Decisões pequenas que esperam o Gabriel (sem pressa; cada uma tem atividade)

- `Estrela.tipoOrigem` × `Cartao.origemTipo`: alinhar para `origemTipo` antes da 11.2, enquanto `estrelas` não tem dado (glossário §13).
- Rótulo "Ponto de restauração" para o Snapshot: "Ponto" é reservado ao item do edital (glossário §13).
- Termos marcados como "proposto" no glossário §12 (segmentos do endereço canônico, `'vetado'` no `status`, ordem com sufixo): decidir na atividade indicada.

## Como validar tudo

```
npm run check      # formato, lint, tipos, 353 testes (inclui integridade do corpus), auditoria
npm run carga      # 10 mil registros dentro dos limiares
npm run test:e2e   # 82 cenários (Playwright + axe)
npm run build      # dist/ com _headers
```

## Mapa do código

Nomes, entidades, eventos e operações em detalhe: [`glossario.md`](glossario.md).

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
