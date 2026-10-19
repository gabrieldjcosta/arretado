# Leitura de lei por incidência (TEC Concursos): plano

> Ferramentas: `node scripts/incidencia.mjs achatar <pasta-json> <saida.csv>` e `node scripts/incidencia.mjs validar <tabela.csv>` (núcleo e testes em `scripts/incidencia/`). Dados do TEC ficam fora do repo.

Data: 2026-10-19 · Pedido: Gabriel · Status: plano + piloto; nada construído no app.

## 1. Objetivo
Para cada usuário (cargo + banca), gerar as atividades de **leitura de lei** ordenadas pelo que mais cai: norma → blocos/dispositivos → faixa de incidência. Os dados vêm do TEC Concursos, extraídos por um worker com a conta do Gabriel, organizados por um segundo worker, e entram no app como **PacoteDeIncidência** (modelo já existe: `src/core/modelo/legislacao.ts:220`, com `estrelas` por dispositivo e `prioridades` por ponto).

## 2. Restrições (decididas)
- **Repositório é público** (CLAUDE.md): dados brutos e derivados do TEC **não vão ao git** nem ao /mnt/project-files versionado. Ficam em `C:\Users\gabri\Projetos\arretado-dados\tec\` (fora do repo). No repo só vão: scripts, esquema, documentação e, se o Gabriel autorizar, o pacote final agregado (faixas, sem texto do TEC).
- Senha/cookie nunca passa por chat nem por arquivo do repo. Login é feito pelo Gabriel no navegador dele; o worker reutiliza a sessão aberta.
- Uso pessoal, ritmo humano (1 requisição por 2–4 s, retomável, sem paralelismo), só o que a conta dele já enxerga. **Risco a assumir pelo Gabriel:** termos do TEC provavelmente proíbem extração automática; conta pode ser bloqueada. Mitigação: ritmo lento, cache local, nunca refazer o que já baixou. Se ele preferir zero risco, a alternativa é exportar manualmente as telas de estatística (item 4, modo B).
- Pacote publicado para outros usuários (F7) só depois de revisão de licença; o piloto é só uso pessoal.

## 3. Caminho viável para extrair (o que precisa do Gabriel)
Nuvem não alcança a sessão dele no TEC. Hoje **nenhum Chrome com a extensão está conectado** a esta conta (verificado agora). Opções, da melhor à pior:
- **A. Worker local com Playwright** num perfil de Chrome dedicado em `arretado-dados\perfil-tec\`: Gabriel roda `npm run tec -- login` uma vez, entra no TEC à mão, fecha; o worker reutiliza o perfil. Roda no PC dele (Orca/Claude Code local). Recomendado: retomável, auditável, sem agente "dirigindo" a tela.
- **B. Claude in Chrome**: Gabriel instala/conecta a extensão no Chrome logado; o agente navega e lê as telas. Mais lento e caro, bom para o piloto exploratório.
- **C. Manual assistido**: Gabriel salva/imprime as páginas de estatística como HTML/PDF numa pasta; o Organizador lê dali.

**Preciso dele, numa linha:** escolher A, B ou C e fazer o login no TEC no PC dele (sem me passar a senha).

## 4. Descoberta (passo 0 do Extrator, antes de qualquer volume)
Não assumo a estrutura do TEC; o piloto confirma o que existe. Verificar, na conta: (1) filtro por **banca + cargo + órgão + período** nas questões; (2) tela de **estatística por assunto** de uma disciplina (contagem/percentual de questões por assunto); (3) se há **incidência por artigo/dispositivo** de lei (alguns assuntos do TEC são "Art. X da Lei Y"); (4) limite de questões listadas. O resultado decide o nível de detalhe (item 5). Saída do passo 0: `descoberta.md` com URLs-padrão, filtros e campos (sem dados de conta).

## 5. Dados e tabelas (3 camadas)

**Camada 1 – bruta** (Extrator grava, nunca edita): `arretado-dados/tec/bruto/<AAAA-MM-DD>/<banca>__<cargo>__<disciplina>.json` mais o HTML/print de origem e `manifesto.jsonl` (url, filtros, data, hash, nº de questões). Imutável.

**Camada 2 – tabela normalizada** (Organizador): `incidencia.csv`, cabeçalho fixo:

`banca,orgao,cargo,ano_de,ano_ate,disciplina,assunto_tec,nivel,norma_ref,dispositivo_ref,qtd_questoes,pct_disciplina,pct_banca_cargo,total_disciplina,total_banca_cargo,fonte_extracao`

- `nivel` ∈ `assunto` | `norma` | `artigo` (o mais fino que o TEC der).
- `pct_*` em 0–100 com 1 casa; `total_disciplina` = questões analisadas da disciplina no recorte (denominador de `pct_disciplina`); `total_banca_cargo` = questões analisadas de todas as disciplinas do recorte (denominador de `pct_banca_cargo`); servem para saber quando o % é fraco.
- Regras: soma dos `pct_disciplina` por disciplina ≈100 (±1, senão aviso); recorte com `total_disciplina` <30 vira aviso "amostra fraca"; mesmo recorte duas vezes = erro. Validador no mesmo molde de `npm run catalogo` (erros/avisos por regra).

**Camada 3 – mapa para o acervo**: `mapa-assunto-norma.csv`: `disciplina,assunto_tec,normaId,enderecoInicio,enderecoFim,confianca(alta|media|baixa),revisado(s/n)`. Liga "Art. 5º, LXV a LXVII da CF" ou "Prisão em flagrante" aos endereços de dispositivo do leitor (hierarquia já estruturada em `corpus/normas`). O Organizador propõe; **conferência humana** nas linhas `media|baixa` (lista curta).

**Saída – PacoteDeIncidência**: gerado por script a partir de 2+3: `faixa` por regra (padrão, ajustável): por **corte de massa**: Altíssima até 40% da massa acumulada da disciplina, Alta até 70%, Média até 90%, resto Baixa/extra. Estrelas = dispositivos das faixas Altíssima+Alta. Registrar a regra de corte no `fonte` do pacote.

## 6. Dois workers + um validador
1. **Extrator** (local): passo 0, depois recortes da lista de trabalho (`fila.json`: banca × cargo × disciplina). Retomável (pula o que já está no manifesto), ritmo lento, para ao primeiro captcha/bloqueio e avisa. Não interpreta, só captura.
2. **Organizador** (pode ser na nuvem, recebe só a pasta bruta que o Gabriel copiar/subir): normaliza → `incidencia.csv`, propõe `mapa-assunto-norma.csv`, roda validador, lista "dúvidas" (assuntos sem norma, % que não fecha).
3. **Gerador de pacote**: determinístico (script Node), sem IA.

## 7. Como vira atividade de leitura por usuário
- Entrada: cargo + banca do usuário (já no Concurso/Edital). Escolhe o recorte por **escada de fallback**: banca+cargo+órgão → banca+cargo → banca+área → banca geral; mostra ao usuário qual recorte usou ("baseado em 312 questões FCC/Defensoria").
- Para cada Ponto do plano, a leitura propõe **só os dispositivos estrelados do pacote** primeiro ("ver só estrelados", já existe), depois Média, depois o resto; tempo estimado por massa de incidência (mais massa = mais tempo/dia antes).
- Ajuste pessoal sobre o pacote (casa com o plano de adaptar a trilha): erro do usuário em um dispositivo/ponto sobe a faixa localmente (camada pessoal, não altera o pacote).
- Sem pacote para o recorte: cai no comportamento atual (leitura sequencial), sem quebrar local-first. Pacote é arquivo importável; nenhuma dependência de rede.

## 8. Piloto (1 cargo, 1 banca)
Recorte: **Defensor Público (DPE-SP) × FCC**, últimos 8 anos, 2 disciplinas com norma já no acervo: **Direito Penal** (CP) e **ECA** (Direito da Criança e do Adolescente). Critérios de pronto:
1. `descoberta.md` escrito (o que o TEC oferece).
2. `incidencia.csv` das 2 disciplinas, validador sem erros.
3. `mapa-assunto-norma.csv` com ≥80% da massa mapeada para endereços do CP/ECA.
4. Pacote gerado e importado num banco de teste: leitor "só estrelados" mostra os artigos esperados; Gabriel confere 10 artigos que ele sabe que caem.
5. Relato: tempo/ritmo do Extrator, bloqueios, custo para escalar para as ~15 disciplinas.

## 9. Etapas e divisão em tarefas
| # | Tarefa | Quem | Depende de |
|---|---|---|---|
| T0 | Gabriel escolhe A/B/C e loga no TEC | Gabriel | – |
| T1 | Passo 0 + `descoberta.md` | Extrator | T0 |
| T2 | Esquema/validador `incidencia.csv` e `mapa` (`scripts/incidencia/`, testes) | Claude (nuvem) | pode começar já, com fixture sintética |
| T3 | Extrator Playwright retomável | Claude (local) | T1 |
| T4 | Captura do piloto | Extrator | T3 |
| T5 | Organizador + mapa | Organizador | T4 |
| T6 | Gerador de pacote + import no app | Claude | T2, T5 |
| T7 | Escala: demais disciplinas/cargos (as 4 carreiras do catálogo) | Extrator + Organizador | piloto aprovado |

T2 não depende de nada externo e pode abrir PR já (para `integracao`, sem dados reais, fixture sintética por ser repo público).

## 10. Decisões que preciso do Gabriel (default entre parênteses)
1. Modo de extração A/B/C (A).
2. Aceita o risco de termos do TEC com o ritmo lento descrito (sim, uso pessoal).
3. Pacote final agregado pode ir ao git/público? (não; só local até revisão de licença).
4. Piloto DPE-SP × FCC em Penal + ECA (sim).

## 11. Fila gradual: todos os concursos de 2025 e 2026 (pedido do Gabriel, 2026-10-19)
Depois do piloto (item 8) aprovado, o Extrator percorre os concursos de 2025 e 2026 aos poucos.

- **Lista-mestre** `arretado-dados/tec/fila-concursos.csv`: `concurso_id,orgao,cargo,banca,ano,carreira,prioridade,status(pendente|em-andamento|feito|bloqueado|sem-dados),ultima_tentativa,questoes_capturadas,obs`. Semeada pelo catálogo (`corpus/catalogo/index.json`: 4 carreiras hoje) e pela lista de provas do próprio TEC (passo 0, filtro por ano).
- **Ordem:** (1) Defensoria e as carreiras do catálogo; (2) concursos de banca FCC; (3) demais bancas das mesmas carreiras; (4) resto de 2025–2026. Gabriel pode reordenar a coluna `prioridade`.
- **Cota diária** (default): até ~150 páginas/dia e 1 sessão de ~40 min; para ao primeiro captcha/erro 429/403 e marca `bloqueado`. Retomável pelo `manifesto.jsonl`; não refaz recorte já capturado.
- **Agregação:** com poucas questões por concurso, o recorte útil é banca+cargo/área em vários concursos (item 7). Cada lote concluído regenera `incidencia.csv` e o pacote; `total_*` mostra quando o recorte ficou forte (≥30).
- **Fim por lote, não por data:** relatório por lote (concursos feitos, sem dados, bloqueios, % da fila). Gabriel decide quando parar ou acelerar.
- Mesmas restrições do item 2 (dados fora do repo, ritmo humano, login dele).

## 12. Atualização (2026-10-19): camada pública sem login
Teste de acesso: [tec-teste-acesso.md](tec-teste-acesso.md). A nuvem abre o TEC sem captcha; a página pública `/materias/<materia>` traz JSON embutido com a árvore de assuntos (nível de artigo, ex.: "art. 124 do CP"), `totalQuestoes` e `porcentagemMateria`, **somando todas as bancas**. Recorte banca/cargo/período exige login com reCAPTCHA.

Mudanças no plano:
- **Camada G (global, já viável na nuvem):** um GET por matéria → `incidencia.csv` com `banca=*`, `cargo=*`, `ano_de/ano_ate` vazios, `pct_disciplina`=`porcentagemMateria`, `total_disciplina`=`totalQuestoes` da matéria, `qtd_questoes`=`totalQuestoes` do assunto, `pct_banca_cargo` vazio. É o último degrau da escada de fallback (item 7) e já alimenta o mapa assunto → artigo, que o nome do assunto facilita.
- **Camada B (FCC × Defensoria etc.):** continua dependendo do login do Gabriel (item 3: sessão no PC dele). O piloto (item 8) passa a comparar B contra G para ver quanto a banca desvia do global.
- Nova tarefa **T2b** (sem dependência dele): Extrator público para todas as matérias jurídicas, ritmo ≥3 s, retomável, saída em `arretado-dados/tec/bruto/publico/`. Pacote derivado de G é o primeiro entregável útil.
- Termos de uso do TEC não lidos; camada pública parece de baixo risco. Decisão do Gabriel.

### 12.1 Resultado da T2b (2026-10-19)
55 matérias jurídicas extraídas sem login (curl, 3,5 s entre páginas, sem bloqueio) → `/mnt/project-files/dados-tec/bruto/publico/*.json` (fora do git do projeto) e `dados-tec/incidencia-global.csv`: 9.170 linhas, 3.226 com artigo identificado. Atenção: a árvore é **hierárquica e as contagens do pai incluem as dos filhos** (coluna `hierarquia`); somar só um nível por vez. Colunas de banca/cargo ficam `*`/vazias (camada G). Script: `/tmp/claude-0/s/bin/tec-publico.mjs` e `flat.mjs` (a versionar na T2). `norma_ref` e `dispositivo_ref` vêm de regex sobre o nome ("art. 1º do CP") e precisam do mapa para endereços do acervo.
