# Acervo de normas, súmulas e teses; estrela discreta e palco do modo foco — desenho

> **Ordem vigente:** [`docs/planos/plano-mestre.md`](../../planos/plano-mestre.md) (13/10/2026). A ordem do §3 abaixo é histórica; as decisões do §2 continuam valendo.

Data: 10/10/2026. Autor: Gabriel (decisões) e Claude (redação). Estado: **aguarda a leitura do Gabriel** (a implementação só começa depois do plano aprovado).

## 1. Intenção

**Resultado:** o Gabriel abre o Arretado e tem à mão as normas do edital da DPE-SP, as súmulas dos tribunais que importam e as 169 teses institucionais da Defensoria, sem colar nem caçar link. Outra pessoa usa do mesmo jeito e escolhe só o que quer. Estudar é ler, marcar e registrar erro; a conferência dos gabaritos deixa de ser etapa e vira rotina dessa leitura.

**Critério de sucesso:** (a) adicionar as 177 normas, as súmulas e as teses com poucos toques e sem erro silencioso; (b) depois de adicionado, tudo funciona sem rede; (c) o que o Gabriel marca (estrela, grifo, nota, erro vinculado, "lido até") sobrevive a uma versão nova da lei; (d) a estrela deixa de poluir a leitura e o modo foco vira um palco com o mínimo.

**Origem:** `links-das-177-normas.md` (índice gerado pelas skills de concurso, com status por link), mais 9 PDFs convertidos pelo Gabriel em Markdown, 4 links dos itens sem link e a página de teses institucionais.

## 2. Decisões tomadas (não reabrir sem motivo)

| # | Decisão |
|---|---|
| D1 | Um desenho para as três peças (normas, súmulas, teses), implementadas uma por vez. |
| D2 | Entrega **B1**: texto já estruturado, gerado offline por pipeline, publicado como arquivos estáticos junto com o site; sem login nem Supabase. A fonte é trocável (ver §4). |
| D3 | Súmulas: **catálogo completo e oficial** por tribunal. Primeiro lote: STF (súmulas), STF (súmulas vinculantes), STJ, TJSP e TNU. O modelo aceita outros tribunais sem mudança. |
| D4 | Teses: as 169 da página da Defensoria (34 páginas, 5 por página, PDF por tese). |
| D5 | Uso das súmulas e teses: **A** (navegar, buscar, estrelar, vincular a erro e cartão) com o modelo **preparado para B** (ligação automática com artigos). B não entra agora. |
| D6 | As 4 normas divergentes do edital entram todas, com aviso visível. As convenções da OIT 138 e 182 entram separadas (Anexos LXX e LXVIII do Decreto 10.088/2019). |
| D7 | Disciplinas: uma norma pode ter vários vínculos, cada um com subtítulo e trecho opcionais ("CDC — Crimes das relações de consumo", arts. 61 a 80, dentro de Direito Penal). Duas camadas: sugestão do acervo (no índice) e vínculo pessoal editável. |
| D8 | A atualização legislativa é dividida: **6a** (aplicar versão nova vinda do acervo) entra agora; **6b** (verificar no site oficial pelo aparelho) fica depois, junto com a etapa 12. |
| D9 | Reordenação do plano: a reconferência dos gabaritos vira rotina de estudo (erros pelo registro de erro); a etapa 12 e a 6b ficam depois do programa deste documento. |
| D10 | Antes do acervo, dois ajustes do leitor: **estrela discreta** e **palco do modo foco** (§7). |
| D11 | Subida de esquema local v3 → v4 (entidade `vinculos de disciplina` e campos opcionais); backup do Gabriel antes do merge dessa peça. |

## 3. Ordem de execução (cada item é uma sessão ou PR próprios)

1. Estrela discreta. 2. Palco do modo foco. 3. Acervo de normas com disciplinas (3a contrato, adesão e índice; 3b pipeline e lote do Planalto; 3c tela do acervo e vínculos; 3d lotes restantes). 4. Súmulas (começa pelo levantamento da fonte de cada tribunal). 5. Teses. 6. Atualização 6a.
A **fatia 5 do redesign** (Conta e acabamento) vem **depois da Peça 3**, porque a primeira experiência (5.2) usa o convite do acervo na Biblioteca vazia.
Depois: etapa 12 (importar por URL) e 6b, etapa 10, 11.7, `/code-review` das etapas 8, 9 e 11, etapa 13 e portão da F2, F3.

## 4. Arquitetura

O app fala com o acervo só pela porta **`FonteDoAcervo`**:

- `listar()` devolve o índice. Cada entrada traz: `id` estável (`lei-federal-7210-1984`), `tipo` (norma, súmulas ou teses), `titulo`, `grupo`, `vinculos` (disciplina, subtitulo?, trecho?), `avisos`, `tamanho`, `versao`, `hash`, `urlOficial`, `coletadoEm`.
- `obter(id)` devolve o corpo do item, já no esquema validado (norma + versão + dispositivos + textos, ou coleção).

Implementações: **estática** (agora; lê `indice.json` e `acervo/<id>.json` a partir de um endereço-base configurável, no mesmo site); **bucket** (a mesma classe com outro endereço-base e a permissão de rede correspondente, abordagem 2); **Supabase** (classe nova sobre as tabelas do catálogo, abordagem 3, só depois da F4). Nenhuma outra parte do app muda na troca.

O serviço **adesão ao acervo** baixa o item, valida (esquema zod e hash do índice), converte para o formato local e grava numa transação: norma `escopo: 'catalogo'` com `origemCatalogoId` (o id do acervo), versão vigente, dispositivos e textos. Guarda a versão aderida. Idempotente: adicionar de novo não duplica. Falha em um item não afeta os demais; o lote é retomável.

O corpo dos arquivos é dado estruturado (sem HTML): não passa pelo sanitizador, mas passa pelo esquema com limites de tamanho. A política de segurança (CSP) não muda na abordagem 1 (mesma origem).

## 5. Modelo de dados

Súmulas e teses reaproveitam o modelo de norma, para herdar leitor, estrela, grifo, nota, filtro, busca, erro vinculado e cartão.

- `Norma.especie`: opcional, `norma` (ausente) | `sumulas` | `teses`. Cada coleção é uma `Norma`: Súmulas do STF, Súmulas Vinculantes do STF, Súmulas do STJ, Súmulas do TJSP, Súmulas da TNU, Teses institucionais da DPE-SP.
- `TipoDispositivo` ganha `sumula` e `tese` (normativos). As teses são agrupadas por área (Cível, Criminal, Execução Criminal, Família, Infância e Juventude) em nós estruturais; a estrela de uma área propaga para as teses dela.
- Endereço canônico: `s593`, `sv11`, `t001`. Rótulo: "Súmula 593", "Súmula Vinculante 11", "Tese 001". Situação: `vigente`, `revogado` (cancelada), `eficacia_cessada` (superada), com nota de vigência e link.
- `TextoDeDispositivo.origem`: opcional, `{ rotulo, data?, link? }`. Tese: "II Encontro Estadual, 2008 · Cível" com o PDF. Súmula: "DJ 12/03/1998" com a página oficial.
- **Vínculo de disciplina** (entidade pessoal nova): `normaId`, `disciplinaId?`, `subtitulo?`, `trecho?` (`inicioEndereco`, `fimEndereco`). Cada norma pode ter vários. A `Disciplina` é do edital do usuário; ao adicionar, o app casa a sugestão do acervo pelo nome; o que não casa fica "sem disciplina". Sobe o esquema local (v3 → v4); o pacote de dados anterior continua válido.
- Preparado para B: o enunciado é texto limpo, e o detector de remissões da 11.9 roda sobre ele na leitura. O índice inverso ("súmulas sobre este artigo") será derivado na etapa B, com sua própria subida de esquema.

O espelho do Supabase precisará de uma migração que amplie a restrição de `tipo`; só pesa na F4.

## 6. Biblioteca e fluxo de adicionar

- Abas **Normas**, **Súmulas** e **Teses**; em cada uma, o que já foi adicionado e o botão **Adicionar do acervo**. "Importar norma" por colagem continua. O "Continuar leitura" vale para qualquer das três.
- Tela do acervo (`/biblioteca/acervo`): lista agrupada por disciplina (padrão) ou por tipo (constituições e emendas, leis complementares, leis federais, leis estaduais, decretos, resoluções do CNJ e dos conselhos, provimentos, deliberações do CSDP, atos da DPG, convenções); caixa de seleção por item, por grupo, busca, tamanho do que será baixado, itens já adicionados marcados, avisos do curador visíveis antes de adicionar ("divergente do edital", "revogada", "alteradora", "só a resolução, sem o anexo"). Súmulas: escolher tribunais. Teses: um toque.
- Biblioteca vazia: `AcaoAgora` "Monte sua biblioteca" com **Tudo do edital da DPE-SP** (tamanho total antes de começar) e o caminho "escolher uma a uma".
- Progresso em texto ("23 de 177") com "Parar"; no fim, "172 adicionadas, 5 falharam" com "Tentar de novo" só nos que falharam.
- Rede: só a tela do acervo precisa; sem conexão mostra a faixa existente e o último índice visto. Depois de adicionado, offline.
- Lista de uma disciplina mostra o vínculo com seu subtítulo; tocar abre no trecho (reaproveita o filtro "só um trecho" da 11.3).
- Atualizações: o índice novo acende "há versão nova" no item; o botão **Atualizar** é a 6a (§9).

## 7. Leitor: estrela discreta e palco do modo foco

### 7.1 Estrela discreta (marca, não botão)

Hoje há um botão de estrela na calha de toda linha, mesmo vazio. Passa a ser:

- **Direta:** estrela cheia só na primeira linha do nó estrelado, mais a barra contínua.
- **Herdada:** só a barra, em traço tracejado, sem ícone.
- **Exceção:** a barra com um corte, sem estrela.
- A origem não depende só da cor: a barra muda de padrão, e o rótulo por extenso segue no aviso e no leitor de tela.
- **Marcar:** a estrela vazia aparece só na **linha ativa** (sob o dedo, o cursor ou o foco; o mesmo conceito da régua de leitura), além de "Estrelar" em Ações e da tecla `S` na linha em foco.
- A calha estreita de 2rem para cerca de 1,25rem, com largura reservada para a linha não pular.
- Sem mudança de dado: a coleção `estrelas` fica como está.

### 7.2 Palco do modo foco

- **O cartão é o padrão do `F`.** Texto corrido vira uma alternativa dentro do modo foco ("Corrido" e "Cartão"); o botão "Por artigo" sai do grupo fixo. Para súmulas e teses é "Por item".
- **Penumbra e luz:** o fundo da página escurece um passo (`--penumbra`) e o cartão fica um tom mais claro (`--luz-do-cartao`), com anel fino e sombra discreta. Sem opacidade no texto, para o contraste continuar AA; sem brilho decorativo.
- No cartão: a linha de contexto ("Título II › Cap. I", sentence case, Atkinson pequeno), o artigo em Literata (cerca de 62 caracteres por linha) e um fio de progresso ("42 de 288"). Nada mais.
- **Controles:** um único controle `⋯`, quase invisível. Tocar nele (ou Tab) abre a bandeja com Buscar, Filtrar, Ações, Estrelar, Lido até aqui, Corrido ou Cartão e Sair; some sozinha depois de alguns segundos. Setas, J/K, deslize, F/Esc e `S` funcionam sem abrir nada. **Artigo anterior e Próximo artigo são dois botões discretos no cartão** (só seta, sempre visíveis), para quem não descobre o deslize nem os atalhos; ficam fora da bandeja.
- **Vizinhos:** reduzidos a uma borda esmaecida, sem texto; a espiada de duas linhas atual vira opção.
- **Movimento:** um único momento orquestrado, a penumbra descendo e o cartão acendendo em cerca de 200 ms ao entrar. Trocar de artigo é troca direta. `prefers-reduced-motion` desliga também a entrada.
- Preferências: nenhuma nova obrigatória; a lente (Corrido ou Cartão) e a espiada dos vizinhos guardam-se como preferências opcionais, sem subida de esquema.

## 8. Pipeline de coleta e qualidade

Roda só na máquina do Gabriel ou na do Claude, fora do app e do CI.

- `acervo/curadoria.json` (versionado): os itens curados, com id estável, grupo, vínculos de disciplina, avisos e a fonte.
- `npm run acervo:gerar [id]` coleta, estrutura e escreve `public/acervo/indice.json` e um arquivo por item. `npm run acervo:verificar` valida todos os arquivos contra o esquema e o hash do índice e **roda no CI**.
- **Adaptadores:** Planalto, ALESP, Câmara (com recorte de anexo para a OIT), CNJ e portal da Defensoria; **Markdown** (os PDFs convertidos: `~~tachado~~` vira texto tachado, que o estruturador já trata como redação anterior); tribunais de súmulas e a página de teses. Todos alimentam o estruturador da F2. Fontes dinâmicas (esaj do TJSP) usam o Chrome instalado via Playwright; o arquivo salvo à mão é só saída de emergência.
- Cache bruto local, fora do git; User-Agent identificado; no máximo 1 requisição por segundo por servidor.
- **Qualidade:** validação estrutural existente (numeração sequencial, sem duplicata nem mistura); contagens contra os 7 gabaritos disponíveis; `acervo/relatorio.md` por rodada (muitos `a_confirmar`, saltos de numeração, artigo sem texto). **Item com anomalia não vai para o site sozinho.** A hash é reprodutível (mesma entrada, mesmo hash).
- **Direitos:** texto de lei e atos oficiais não têm proteção autoral (Lei 9.610, art. 8º); o link da fonte acompanha cada item.

### Pendências de conteúdo e fontes complementares (10/10/2026)

O Gabriel aprovou a spec e acrescentou a Res. CNAS 109/2009 em Markdown (completa, com o Anexo da Tipificação, 1.467 linhas) e a lista de links abaixo. **Nenhum dos links é coletado ainda**; entram na curadoria como fonte, e a coleta confere cada um.

| Item | Fonte indicada | Observação |
|---|---|---|
| PNAS (Res. CNAS 145/2004) | mds.gov.br/webarquivos/publicacao/assistencia_social/normativas/pnas2004.pdf | Resolução e texto da política (Anexo I). Substitui o Markdown só com a resolução. |
| Orientações Técnicas (Res. Conjunta 1/2009) | mds.gov.br/webarquivos/publicacao/assistencia_social/cadernos/orientacoes-tecnicas-servicos-de-alcolhimento.pdf (cópia: cmdca.jundiai.sp.gov.br) | Documento completo. |
| SINASE (Res. CONANDA 119/2006) | cnmp.mp.br/portal/images/cije/publicacoes/sinase_2006.pdf (resolução: gov.br/mdh, PDF já convertido) | Texto técnico completo, separado da resolução que o aprova. |
| Res. CONANDA 273/2025 | gov.br/participamaisbrasil/resolucao-n-273-de-3-de-outubro-de-2025 (DOU: in.gov.br, 662137476) | Os dois endereços substituem o link que dava 404. |
| Res. CNAS 109/2009 (Tipificação) | Markdown do Gabriel | Resolução e Anexo. Entra com o Anexo como parte do mesmo item. |
| Lei 15.512/2026 (ECA Ambiental) | planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15512.htm | Citada no edital como 13.512/2026. |
| Lei 13.512/2026 | al.mt.gov.br (Mato Grosso, fogos de artifício) | Homônima **estadual** de outro tema. Entra por precaução (decisão do Gabriel de incluir todas as divergentes), com aviso "não casa com o tema do edital". |
| Leis SP 14.187/2010 e 11.199/2002 | al.sp.gov.br/norma/159949 e repositório da ALESP | Descrição do edital ("denúncias administrativas") não casa: a 14.187 trata de discriminação racial, a 11.199 de HIV/AIDS. Entram com aviso. |
| LC SP 207/1979 e 893/2001 | repositório da ALESP | Polícia e Polícia Militar, não Defensoria. Entram com aviso. |
| Lei 15.263/2025 | planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15263.htm | Política Nacional de Linguagem Simples; o link deixa de ser "CONFERIR". |
| Res. CNJ 345 | atos.cnj.jus.br/atos/detalhar/3512 (original em PDF) | É de **2020** (Juízo 100% Digital), alterada pela 378/2021; o edital diz 2021. |
| Rec. CNJ 128 | atos.cnj.jus.br/atos/detalhar/4377 (PDF) | É de 15/02/2022 (o edital diz 2023). O Protocolo é anexo, acessível pela página do ato. |

Seguem como já registrado: os Provimentos CGJ 18/2012, 16/2013 e 21/2013 (esaj; ordem assumida) e a Res. CONDEGE 1/2024; a Res. CNPCP 4/2011 (revogada pela 23/2021, o tachado mostra o revogado); a Res. CONANDA 117/2006 (alteradora, com "......" no lugar do texto inalterado); a OIT 138 e 182 (Anexos LXX e LXVIII do Decreto 10.088/2019).

**Documentos sem artigos.** PNAS, Orientações Técnicas, SINASE e a Tipificação são documentos técnicos, não leis articuladas. O estruturador os recebe como norma de espécie `norma` com **Anexo** e **blocos** (tipos já existentes) derivados dos títulos do Markdown; a validação estrutural "numeração sequencial" não se aplica a eles. A peça 3b define a regra e mostra uma amostra ao Gabriel antes do lote.

## 9. Atualização 6a

Quando o índice traz versão nova de um item já adicionado, "Atualizar" compara a árvore por endereço, mostra o que mudou (incluído, alterado, revogado, renumerado), grava a versão nova como vigente e arquiva a anterior. Estrelas, erros vinculados, vínculos de disciplina, "lido até" e posição são remapeados pelo endereço; o que perdeu o endereço vai para a lista de **pendências de releitura**. Grifos e notas usam a reancoragem por texto (`status: reancorada | pendente`, já no modelo). Sem rede de volta ao site oficial: a versão nova vem do acervo.

## 10. Testes

- **Contrato:** `FonteDoAcervo` com a implementação estática e uma falsa.
- **Adesão:** idempotente; falha parcial retomável; esquema e hash inválidos recusados; versão aderida guardada.
- **Vínculos:** casamento pelo nome, "sem disciplina", vínculo múltiplo com subtítulo, abrir no trecho.
- **Pipeline:** adaptadores com amostras pequenas versionadas; hash reprodutível; `acervo:verificar` no CI.
- **Leitor:** a tabela-verdade da estrela nos três estados e o marcador; o palco (entrar, sair, lente, bandeja, teclado, `prefers-reduced-motion`).
- **E2E (3 aparelhos, axe nos dois temas):** adicionar do acervo (índice de teste com 3 itens), abrir offline depois; estrela discreta; palco do foco; abertura do leitor abaixo de 1 s (limiar existente).
- Definição de pronto de cada peça: `npm run check` verde, E2E verde, problemas registrados em `docs/solucao-de-problemas.md`, termos novos em `docs/glossario.md`.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Crescimento do repositório com os arquivos gerados | Comprimem bem; medir o tamanho a cada lote; a porta `FonteDoAcervo` permite mudar para bucket sem tocar o app. |
| Portais de tribunais dinâmicos ou instáveis | Levantamento da fonte oficial de cada tribunal como primeira tarefa da peça de súmulas; Chrome via Playwright; saída manual. |
| Documentos técnicos sem artigos (PNAS, SINASE, Orientações Técnicas, Tipificação) | Anexo e blocos pelos títulos; amostra ao Gabriel na 3b antes do lote. |
| Markdown vindo de PDF com ruído | Limpeza no adaptador; relatório de anomalias; revisão pelo registro de erro. |
| Casamento de disciplina pelo nome falhar | Cai em "sem disciplina"; vínculo editável. |
| Subida de esquema v4 | Backup do Gabriel antes do merge; pacote anterior segue válido; recarregar abas depois. |
| "Acervo" foi o nome do módulo antigo descartado (23/09/2026) | Registrar no glossário que é conceito novo, sem relação com o antigo. |
| Palco muda hábitos já em uso (modo foco e "Por artigo") | Lente "Corrido" preservada; Esc e F iguais; feito em PR próprio. |

## 12. Fora de escopo

Ligação automática súmula-artigo (etapa B); botão "verificar no site oficial" pelo aparelho (6b); importar por URL (etapa 12); login, sync e catálogo compartilhado (F4/F7); contas e cobrança.

## 13. Registros a fazer no repositório (na implementação)

- `docs/decisoes-tecnicas.md`: nova T (porta `FonteDoAcervo` e abordagem 1 com preparação para 2 e 3).
- `docs/glossario.md`: Acervo, Súmulas, Teses, vínculo de disciplina, palco, linha ativa.
- `docs/planos/curso-de-acao.md` e `docs/proxima-sessao.md`: nova ordem (§3).
- `docs/planos/F2.md`: a etapa 12 e a reconferência dos gabaritos mudam de lugar.
