# Prompt para o Perplexity (Deep Research): catálogo de disciplinas e assuntos por concurso

Cole o bloco abaixo. Rode uma carreira por vez (uma conversa por carreira) para manter a profundidade; no fim, junte os CSV.

---

Você é pesquisador jurídico. Monte uma base estruturada do conteúdo programático dos concursos públicos jurídicos brasileiros, a partir **exclusivamente de editais oficiais**.

## Carreira desta rodada
[PREENCHER UMA POR VEZ: Defensoria Pública | Magistratura | Ministério Público (Promotor) | Analista Judiciário | Técnico Judiciário | Tribunal de Contas / área de controle | Área ambiental (procuradoria e órgãos ambientais) | Procuradoria (AGU/estadual/municipal) | Delegado de Polícia | Cartório/notarial]
Abrangência: cargo de nível jurídico/superior; para Analista e Técnico, as áreas judiciária e (quando houver) apoio jurídico.

## O que buscar
1. Os **3 editais mais recentes (de preferência 2023 a 2026) de cada órgão relevante**: para Defensoria, todas as DPEs estaduais e a DPU; para Magistratura, TJs estaduais e TRFs; para MP, MPs estaduais e MPF/MPT; para Analista/Técnico, TRFs, TRTs, TREs, TJs e STJ/STF/TST/TSE; para controle, TCU e TCEs; etc. Priorize editais com o conteúdo programático completo e **banca informada** (FCC, FGV, Cebraspe, Vunesp, Consulplan, etc.).
2. De cada edital, extraia **todas as disciplinas e todos os assuntos, na ordem e com a numeração do edital**, sem resumir nem parafrasear além do necessário. Preserve referências a leis (ex.: "Lei nº 8.072/1990", "arts. 5º a 17 da CF/88").
3. Se um órgão não tiver edital dos últimos 3 anos, use o mais recente e indique o ano.

## Regras de qualidade (obrigatórias)
- **Não invente nem complete de memória.** Cada linha deve vir de um edital que você abriu. Se não achou o conteúdo programático, escreva "NÃO LOCALIZADO" na linha do órgão, sem preencher assuntos.
- Cada linha precisa de **URL da fonte** (PDF do edital ou página oficial). Prefira o link direto do PDF.
- Marque `fase` (objetiva, discursiva, oral, titulos) quando o edital separar o conteúdo por fase; senão deixe vazio.
- Não una assuntos distintos numa linha; não desmembre um assunto em frases soltas. Um item numerado do edital = uma linha. Subitens (a, b, c...) ficam no mesmo campo `assunto`, separados por "; ".
- **Faixa de relevância** (`faixa`): preencha **somente** se houver base verificável (peso do edital, número de questões por disciplina informado, ou frequência observada nos 3 editais). Valores: Altíssima, Alta, Média, Baixa. Se não houver base, deixe vazio. Explique a base em `obs_faixa` (ex.: "aparece nos 3 editais; 12 de 60 questões").
- Marque `recorrencia` = em quantos dos editais pesquisados o assunto (ou equivalente) aparece (ex.: 3/3).
- Não mencione nem faça inferências sobre candidatos; só conteúdo de edital.

## Formato de saída
1. **Um bloco CSV por carreira**, UTF-8, separador vírgula, aspas duplas nos campos com vírgula, cabeçalho exato:

carreira,orgao,uf,banca,ano_edital,cargo,fase,disciplina,ordem_disciplina,numero_item,assunto,faixa,obs_faixa,recorrencia,fonte_url

2. Um segundo bloco CSV de **disciplinas consolidadas por carreira** (união dos órgãos, com nomes normalizados), cabeçalho:

carreira,disciplina_normalizada,variantes_de_nome,presente_em_n_editais,total_editais,faixa_sugerida

3. Um terceiro bloco com a **lista de editais efetivamente usados**: orgao, ano, banca, url, situação (completo / parcial / NÃO LOCALIZADO).
4. Ao final, uma seção curta **"Lacunas e dúvidas"** listando o que não conseguiu confirmar e onde há divergência entre editais.

Normalização de nomes de disciplina: use nomes jurídicos consagrados e consistentes (ex.: "Direito Constitucional", "Direito Penal", "Processo Civil", "Direitos Humanos", "Direito Administrativo", "Direito Tributário", "Direito Ambiental", "Legislação Institucional / Lei Orgânica"). Registre o nome original em `variantes_de_nome`. Disciplinas não jurídicas (português, informática, raciocínio lógico) entram no mesmo CSV, com `disciplina` prefixada por "[Geral] ".

Responda em português. Entregue os CSV em blocos de código para copiar sem perda.
