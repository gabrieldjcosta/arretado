# Disciplinas do acervo (curadoria)

Disciplinas = as 13 matérias do Anexo II do edital, mais "Outros". A primeira de cada linha é a principal; as demais são multi-vínculo (um `vinculosDisciplina` por disciplina na adesão). Casamento por número da lei nos tópicos de cada matéria (`edital-parsed.json`), `leis_citadas` e julgamento do tema. Para revisão do Gabriel.

## Suposições / incertos

- Súmulas são por coleção, não por assunto: STF e STF vinculantes → Direito Constitucional; STJ → Direito Penal (principal arbitrária; STJ mistura Civil/Penal/Processo); TJSP → Direito Processual Civil; TNU → Outros (previdenciário não consta do edital).
- Decretos estaduais (SP) 55.334/2010 e 55.370/2010 → Outros (assunto não identificado nos tópicos).
- LEP: antes "Execução Penal" (não é matéria do edital); agora Direito Penal + Direito Processual Penal.
- Penais-tributárias (8.137, 10.684) e Lei 9.249/9.430: Tributário/Penal conforme tópicos; principal incerta.
- Leis ambientais, saúde, educação, saneamento, mobilidade, segurança alimentar: Direitos Difusos e Coletivos (tópicos citam; principal única).
- LC (SP) 207/1979 e 893/2001: Direito Administrativo (regime disciplinar); 893 também Princípios/Atribuições da Defensoria.
- Lei SP 10.705/2000 (ITCMD) → Direito Tributário (o casamento por número apontou Civil, descartado).
- Lei 10.932/2004, 10.639/2003, 14.126/2021, 12.847/2013, 15.512/2026: poucos ou nenhum hit nos tópicos; classificadas por tema.
- Disciplinas do usuário são casadas por nome na adesão; quem não existir fica "sem disciplina" com a sugestão guardada.

## Tabela item → disciplinas

| Item                                                                                           | Disciplinas                                                                                       |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Lei de Execução Penal (Lei nº 7.210/1984)                                                      | Direito Penal; Direito Processual Penal                                                           |
| Constituição da República Federativa do Brasil de 1988                                         | Direito Constitucional; Direitos Humanos                                                          |
| Constituição do Estado de São Paulo de 05/10/1989                                              | Direito Constitucional; Direito Administrativo                                                    |
| Emenda Constitucional 80/2014 (Defensoria Pública)                                             | Princípios e Atribuições Institucionais da Defensoria Pública do Estado; Direito Constitucional   |
| Lei Complementar 80/1994 (LONDP)                                                               | Princípios e Atribuições Institucionais da Defensoria Pública do Estado                           |
| Lei Complementar (SP) 988/2006 (Lei Orgânica DPE-SP)                                           | Princípios e Atribuições Institucionais da Defensoria Pública do Estado                           |
| Lei Complementar (SP) 207/1979                                                                 | Direito Administrativo                                                                            |
| Lei Complementar (SP) 893/2001                                                                 | Direito Administrativo; Princípios e Atribuições Institucionais da Defensoria Pública do Estado   |
| Decreto-Lei 4.657/1942 (LINDB)                                                                 | Direito Civil                                                                                     |
| Decreto-Lei 3.688/1941 (Lei das Contravenções Penais)                                          | Direito Penal                                                                                     |
| Lei 12.850/2013 (Organização Criminosa)                                                        | Direito Penal; Direito Processual Penal                                                           |
| Lei 9.503/1997 (Código de Trânsito Brasileiro)                                                 | Direito Penal                                                                                     |
| Lei 9.605/1998 (Crimes Ambientais)                                                             | Direito Penal; Direitos Difusos e Coletivos                                                       |
| Lei 10.826/2003 (Estatuto do Desarmamento)                                                     | Direito Penal                                                                                     |
| Lei 8.072/1990 (Crimes Hediondos)                                                              | Direito Penal                                                                                     |
| Lei 11.343/2006 (Lei de Drogas)                                                                | Direito Penal                                                                                     |
| Lei 8.078/1990 (Código de Defesa do Consumidor)                                                | Direitos Difusos e Coletivos; Direito Civil; Direito Processual Civil                             |
| Lei 1.521/1951 (Crimes contra a Economia Popular)                                              | Direito Penal                                                                                     |
| Lei 8.137/1990 (Crimes contra a Ordem Tributária)                                              | Direito Penal; Direito Tributário                                                                 |
| Lei 9.249/1995 (Imposto de Renda das pessoas jurídicas; citada em crimes tributários)          | Direito Tributário                                                                                |
| Lei 9.430/1996 (legislação tributária federal; citada em crimes tributários)                   | Direito Tributário                                                                                |
| Lei 10.684/2003 (legislação tributária/parcelamento; citada em crimes tributários)             | Direito Tributário; Direito Penal                                                                 |
| Lei 9.613/1998 (Lavagem de Dinheiro)                                                           | Direito Penal                                                                                     |
| Lei 7.716/1989 (Crimes de preconceito de raça ou cor)                                          | Direito Penal; Direitos Humanos                                                                   |
| Lei 6.001/1973 (Estatuto do Índio)                                                             | Direitos Humanos; Direitos Difusos e Coletivos                                                    |
| Lei 13.869/2019 (Abuso de Autoridade)                                                          | Direito Penal                                                                                     |
| Lei 10.741/2003 (Estatuto da Pessoa Idosa)                                                     | Direitos Difusos e Coletivos; Direito Civil                                                       |
| Lei 6.766/1979 (Parcelamento do Solo Urbano)                                                   | Direito Civil; Direitos Difusos e Coletivos                                                       |
| Lei 10.932/2004 (altera art. 4º da Lei 6.766/1979)                                             | Direito Civil                                                                                     |
| Lei 11.340/2006 (Lei Maria da Penha)                                                           | Direito Penal; Direitos Humanos                                                                   |
| Lei 8.069/1990 (ECA)                                                                           | Direito da Criança e do Adolescente                                                               |
| Lei 9.455/1997 - Lei de Tortura                                                                | Direito Penal; Direitos Humanos                                                                   |
| Lei 12.847/2013 - Sistema Nacional de Prevenção e Combate à Tortura (SNPCT)                    | Direitos Humanos                                                                                  |
| Lei 10.216/2001 - Reforma Psiquiátrica / saúde mental                                          | Direitos Difusos e Coletivos; Direitos Humanos                                                    |
| Lei 13.146/2015 - Estatuto da Pessoa com Deficiência (LBI)                                     | Direito Civil; Direitos Humanos; Direitos Difusos e Coletivos                                     |
| Lei 10.257/2001 - Estatuto da Cidade                                                           | Direitos Difusos e Coletivos; Direito Administrativo                                              |
| Lei 6.015/1973 - Lei de Registros Públicos                                                     | Direito Civil                                                                                     |
| Lei 8.245/1991 - Lei de Locações                                                               | Direito Civil                                                                                     |
| Lei 8.009/1990 - Bem de Família                                                                | Direito Civil                                                                                     |
| Lei 5.478/1968 - Lei de Alimentos                                                              | Direito Civil; Direito Processual Civil                                                           |
| Lei 11.804/2008 - Alimentos Gravídicos                                                         | Direito Civil                                                                                     |
| Lei 13.465/2017 - REURB / Regularização Fundiária                                              | Direito Civil; Direitos Difusos e Coletivos                                                       |
| Lei 13.709/2018 - LGPD                                                                         | Direitos Difusos e Coletivos; Direito Civil                                                       |
| Lei 12.965/2014 - Marco Civil da Internet                                                      | Direito Civil; Direitos Difusos e Coletivos                                                       |
| Lei 13.105/2015 - Código de Processo Civil                                                     | Direito Processual Civil                                                                          |
| Lei 13.140/2015 - Lei de Mediação                                                              | Direito Processual Civil; Princípios e Atribuições Institucionais da Defensoria Pública do Estado |
| Lei 12.288/2010 - Estatuto da Igualdade Racial                                                 | Direitos Humanos; Direitos Difusos e Coletivos                                                    |
| Lei 9.008/1995 - Fundo de Defesa de Direitos Difusos (FDD) / Conselho Federal (CFDD)           | Direitos Difusos e Coletivos                                                                      |
| Lei 8.742/1993 - LOAS                                                                          | Direitos Difusos e Coletivos; Direito da Criança e do Adolescente                                 |
| Lei 8.080/1990 - Lei Orgânica do SUS                                                           | Direitos Difusos e Coletivos                                                                      |
| Lei 9.656/1998 - Lei dos Planos de Saúde                                                       | Direitos Difusos e Coletivos                                                                      |
| Lei 9.394/1996 - LDB                                                                           | Direitos Difusos e Coletivos; Direito da Criança e do Adolescente                                 |
| Lei 11.445/2007 - Diretrizes Nacionais do Saneamento Básico (Marco Legal)                      | Direitos Difusos e Coletivos                                                                      |
| Lei 14.026/2020 - Novo Marco Legal do Saneamento                                               | Direitos Difusos e Coletivos                                                                      |
| Lei 12.587/2012 - Política Nacional de Mobilidade Urbana                                       | Direitos Difusos e Coletivos                                                                      |
| Lei 15.432/2026 - Marco Legal do Transporte Público Coletivo Urbano                            | Direitos Difusos e Coletivos                                                                      |
| Lei 11.346/2006 - LOSAN (SISAN)                                                                | Direitos Difusos e Coletivos                                                                      |
| Lei 11.947/2009 - Programa Nacional de Alimentação Escolar (PNAE)                              | Direitos Difusos e Coletivos; Direito da Criança e do Adolescente                                 |
| Lei 10.098/2000 - Lei de Acessibilidade                                                        | Direitos Difusos e Coletivos; Direitos Humanos                                                    |
| Lei 14.126/2021 - Visão Monocular como deficiência sensorial                                   | Direitos Difusos e Coletivos; Direitos Humanos                                                    |
| Lei 10.639/2003 - Ensino de História e Cultura Afro-Brasileira (altera LDB)                    | Direitos Humanos; Direitos Difusos e Coletivos                                                    |
| Lei 13.812/2019 - Política Nacional de Busca de Pessoas Desaparecidas                          | Direitos Difusos e Coletivos; Direitos Humanos                                                    |
| Lei 15.211/2025 - ECA Digital (Estatuto Digital da Criança e do Adolescente)                   | Direito da Criança e do Adolescente; Direitos Difusos e Coletivos                                 |
| Lei 15.512/2026 - ECA Ambiental (direito de crianças e adolescentes à natureza)                | Direito da Criança e do Adolescente; Direitos Difusos e Coletivos                                 |
| Lei 6.938/1981 - Política Nacional do Meio Ambiente                                            | Direitos Difusos e Coletivos                                                                      |
| Lei 12.187/2009 - Política Nacional sobre Mudança do Clima                                     | Direitos Difusos e Coletivos                                                                      |
| Lei 14.904/2024 - Diretrizes para planos de adaptação à mudança do clima                       | Direitos Difusos e Coletivos                                                                      |
| Lei 15.042/2024 - SBCE (Mercado de Carbono)                                                    | Direitos Difusos e Coletivos                                                                      |
| Lei 14.850/2024 - Política Nacional de Qualidade do Ar                                         | Direitos Difusos e Coletivos                                                                      |
| Lei 15.506/2026 - Política Nacional de Minerais Críticos e Estratégicos                        | Direitos Difusos e Coletivos                                                                      |
| Lei 15.190/2025 - Lei Geral do Licenciamento Ambiental                                         | Direitos Difusos e Coletivos                                                                      |
| Lei 9.985/2000 - SNUC                                                                          | Direitos Difusos e Coletivos                                                                      |
| Lei 12.651/2012 - Código Florestal                                                             | Direitos Difusos e Coletivos                                                                      |
| Lei 14.119/2021 - Política Nacional de Pagamento por Serviços Ambientais                       | Direitos Difusos e Coletivos                                                                      |
| Lei 12.608/2012 - Política Nacional de Proteção e Defesa Civil                                 | Direitos Difusos e Coletivos                                                                      |
| Lei 14.750/2023 - Altera as Leis 12.608/2012 e 12.340/2010                                     | Direitos Difusos e Coletivos                                                                      |
| Lei 12.334/2010 - Política Nacional de Segurança de Barragens                                  | Direitos Difusos e Coletivos                                                                      |
| Lei 14.755/2023 - Política Nacional de Direitos das Populações Atingidas por Barragens         | Direitos Difusos e Coletivos; Direitos Humanos                                                    |
| Lei 9.795/1999 - Política Nacional de Educação Ambiental                                       | Direitos Difusos e Coletivos                                                                      |
| Lei 14.926/2024 - Educação climática (altera Lei 9.795/1999)                                   | Direitos Difusos e Coletivos                                                                      |
| Lei 10.650/2003 - Acesso público a dados e informações ambientais (Sisnama)                    | Direitos Difusos e Coletivos                                                                      |
| Lei 9.433/1997 - Política Nacional de Recursos Hídricos                                        | Direitos Difusos e Coletivos                                                                      |
| Lei 12.305/2010 - Política Nacional de Resíduos Sólidos                                        | Direitos Difusos e Coletivos                                                                      |
| Lei 14.181/2021 - Superendividamento (altera CDC e Estatuto da Pessoa Idosa)                   | Direitos Difusos e Coletivos; Direito Civil                                                       |
| Lei 12.527/2011 - Lei de Acesso à Informação                                                   | Direito Administrativo                                                                            |
| Lei 15.263/2025 - Política Nacional de Linguagem Simples                                       | Direito Administrativo                                                                            |
| Lei 12.852/2013 - Estatuto da Juventude                                                        | Direito da Criança e do Adolescente                                                               |
| Lei 13.257/2016 - Marco Legal da Primeira Infância                                             | Direito da Criança e do Adolescente                                                               |
| Lei 13.185/2015 - Programa de Combate à Intimidação Sistemática (Bullying)                     | Direito da Criança e do Adolescente                                                               |
| Lei 12.594/2012 - SINASE                                                                       | Direito da Criança e do Adolescente                                                               |
| Lei 12.435/2011 (altera a LOAS - Lei 8.742/1993)                                               | Direito da Criança e do Adolescente; Direitos Difusos e Coletivos                                 |
| Lei 13.005/2014 (Plano Nacional de Educação - PNE)                                             | Direito da Criança e do Adolescente; Direitos Difusos e Coletivos                                 |
| Lei 13.431/2017 (Escuta especializada e depoimento especial)                                   | Direito da Criança e do Adolescente                                                               |
| Lei 14.344/2022 (Lei Henry Borel)                                                              | Direito da Criança e do Adolescente; Direito Penal                                                |
| Lei 12.764/2012 (Política Nacional de Proteção dos Direitos da Pessoa com TEA)                 | Direitos Humanos; Direitos Difusos e Coletivos                                                    |
| Lei (SP) 10.177/1998 (Processo administrativo estadual)                                        | Direito Administrativo                                                                            |
| Lei (SP) 14.187/2010                                                                           | Direito Administrativo                                                                            |
| Lei (SP) 10.948/2001 (Discriminação por orientação sexual)                                     | Direitos Humanos; Direito Administrativo                                                          |
| Lei (SP) 11.199/2002                                                                           | Direito Administrativo                                                                            |
| Lei (SP) 10.705/2000 (ITCMD)                                                                   | Direito Tributário                                                                                |
| Lei (SP) 10.365/1999 (Programa de Locação Social)                                              | Direitos Difusos e Coletivos; Direito Administrativo                                              |
| Lei (SP) 6.536/1989 (Fundo Estadual de Defesa dos Interesses Difusos - FID)                    | Direitos Difusos e Coletivos                                                                      |
| Decreto 9.847/2019 (Regulamento de armas de fogo - Lei 10.826/2003)                            | Direito Penal                                                                                     |
| Decreto 7.053/2009 (Política Nacional para a População em Situação de Rua)                     | Direitos Humanos; Direitos Difusos e Coletivos                                                    |
| Decreto 5.051/2004 (promulga a Convenção 169 da OIT)                                           | Direitos Humanos; Direitos Difusos e Coletivos                                                    |
| Decreto 10.088/2019 (consolidação das convenções e recomendações da OIT)                       | Direitos Humanos                                                                                  |
| Decreto 4.377/2002 (promulga a CEDAW)                                                          | Direitos Humanos                                                                                  |
| Decreto 9.073/2017 (promulga o Acordo de Paris)                                                | Direitos Difusos e Coletivos; Direitos Humanos                                                    |
| Decreto 12.710/2025 (Plano Nacional de Proteção a Defensoras e Defensores de Direitos Humanos) | Direitos Humanos; Princípios e Atribuições Institucionais da Defensoria Pública do Estado         |
| Decreto 11.414/2023 (Programa Pró-Catadoras e Pró-Catadores / Comitê Interministerial)         | Direitos Difusos e Coletivos                                                                      |
| Decreto 7.405/2010 (Programa Pró-Catador)                                                      | Direitos Difusos e Coletivos                                                                      |
| Decreto 7.962/2013 (contratação no comércio eletrônico - regulamenta o CDC)                    | Direitos Difusos e Coletivos; Direito Civil                                                       |
| Decreto (SP) 55.334/2010                                                                       | Outros                                                                                            |
| Decreto (SP) 55.370/2010 (altera o Decreto 55.334/2010)                                        | Outros                                                                                            |
| Súmulas do Supremo Tribunal Federal                                                            | Direito Constitucional                                                                            |
| Súmulas Vinculantes do Supremo Tribunal Federal                                                | Direito Constitucional                                                                            |
| Súmulas do Superior Tribunal de Justiça                                                        | Direito Penal                                                                                     |
| Súmulas do Tribunal de Justiça de São Paulo                                                    | Direito Processual Civil                                                                          |
| Súmulas da Turma Nacional de Uniformização                                                     | Outros                                                                                            |
