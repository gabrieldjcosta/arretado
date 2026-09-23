# Arretado — Decisões técnicas de implementação (T1–T15)

> Fecha as quatro escolhas que a especificação deixou em aberto (linguagem, framework de interface,
> biblioteca de acesso ao IndexedDB, formato do pacote de backup) e as escolhas de ferramenta que
> decorrem delas. Confirmadas com o Gabriel em 22/09/2026. Obedecem às decisões D1–D24
> (`especificacao-parte1.md` §19) — nunca o contrário. Mesmo formato daquela tabela.

## Restrições que condicionaram as escolhas

- Local-first, offline total desde F0; o banco local **é** o dado, o remoto é espelho (D1, §14.6).
- IndexedDB "sob camada de coleções, paginado e indexado"; SQLite-wasm só se F8 exigir (D2, §14.1).
- Postgres via Supabase atrás de adaptador; esquema + RLS criados em F0, usados em F4 (D3).
- Pacote de backup = arquivo único com manifesto + um arquivo por módulo + log opcional + anexos
  opcionais; hash por arquivo e do conjunto; cifra opcional por senha; sete modos de importação (D21, §12).
- Ids gerados no cliente, globalmente únicos e ordenáveis por tempo (§8.1).
- HTML colado é sanitizado e convertido em estrutura; a interface nunca exibe HTML bruto (D13, D18).
- Leitor renderiza por janela; norma de 2 mil dispositivos abre em < 1 s (§10.6).
- Vocabulário canônico em PT-BR na interface **e no código** (D24).
- Ambiente: Windows; Node.js como linguagem de automação; o parser da skill `acumen-extrair-normas`
  (`extrair_lei.js`, Node puro) é a base conceitual do estruturador da F2.

## Tabela de decisões

| # | Decisão | Motivo | Alternativa descartada | Consequência | Revisão futura |
|---|---|---|---|---|---|
| T1 | **TypeScript** (modo `strict`) em todo o projeto: app, testes, scripts, migrações | Parser existente já é JS; Supabase gera tipos TS a partir do esquema; um só toolchain para tudo (Node disponível, Python não) | Kotlin Multiplatform / Flutter (app nativo desnecessário para PWA); Rust + wasm (custo sem ganho no volume esperado) | Domínios tipados; esquemas de entidade, pacote e preferências validados por tipo (T7) | Não |
| T2 | **Vite + React 19**, SPA sem SSR | Maior ecossistema para virtualização do leitor, PWA e primitivos acessíveis; melhor cobertura para desenvolvimento assistido; não há servidor de renderização em app local-first | Next.js (SSR e servidor sem função aqui); Svelte 5 e SolidJS (menos bibliotecas maduras para leitor virtualizado e a11y — mais código à mão) | `vite-plugin-pwa` entra em F4; `@tanstack/react-virtual` no leitor em F2 | Não |
| T3 | **Dexie 4** como camada de coleções sobre IndexedDB, sempre **atrás de repositórios próprios** em `core/persistencia`; domínios nunca importam Dexie | Índices compostos, paginação por cursor, `version().upgrade()` para migrações idempotentes, transações multi-tabela, `liveQuery` para UI reativa — é exatamente a "camada de coleções" de D2 | `idb` (fino demais: sem migração nem índice composto declarativos); RxDB (traz motor de replicação e modelo de conflito próprios, que colidem com D17); SQLite-wasm (adiado por D2) | Troca por SQLite-wasm em F8 sem tocar domínios; toda consulta é paginada pelo repositório | SQLite-wasm se consultas locais complexas crescerem (D2) |
| T4 | **Ids UUIDv7** (pacote `uuid`), gerados no cliente | Ordenáveis por tempo (§8.1); tipo `uuid` nativo no Postgres (D3); únicos entre aparelhos sem coordenação | ULID (sem tipo nativo no Postgres; conversão em toda borda); UUIDv4 (não ordenável); autoincremento (colide entre aparelhos) | Toda entidade tem `id: string` UUIDv7; ordenação por `id` equivale a ordenação por criação | Não |
| T5 | **Log de alterações** como tabela `alteracoes` gravada **na mesma transação** da entidade; cada entrada tem `seq` (local, monotônico), `tsLogico` (relógio híbrido: ms de parede + contador), `aparelhoId`, `usuarioId`, `entidade`, `entidadeId`, `operacao`, `campos` | Base do sync por log (D17, §14.5), do rollback de importação (D21) e da auditoria; a escrita atômica impede log e entidade divergirem | Hooks `creating/updating` do Dexie (não cobrem operações em lote nem transações externas); CRDT (descartado em D17) | Toda escrita passa por `Repositorio.salvar()` / `excluir()`; `db.tabela.put` direto é proibido por regra de dependência | Não |
| T6 | **Pacote `.arretado`** = arquivo **ZIP** (via `fflate`) com `manifesto.json` + `modulos/<modulo>.ndjson` + `log/alteracoes.ndjson` (opcional) + `anexos/` (opcional). **Hash SHA-256** (WebCrypto) por arquivo e do conjunto, gravados no manifesto. **Cifra opcional AES-256-GCM** com chave derivada da senha por **PBKDF2-SHA-256, 600 mil iterações**: o ZIP interno inteiro vira `payload.bin`; o `manifesto.json` externo fica em claro só com `{formato, versaoEsquema, cifrado, kdf, salt, iv}` | Atende §12.1 literalmente; NDJSON (um registro por linha) é streamável, diffável e permite hash por módulo; WebCrypto é nativo no navegador (sem wasm) | JSON único (não escala, sem hash por módulo, sem anexos); arquivo SQLite (opaco fora do app); Argon2 (exige wasm) | Um formato serve a backup, snapshot e (F4) transporte de alterações; importação valida cada linha com Zod (T7); pacote de versão posterior é recusado pelo `versaoEsquema` do manifesto | Só se anexos exigirem streaming maior que a memória |
| T7 | **Zod** para esquemas de entidade, validação de importação e de preferências | "Validação de tipos em toda importação" (§7.2 e D18); infere os tipos TS a partir do esquema — uma fonte para tipo e validação | Valibot (menor, menos maduro); validação manual (frágil) | Cada entidade: `EsquemaX` + `type X = z.infer<typeof EsquemaX>` em `dominios/<dominio>/modelo.ts` | Não |
| T8 | **DOMPurify** com lista de permissão mínima (`p, br, em, strong, b, i, s, strike, del, a[href], span`) seguido de conversor próprio **HTML → blocos** em `core/seguranca/sanitizar.ts`; a interface só renderiza a partir da estrutura | Sanitizador maduro e testado contra XSS; a conversão para estrutura garante que HTML bruto nunca chega ao DOM (D13, D18) | Renderizar HTML sanitizado com `dangerouslySetInnerHTML` (viola "nunca exibe HTML bruto"); parser de HTML próprio (reinventa o difícil) | Conjunto de HTML malicioso em `tests/seguranca/` é critério de aceite de F0; CSP via `<meta>` em F0 e via cabeçalhos do host em F4 (ver T15) | Não |
| T9 | **Tailwind CSS v4** + primitivos **Radix UI** (apenas Dialog, DropdownMenu, Tabs, Switch, Toggle) com tokens de tema próprios; sem biblioteca de componentes completa | Acessibilidade de teclado e foco pronta nos primitivos (§11); visual sóbrio sob controle; poucas dependências | shadcn/ui completo (excesso de código copiado e visual genérico a domar); CSS puro (mais lento para iterar; a11y de diálogo e menu à mão) | Tema claro/escuro/sistema por variáveis CSS em `:root`; alvos ≥ 44 px como classe utilitária; o Radix aplica estilo inline, o que condiciona a CSP (T15) | Não |
| T10 | **react-router 7** (modo biblioteca) para as quatro áreas + Conta; estado de interface mínimo em **Zustand** (tema, sessão ativa, captura aberta); leituras reativas via `useLiveQuery` (`dexie-react-hooks`) | Poucas rotas fixas (D6); dados vêm do banco local reativo, não de loaders; sem estado global de servidor | TanStack Router (mais do que o necessário); Redux (cerimônia) | Posição de rolagem e filtro preservados por rota (§9.1) | Não |
| T11 | **Vitest** + `fake-indexeddb` (repositórios, log, pacote, migrações) + **Testing Library** (componentes) + **Playwright** (roteiros de aceite: exportar → apagar → restaurar; carga sintética) | Os critérios de aceite de F0 (§15, §17) são testáveis automaticamente | Jest (mais lento com ESM/Vite) | `npm test` = unitários; `npm run e2e` = aceite; ambos em CI | Não |
| T12 | **npm** · **Biome** (lint + formatação) · **dependency-cruiser** impondo as regras de dependência do §6 | npm já instalado e suficiente para um pacote; um binário de lint; regras de camada verificadas por ferramenta, não por disciplina | pnpm (ganho pequeno num único pacote; não instalado); ESLint + Prettier (dois binários, mais configuração) | `npm run check` = biome + tsc + depcruise; falha bloqueia | pnpm se virar monorepo |
| T13 | **Supabase**: projeto na região **sa-east-1 (São Paulo)**; esquema em `supabase/migrations/*.sql` versionado no repositório; CLI via `npx supabase`; RLS em toda tabela pessoal desde a primeira migração; **nenhuma chamada no cliente até F4** | D3 e §14.2; migrações no repositório mantêm "F4 é ligar, não reconstruir" | Console manual (não versionado, não reproduzível) | Criar o projeto é ação externa na conta do Gabriel — só após confirmação explícita; chave publicável nunca entra no repositório (`.env`) | Não |
| T14 | **Nomenclatura**: entidades, campos, pastas, eventos e serviços em **PT-BR sem acento** (`Cartao`, `Revisao`, `usuarioId`, `core/persistencia`, `erro.registrado`); termos de bibliotecas de terceiros permanecem como são | D24 exige vocabulário canônico no código; evita mistura `Card`/`Cartão` e tradução na borda | Código em inglês com interface em português | `docs/glossario.md` mapeia vocabulário → identificadores; revisão de código confere o glossário | Não |

| T15 | **CSP**: `script-src 'self'` estrito (sem `unsafe-inline`, sem `unsafe-eval`, sem origem externa); `style-src` com `'unsafe-inline'`; `frame-ancestors` só por cabeçalho, na F4 | Atributos `style` aplicados por JavaScript **não** podem ser autorizados por nonce, e toda biblioteca de interface os usa (o Radix escreve `pointer-events` no body ao abrir um diálogo). O que barra XSS é o `script-src`; estilo inline permite, no pior caso, exfiltração por CSS e sobreposição visual | CSP totalmente estrita (quebra qualquer biblioteca de interface); abandonar o Radix e refazer diálogo, menu e abas à mão (perde a acessibilidade pronta) | O risco residual é pequeno porque entrada hostil nunca vira marcação nem estilo, só texto dentro de estrutura (D13, T8); `tests/seguranca/csp.test.ts` impede que o `script-src` seja afrouxado depois | Rever se surgir política que dispense estilo inline |

## Decisões secundárias

- **Hospedagem estática** é decidida em F4 (Cloudflare Pages ou Vercel): GitHub Pages não permite
  cabeçalhos HTTP, e a CSP completa (com `frame-ancestors`) exige cabeçalho.
- **Hashes** sempre por `crypto.subtle` (SHA-256); nunca biblioteca JS de hash.
- **Node ≥ 24** fixado em `package.json` (`engines`) e `.nvmrc`.
- **Aliases de importação**: `@core/*`, `@dominios/*`, `@integracoes/*`, `@apresentacao/*`, `@suporte/*`.
- **Sem `dangerouslySetInnerHTML`** em lugar nenhum (regra de lint). Texto de norma é renderizado a
  partir de blocos estruturados.
- **Preferências** são registros na tabela `preferencias` (não `localStorage`), para entrarem no pacote.

## Estrutura de pastas (espelha o §6 da Parte 1)

```
arretado/
├─ docs/                      especificação, este documento, glossário
├─ supabase/migrations/       esquema remoto versionado (T13)
├─ src/
│  ├─ core/
│  │  ├─ ids.ts               UUIDv7 (T4)
│  │  ├─ identidade/          usuarioId local, Aparelho
│  │  ├─ persistencia/        db.ts (Dexie), repositorio.ts, paginacao.ts, migracoes/
│  │  ├─ log/                 alteracoes (T5), relogio.ts
│  │  ├─ esquema/             versao.ts, migrar.ts
│  │  ├─ backup/              pacote.ts, manifesto.ts, cifra.ts, importar.ts (7 modos), snapshot.ts
│  │  ├─ seguranca/           sanitizar.ts, csp.ts
│  │  ├─ eventos/             barramento.ts (tipado, em processo, payload = ids)
│  │  └─ preferencias/
│  ├─ dominios/               plano/ execucao/ recall/ legislacao/ catalogo/ precedentes/ notas/ inteligencia/
│  │                          (cada um: modelo.ts, servico.ts, eventos.ts — sem componentes de interface)
│  ├─ integracoes/            importadores/ exportadores/ verificador/
│  ├─ apresentacao/           shell/ componentes/ areas/{hoje,plano,recall,biblioteca,conta}
│  ├─ suporte/                orientacoes/ (conteúdo estático versionado), relatar/
│  └─ main.tsx
├─ tests/                     seguranca/ backup/ persistencia/
└─ e2e/
```

**Regras de dependência (verificadas por dependency-cruiser):**

| De | Pode importar | Não pode importar |
|---|---|---|
| `core` | `core` | tudo o mais |
| `dominios/<x>` | `core`, `dominios/<x>`; `dominios/legislacao` pode **ler** `dominios/catalogo` | outros domínios, `apresentacao`, `integracoes` |
| `integracoes` | `core`, `dominios` (serviços públicos) | `apresentacao` |
| `apresentacao`, `suporte` | `core`, `dominios`, `integracoes`, `suporte`, `apresentacao` | — |
| qualquer lugar fora de `core/persistencia` | — | `dexie` diretamente |

## Como cada decisão obedece a D1–D24

| D | Atendida por |
|---|---|
| D1 local-first | T3 (banco local é o dado), T5 (log), T13 (remoto só em F4) |
| D2 IndexedDB com camada de coleções | T3 |
| D3 Supabase atrás de adaptador | T13; adaptador em `core/sincronizacao` (F4) usa tipos gerados |
| D9/D10 Recall | T7 (esquemas com 2 obrigatórios), T14 (nomes) |
| D11/D12 Dispositivo e duas camadas | T7 (modelo em `dominios/legislacao/modelo.ts`), T4 (ids estáveis) |
| D13 HTML colado | T8 |
| D17 sync por log, aparelho único | T5 (log com `aparelhoId`, `tsLogico`), T4 (ids sem coordenação) |
| D18 segurança/LGPD | T8 (sanitização + CSP), T6 (cifra), T13 (RLS desde a 1ª migração) |
| D21 pacote com manifesto | T6, T7 |
| D24 vocabulário | T14 |
