# Acervo e edital — do edital às leis certas

Decidido com o Gabriel em 09/10/2026, depois de revisar a skill `sebagonella/concursos` (só leitura; nada do código dela é copiado). Ordem entre as etapas: `curso-de-acao.md`. Decisão registrada como D25 (`especificacao-parte1.md` §19).

## Ideia

O edital vira **funil de demanda**. Quem cola o conteúdo programático recebe só as normas daquele edital; as que faltam no Acervo viram pedido; o Acervo cresce pelo que as pessoas realmente pedem. Vale para **qualquer carreira**, não só a jurídica.

Fluxo: colar o edital → extrair Pontos e normas citadas → a pessoa confirma → cada norma fica "no Acervo" (importa com um toque), "pedida" ou "sem norma" (doutrina, súmula, jurisprudência) → o Plano mostra só as leis do edital, por disciplina, com o quanto já foi lido.

## Decisões (Gabriel, 09/10/2026)

| # | Decisão |
|---|---|
| 1 | Público: qualquer carreira. A ordem do Acervo semente segue a frequência de citação nos editais, não a área |
| 2 | Curadoria: só o Gabriel, mas o desenho aceita colaboradores e IA (campos de origem e selo abaixo) |
| 3 | Passos 1 e 2 antecipados para antes da F3, **sem backend** (exceção à regra de fases, no `CLAUDE.md`) |
| 4 | Catálogo no Supabase, contador de pedidos e pacote de incidência continuam na F4/F7 |

## Princípios

- **Sem backend até a F4.** O Acervo semente é um arquivo estático versionado, servido pelo mesmo Worker. Pedido de norma sem servidor é um formulário que abre o e-mail ou um registro local exportável; o contador compartilhado só vem com a F4.
- **Extração determinística.** Dicionário de normas canônicas + detector, com revisão da pessoa. IA fica fora do caminho crítico (nenhuma função depende de rede nem de IA). A IA entra na curadoria, offline, em sessão do Claude Code.
- **Selo de confiança em toda norma do Acervo:** `conferida` (humana, com gabarito) ou `importada` (validação estrutural limpa, sem conferência). O leitor mostra o selo e a data da última verificação. Nunca "atualizada": sempre "verificada em dd/mm, fonte X".
- **Origem de cada norma:** `curador`, `colaborador` ou `ia_assistida`. Campo opcional, sem subida de esquema no Acervo estático.
- **Edital colado fica no aparelho.** Não vai para servidor nem entra em pacote compartilhado. Material de terceiros segue a regra de "Antes de cobrar" do `curso-de-acao.md`.
- **Texto de lei é o oficial** (domínio público); doutrina, resumo e prova não entram.
- **Vocabulário novo** (registrar no `glossario.md` na atividade que o criar): Acervo, Norma canônica, Norma citada, Pedido de norma, Selo.

## Atividades

| # | O que é | Pronto quando | Depende de | Esforço | Modelo |
|---|---|---|---|---|---|
| **A1.1** | Norma canônica: identificador `tipo-numero-ano` (`lei-8069-1990`), tabela de apelidos ("ECA", "Maria da Penha", "CDC", "CF/88"), esfera (federal, estadual, municipal) | Testes de normalização com as ~40 formas de citar do corpus e de editais reais; entrada hostil linear | 11.9 (reaproveita a leitura de "Lei nº X") | P | Sonnet médio |
| **A1.2** | Detector de normas citadas num texto de edital colado: devolve lista com trecho de origem, disciplina e limite de artigos ("arts. 1º a 85") quando houver | Métrica no corpus de pelo menos 3 editais de carreiras diferentes; falso positivo listado, não escondido | A1.1 | M | Sonnet alto |
| **A1.3** | Colar edital → Pontos (substitui o CSV da planilha) e lista de normas para confirmar; vínculo Ponto↔Norma | E2E: colar, ajustar a lista, confirmar; axe; edital que não casa nada mostra mensagem útil | A1.2 | M | Sonnet médio |
| **A1.4** | Plano "só as leis do edital": normas por disciplina, estado (no Acervo, importada, pedida, sem norma) e progresso de leitura; trecho do edital vira estrela/filtro "só um trecho" (11.3) | E2E nos 3 aparelhos; nada de rede | A1.3 | M | Sonnet médio |
| **A2.1** | Formato do Acervo semente: pacote estático versionado (reusa `formato-pacote.md`), com selo, origem, data e hash da fonte; "Importar do Acervo" na Biblioteca | Importar uma norma do Acervo dá o mesmo resultado que colar a página; offline depois de baixado | etapa 9 (feita), A1.1 | M | Sonnet médio |
| **A2.2** | Curadoria da semente, por lotes de ~10 normas, na ordem de frequência de citação em editais (CF, CP, CPP, CC, CPC, CLT, CDC, ECA, LEP, LC 80, Lei 8.112, 8.429, 9.784, 14.133, LINDB, CTN, Maria da Penha, Idoso e seguintes) | Cada lote com validação estrutural limpa e selo; as `conferida` só com a conferência do Gabriel | Etapa 10 (editor), etapa 12 (importar por URL) | G, contínua | Sonnet alto (IA assistida) |
| **A3.1** | Pedido de norma: quando não está no Acervo, oferecer colar ou URL (etapa 12) e "Pedir esta norma" (e-mail ou registro exportável) | E2E com a rota interceptada; falha mostra a saída "colar" | A2.1, etapa 12 | P | Sonnet médio |
| **A3.2** | Roteiro de curadoria com colaborador ou IA: o que a pessoa envia (página + conferência) e o que o Gabriel confere antes de dar o selo `conferida` | Documento em `docs/` com checklist; um piloto com uma norma | A2.2 | P | Sonnet médio |
| **A4** (F4/F7) | Catálogo no Supabase, contador de pedidos, pacote de incidência por edital, verificação de atualização (F6) | Fora do escopo atual | F4 | — | — |
| **A5** (depois) | Reconciliação previsto → oficial → retificado de editais; incidência por banca como estrelas sugeridas | Fora do escopo atual | A4 | — | — |

## Riscos

| Risco | Mitigação |
|---|---|
| Curadoria vira o gargalo (conferir uma norma leva ~1 h) | Dois selos; a IA faz a primeira passada, o Gabriel confere por amostra e só então marca `conferida`; lotes pequenos |
| Detector erra norma sem número ("a lei do inquilinato") | A pessoa confirma a lista; o que não casa vai para "sem norma" ou "pedir" |
| Lei estadual ou municipal fora da lista de hosts da T17 | Host novo entra pela decisão registrada, nunca por sufixo |
| Prometer "lei atualizada" | Selo com data e fonte; verificação automática só na F6 |
| Passos antecipados atrasam o portão da F2 e a F3 | Só A1.1–A1.4 e A2.1 antes do portão; A2.2 corre em paralelo e não bloqueia |
| Acervo semente sem teste externo | A validação com 3 a 5 pessoas (depois da F3) mede se a pessoa chega ao primeiro artigo sem colar nada |
