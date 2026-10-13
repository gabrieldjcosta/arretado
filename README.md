# Arretado

Plataforma de estudo para concursos jurídicos de alta complexidade, feita para quem tem dificuldade de concentração (começar sem decidir, voltar sem culpa, ler sem se perder), usada hoje pelo autor e pensada para, no futuro, ser cobrada e crescer. Converte erros, questões e leitura de legislação em uma **próxima ação de estudo** — com o mínimo de cadastro e sem depender de fornecedor.

> Nome provisório. Até 22/09/2026 o projeto se chamava "Acumen"; "Acumen v2" nos documentos designa o protótipo anterior (Firestore), não mantido. Decisão de 23/09/2026: nada do Acervo nem do Acumen v2 é importado — o conteúdo recomeça do zero.

## Estado atual

**F0 (Fundamentos) e F1 (Recall + pontos) implementadas.** Portões: [`docs/portoes/F0.md`](docs/portoes/F0.md) e [`docs/portoes/F1.md`](docs/portoes/F1.md); portão da F2 (aberto): [`docs/portoes/F2.md`](docs/portoes/F2.md). Projeto Supabase real criado e com RLS conferida (portão da F0 fechado). Pendentes: publicação no Cloudflare (Worker `arretado`, T18) e o uso real de 14 dias — ver [`docs/proxima-sessao.md`](docs/proxima-sessao.md). **F2 (Legislação) planejada e em execução em paralelo** (decisão de 23/09/2026): [`docs/planos/F2.md`](docs/planos/F2.md).

- [`docs/especificacao-parte1.md`](docs/especificacao-parte1.md) — diagnóstico dos artefatos existentes, produto unificado, modelo conceitual de dados, arquitetura modular, core, plano de fases, MVP e as decisões arquiteturais **D1–D24** (seções 1–7, 15, 16, 19).
- [`docs/especificacao-parte2.md`](docs/especificacao-parte2.md) — integração entre módulos, interface, detalhamento de cada módulo (com destaque para Legislação), acessibilidade, backup/importação, fontes oficiais, backend e sincronização, critérios de validação, riscos e backlog (seções 8–14, 17, 18, 20).

## Contexto em um parágrafo

Existiam oito ferramentas separadas (Acervo de Estudo em localStorage, Acumen v2 em Firestore, Ciclo Obrigatório, Rotina até a Prova, Perfil da Banca, Radar do Edital, Erro & Recall, Hoje) que repetiam os mesmos conceitos — pontos do edital em três lugares, três telas "Hoje", dois calendários, dois formatos de backup incompatíveis. A especificação unifica tudo em um produto com quatro áreas (**Hoje, Plano, Recall, Biblioteca**), captura global de erro, e **Conta e Ajustes** fora da navegação. O usuário principal tem TDAH e pouco tempo para cadastrar; a banca-alvo (FCC) cobra letra de lei — por isso o leitor de legislação é prioridade logo após o núcleo de erros e revisão.

## Decisões que não se reabrem sem motivo

| # | Decisão |
|---|---|
| D1 | **Local-first**: os dados vivem no aparelho (IndexedDB + log de alterações); o remoto é espelho |
| D3 | Remoto: **Postgres via Supabase** (Auth Google, RLS por usuário, região Brasil), atrás de adaptador; esquema criado na F0, usado na F4 |
| D5 | Ordem: **Recall → Legislação → Hoje/Plano → sincronização** |
| D6 | Quatro áreas + captura global + busca + "?" + "!" + rodapé; Conta e Ajustes fora da navegação |
| D9 | Erro com **2 campos obrigatórios**; *resultado* (errou / acertou sem certeza) separado de *causa* (lacuna / leitura / confusão / literalidade); **frase correta** = verso do cartão = lista de revisão passiva |
| D11–D15 | Legislação: **Dispositivo** como nó único da árvore com endereço estável (`art9A`); Norma em duas camadas (conteúdo compartilhável × anotações pessoais); entrada por **HTML colado** ou URL (texto puro perde o tachado); redações anteriores **guardadas e ocultas**; **estrela** com herança por bloco |
| D17 | Sincronização automática, **um aparelho ativo por vez**, conflitos sempre explícitos |
| D18 | Segurança e LGPD como critério de aceite em **toda** fase; sanitização de HTML é componente crítico |
| D24 | Vocabulário: **Aparelho** (equipamento), **Problema** (falha da plataforma), **Erro** só para estudo, **Dispositivo** só para unidade da lei |

Lista completa com motivo, alternativa descartada e consequência: Parte 1, §19.

## Fases

| Fase | Entrega | Condição para avançar |
|---|---|---|
| F0 | Fundamentos: banco local, esquema versionado, log, backup/restore com modos e prévia, sanitizador, shell, Conta e Ajustes | Restore idempotente comprovado; carga sintética aprovada |
| F1 | **MVP**: Recall (captura, frase correta, cartão opcional, 6 caixas, drill, lista passiva) + pontos importados | 14 dias com revisão feita em ≥ 10 |
| F2 | Legislação: importador HTML/URL, editor, leitor com modo foco, estrelas, redações ocultas (sem importação do Acervo antigo — decisão de 23/09/2026) | Lei lida no Arretado, não no Acervo, por 2 semanas |
| F3 | Hoje, Dia, Sessão, Plano, reincidência | Fechamento do dia em ≥ 70% dos dias com sessão |
| F4 | Login Google, sincronização, PWA, concurso com fases/prazos, calendário | Teste A/B offline sem perda |
| F5 | Precedentes, Notas, busca global | — |
| F6 | Atualização legislativa (verificar por URL → diff → confirmação → reancoragem) | — |
| F7 | Catálogo compartilhado, pacotes de incidência, inteligência de prova | — |
| F8 | Analítica acionável, revisão adaptativa (opcional) | ≥ 3 meses de revisões |

## Decisões técnicas

Linguagem, framework, banco local, formato do pacote e ferramentas: [`docs/decisoes-tecnicas.md`](docs/decisoes-tecnicas.md) (T1–T18). Obedecem a D1–D24.

Apoio ao desenvolvimento: [`docs/glossario.md`](docs/glossario.md) (vocabulário → identificadores de código) e [`docs/solucao-de-problemas.md`](docs/solucao-de-problemas.md) (sintomas, causas e soluções conhecidas; complementado a cada atividade).

## Como rodar

Requer Node 22 LTS.

```
npm install
npm run dev        # servidor de desenvolvimento
npm run check      # lint + tipos + testes + auditoria
npm run test:e2e   # testes ponta a ponta (Playwright)
npm run build      # versão estática em dist/
```

## Relacionados

- Skill `acumen-extrair-normas` (extração de leis do Planalto/ALESP para o acervo): seu parser, que já separa texto vigente de revogado e extrai notas de vigência, é a base conceitual do estruturador da F2.
