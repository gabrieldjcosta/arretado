# Arretado — Decisões técnicas de implementação

Complementa as decisões de produto e arquitetura **D1–D24** (Parte 1, §19). Estas decisões obedecem àquelas, nunca o contrário. Decididas com o Gabriel em 23/09/2026.

| # | Decisão | Motivo | Decisões D atendidas | Revisão futura |
|---|---|---|---|---|
| T1 | **TypeScript 6.0 estrito** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`) | Modelo de dados grande e com muitos campos opcionais; o compilador pega vínculo quebrado antes do uso | D4, D11 | TypeScript 7 (nativo) quando o typescript-eslint suportar |
| T2 | **React 19 + Vite 8** | Maior ecossistema para leitor virtualizado (F2), acessibilidade e testes | D6, D8 | Não |
| T3 | **react-router com roteamento por hash** | Hospedagem estática em qualquer lugar, sem servidor nem regra de reescrita; nada depende de rede | D1 | Rotas por caminho se houver hospedagem com reescrita |
| T4 | **Dexie 4** sob camada de coleções própria (`src/core/persistencia`); domínios nunca importam Dexie | Índices compostos, transações e consultas reativas maduros; a camada própria mantém a troca possível | D1, D2 | SQLite-wasm só se consultas locais exigirem (D2) |
| T5 | **zod 4** como fonte dos tipos e da validação de entrada | "Validação de tipos em toda importação" (§7.2) com um único esquema para tipo e verificação | D18, D21 | Não |
| T6 | **UUIDv7** gerado no cliente | Único globalmente, ordenável por tempo, tipo `uuid` nativo no Postgres | §8.1, D3 | Não |
| T7 | **Relógio lógico híbrido** (tempo físico + contador + aparelho) como "ts lógico" do log | Ordem total das alterações mesmo com relógio do aparelho atrasado | D1, D17 | Não |
| T8 | **Pacote `.arretado` = ZIP** (fflate) com `manifesto.json`, um JSON por módulo, log e anexos; **SHA-256** por arquivo e do conjunto; cifra opcional **AES-256-GCM** com chave **PBKDF2-SHA-256** (600 000 iterações, sal de 16 bytes) — tudo via WebCrypto nativo | Um formato para backup e sync; abre em qualquer descompactador; cifra sem dependência de terceiros | D21, D18 | Argon2 se houver implementação auditada em WebCrypto |
| T9 | **Sanitização com DOMPurify** e lista de permissão mínima, seguida de conversão para estrutura própria; a interface **nunca** usa `dangerouslySetInnerHTML` (bloqueado no lint) | Nunca renderizar HTML colado; biblioteca auditada contra mXSS | D13, D18 | Não |
| T10 | **CSS puro com variáveis** (tokens de tema claro/escuro); sem framework CSS nem biblioteca visual de componentes | Controle total de contraste, foco e tamanho de alvo; menos dependências | D6, §11 | Biblioteca de primitivas acessíveis se diálogo/menu exigir |
| T11 | **Vitest** (unitários e componentes; jsdom; fake-indexeddb) + **Playwright** (E2E, Chromium) + **axe-core** | Testes rodam offline no Windows e no CI; acessibilidade verificada automaticamente | §17 | Não |
| T12 | **Supabase**: projeto `arretado` em `sa-east-1`; migrações SQL versionadas em `supabase/migrations/`; teste de RLS local com **PGlite**; o cliente só se conecta em F4 | Esquema remoto pronto e vazio desde F0 sem tráfego; RLS testável sem rede | D3, D18, D19 | Não |
| T13 | **ESLint (flat) + typescript-eslint + Prettier**; `npm run check` agrega lint, tipos, testes e `npm audit --audit-level=high`; CI no GitHub Actions | Definição de pronto verificável por comando único | D18 | Não |
| T14 | **Datas**: instantes em ISO 8601 UTC; datas civis (dia de revisão, Dia) como `AAAA-MM-DD` no fuso `America/Sao_Paulo` via `Intl`; sem biblioteca de datas | "Hoje" não pode virar à meia-noite UTC (21 h em Brasília) | D10 | Fuso como preferência se houver usuário fora de Brasília |
| T15 | **Node 22 LTS**; toda automação em scripts Node (`scripts/*.mjs`); compatível com Windows/PowerShell | Ambiente principal é Windows; Python não é confiável lá | — | Não |
| T16 | **Leitor virtualizado com `@tanstack/react-virtual`** (alturas variáveis; só o visível + margem). Decidida em 23/09/2026 para a F2 | Norma de 2 mil dispositivos abre em < 1 s (Parte 2 §10.6) sem renderizar a árvore inteira | §10.6, §11 | Não |
| T17 | **Importação por URL via Cloudflare Pages Functions** (`/api/buscar-norma`, no mesmo endereço do app): só https, lista fechada de hosts (planalto.gov.br, al.sp.gov.br), redirecionamento seguido só dentro da lista, limites de tempo e tamanho, User-Agent iniciado por `Mozilla/5.0` (o Planalto recusa o padrão); a função só repassa os bytes da página, e decodificação e hash (sobre o conteúdo sanitizado) ficam no aparelho; CSP e chaves não mudam. Decidida pelo Gabriel em 23/09/2026, no lugar da Edge Function do Supabase. **Plano B:** se uma lei imensa estourar o limite de processamento do plano gratuito, Edge Function `buscar-norma` no projeto Supabase `arretado`, aceitando a pausa | O Planalto não libera CORS; o Cloudflare já hospeda o app e o plano gratuito não pausa, ao contrário do Supabase free, que ficaria pausado quase sempre antes da F4 (a busca não conta como uso do banco); o HTML passa pelo sanitizador no aparelho como no colar; falha oferece colar | D13, D16, D18, D1 | Reaproveitada no "verificar atualização" (F6) |

## Regras de dependência entre pastas (§6)

```
src/core/          ← não importa de nenhuma outra camada
src/dominios/X/    ← importa só de src/core e de si mesmo
src/suporte/       ← importa de src/core
src/integracoes/   ← importa de src/core e de serviços públicos de domínios
src/apresentacao/  ← importa de qualquer camada
```

Imposto pelo ESLint (`no-restricted-imports`); violar a regra falha o `npm run check`.
