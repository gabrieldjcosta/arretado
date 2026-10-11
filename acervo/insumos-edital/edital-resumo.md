---
data: 2026-10-09
data_atualizacao: 2026-10-09
tipo: documentacao
status: ativo
tags:
  - concurso/dpesp/2026
  - edital
---

# 📄 Resumo do Edital — X Concurso DPE-SP (Defensor Público)

> ℹ️ **Base: edital definitivo** (confirmado pelo usuário em 09/10/2026; arquivo original em `_COMUM/01-EDITAL/edital-original-minuta.md`). O Anexo III traz o cronograma como "provisório, sujeito a alteração" — acompanhar retificações no site da FCC; se houver retificação, rodar `/concurso-prep --reconciliar`.

## Dados gerais

| Item                    | Detalhe                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Órgão                   | Defensoria Pública do Estado de São Paulo                                                             |
| Banca/apoio operacional | Fundação Carlos Chagas (FCC) (www.concursosfcc.com.br)                                                |
| Cargo                   | Defensor Público da Classe Inicial da Carreira (Defensora ou Defensor Público do Estado de São Paulo) |
| Vagas                   | 70 + vagas que surgirem na validade (2 anos, prorrogável por igual período) — LCE 1.434/2025          |
| Reservas                | negros e indígenas 30%; PcD 5%; trans 2%                                                              |
| Remuneração             | não consta no edital (fontes externas citam R$ 29.716,00 — **conferir**)                              |
| Taxa                    | não consta na minuta (fontes externas citam R$ 250,00 — **conferir**)                                 |
| Base normativa          | LCE 988/2006; Deliberação CSDP 454/2025 e 400/2022 (Anexo I do edital)                                |

## Requisitos (item 2.1)

Brasileiro(a) ou português(a) com residência permanente; bacharel em direito; em dia com obrigações militares; gozo dos direitos políticos; mínimo de 3 anos de atividade jurídica comprovada; sem condenações/antecedentes criminais, de órgão de classe ou administrativas/improbidade incompatíveis com o cargo; taxa de inscrição recolhida; ciência do edital e das Deliberações CSDP 454/2025 e 400/2022 (item 2.1 do edital).

## Fases

1. **1ª Prova Escrita — Objetiva** (eliminatória e classificatória): 88 questões, 4.5h, 5 alternativas, sem consulta. Mínimo: 44 acertos (de 88) (lista geral) / 35 acertos (de 88) (reservadas).
   - Convocados p/ 2ª e 3ª: até a 132ª colocação (inclusive empatados); PcD até a 16ª; negros/indígenas até a 84ª (com autodeclaração confirmada); trans até a 4ª (com autodeclaração confirmada).
2. **2ª e 3ª Provas Escritas — Dissertativas** (eliminatórias e classificatórias): 4h30 cada, consulta só a texto legal. Ver [[../../DEFENSOR-PUBLICO/07-DISCURSIVA/guia-discursiva|guia da discursiva]].
3. **Prova Oral** (eliminatória e classificatória), nota mínima 5 (reservadas 3).
4. **Avaliação de Títulos** (classificatória, máx. 1 ponto). Ver [[../../DEFENSOR-PUBLICO/08-TITULOS|títulos]].

## Conteúdo programático

13 disciplinas (Anexo II). Ver [[../../DEFENSOR-PUBLICO/03-MAPAS-MATERIAS/00-INDICE|mapas por matéria]]. Legislação considerada: vigente até a data de publicação do edital, incluindo súmulas e jurisprudência.

## Alertas do edital

- Documento analisado é MINUTA do edital (edital-original-minuta.md); trechos riscados (~~) foram ignorados, e o cronograma do Anexo III é PROVISÓRIO e sujeito a alteração ('Demais datas serão definidas posteriormente'). Reconferir com o edital oficial publicado.
- O título do item 2 (requisitos de inscrição) e do item 6 (inscrições de candidatos trans) aparecem riscados no texto do edital, embora o corpo do item 2.1 esteja legível; requisitos foram extraídos do item 2.1 e a reserva de 2% a trans do item 6.1 - confirmar no edital final.
- O edital NÃO distribui as 88 questões objetivas por disciplina nem informa pesos: materias[].questoes = null e estrutura_prova.objetiva.distribuicao_questoes_por_disciplina = null (estimativa é do materia-mapper). Nota da objetiva em escala 0-10; mínimo por número de acertos (44 / 35).
- Edital não classifica matérias como gerais/específicas: todas as 13 foram marcadas tipo='especificos_cargo' (carreira única). Não há matéria 'gerais' neste concurso.
- Direito Administrativo e Direito Tributário, e Direito Civil e Direito Empresarial formam um único bloco cada na prova objetiva (itens 9.1 b e e), mas têm programas separados no Anexo II; mantidos como matérias distintas.
- Remuneração/subsídio, valor da taxa de inscrição, código do cargo e data de publicação do edital não constam do edital: salario=null, codigo=null, publicacao_edital=null. vagas_total=70 (mais vagas que surgirem); vagas_ac=null (reservas: 30% negros/indígenas, 5% PcD, 2% trans, com arredondamento pela regra do edital). resultado_final=null (não consta do cronograma).
- datas_chave contém campos além do mínimo do schema (pagamento, gabarito, dissertativas etc.); prova_data = 2027-01-10 (1ª prova objetiva); 2ª prova 2027-07-03 e 3ª 2027-07-04.
- Erros do texto original preservados literalmente: Direito Civil item 27 'Espousais'; item 48 rotula como 'Marco civil da internet' a Lei nº 13.709/2018 (que é a LGPD; o Marco Civil é a Lei 12.965/2014); Filosofia/Kelsen 'Conflicts entre normas'; no Princípios e Atribuições o item 14 (proteção de dados) estava colado ao fim do item 13 e foi separado em tópico próprio (há então dois tópicos '14.').
- Direito Processual Civil: item 15 usa numeração interna 12.1-12.7 e item 6 usa 5.7/5.8 (resquícios de renumeração do edital); preservado literalmente. Ocorrem quebras de página no meio de itens (reunidas no mesmo tópico).
- Obras de Filosofia/Sociologia: observação registrada em materias[filosofia-sociologia].observacao_obras, obras_indicadas e como último tópico (as questões serão extraídas dessas 5 obras).
- Art. 17 da Deliberação CSDP 454/2025: o conteúdo deve abordar transversalmente racismo, gênero, diversidade sexual e capacitismo.
- materia_id são PROPOSTAS novas (não havia .meta.json prévio para este concurso) e exigem confirmação humana conforme o ADR de identidade de matéria.
- leis_citadas: lista curada a partir do Anexo II; anos de normas sem ano explícito (ex.: Lei Estadual 10.177) foram completados com a data por extenso do edital. Códigos (CP, CPP, CC) e jurisprudência não são listados por não terem número citado.
