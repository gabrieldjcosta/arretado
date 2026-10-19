# Revisão das disciplinas da trilha (19/10/2026)

Pedido do Gabriel: várias disciplinas tinham poucos assuntos porque a extração do edital juntou vários assuntos num só. Correção feita no catálogo (`corpus/catalogo/`) por `npm run catalogo -- dividir` (regras em `scripts/catalogo/dividir.mjs`, também aplicadas no `converter` de carreira nova).

## O que o divisor faz
1. **Marcadores numerados embutidos** ("... 18. Poder Legislativo ... 19. Poder Executivo", "17.6. Embargos"): cada marcador vira um assunto com o próprio número.
2. **Item longo (> 400 caracteres)**: quebra em frases (sem cortar depois de "art.", "nº" etc.); título curto ("Poder Executivo.") fica com a frase seguinte; cada assunto fecha com pelo menos 90 caracteres. Números novos: `N.1`, `N.2`…
3. **Item gigante sem frases (> 900)**: quebra em "; " (nunca antes de subitem "a)", "b)") em trechos de pelo menos 300 caracteres.
4. Tira cabeçalho de página colado no texto ("D.O. PUBLICAÇÕES…", "Edital Nº … pg. 39"), tira 4 anexos do edital (declarações/formulários da DPE/PE, vão para `descartes/`) e some com cópias idênticas que a divisão produz.
Faixa, recorrência e fonte são herdadas por cada assunto novo. Idempotente (rodar de novo não muda nada). Nenhum texto é reescrito: só se quebra em fronteiras de frase ou de ";".

## Totais
| Carreira | Itens antes | Itens depois |
|---|---|---|
| Defensoria Pública | 6.161 | 8.609 |
| Magistratura | 3.843 | 6.485 |
| Ministério Público | 337 | 896 |
| Ambiental | 564 | 564 (sem mudança) |

## Antes e depois por disciplina (média de assuntos por edital)
Só as que mudaram.

| Carreira | Disciplina | Editais | Antes | Depois |
|---|---|---|---|---|
| Defensoria Pública | Direito Administrativo e Tributário | 1 | 1 | 23 |
| Defensoria Pública | Direito Civil e Empresarial | 1 | 4 | 83 |
| Defensoria Pública | Processo Penal e Execução Penal | 3 | 3.3 | 57.3 |
| Ministério Público (Promotor) | Direito Do Idoso E Direito Da Pessoa Com Deficiência | 1 | 1 | 8 |
| Ministério Público (Promotor) | Direitos Humanos | 2 | 4 | 26.5 |
| Magistratura | Direito Agrário | 1 | 3 | 17 |
| Ministério Público (Promotor) | Direito do Trabalho | 1 | 38 | 166 |
| Ministério Público (Promotor) | Direito Constitucional | 3 | 10.3 | 39 |
| Ministério Público (Promotor) | Direito Civil | 4 | 8.8 | 30.3 |
| Ministério Público (Promotor) | Direito Internacional | 1 | 5 | 17 |
| Defensoria Pública | Direito Penal e Criminologia | 4 | 18.5 | 48 |
| Ministério Público (Promotor) | Processo Civil | 4 | 12.3 | 30.5 |
| Ministério Público (Promotor) | Direito Eleitoral | 3 | 6.3 | 15.3 |
| Magistratura | Direito Administrativo | 17 | 15.5 | 37.4 |
| Magistratura | Processo Civil | 17 | 17.9 | 42.6 |
| Magistratura | Direito Civil | 17 | 18.2 | 40.5 |
| Magistratura | Direito Internacional | 6 | 10.3 | 22.7 |
| Magistratura | Processo Penal | 14 | 15.1 | 32.1 |
| Defensoria Pública | Direito Antidiscriminatório | 3 | 14.7 | 30.3 |
| Ministério Público (Promotor) | Direito Administrativo | 4 | 6.3 | 12.8 |
| Ministério Público (Promotor) | Tutela Coletiva | 3 | 13 | 26.3 |
| Defensoria Pública | Direitos Difusos e Coletivos | 8 | 23.6 | 45.9 |
| Defensoria Pública | Execução Penal | 7 | 13.1 | 23.6 |
| Ministério Público (Promotor) | Legislação Institucional / Lei Orgânica | 2 | 5.5 | 9.5 |
| Magistratura | Direito Penal | 17 | 28.9 | 49.3 |
| Magistratura | Direito Constitucional | 17 | 15.1 | 25.5 |
| Defensoria Pública | Processo Civil | 12 | 44.5 | 72.6 |
| Defensoria Pública | Direito Civil | 11 | 59.2 | 89.4 |
| Ministério Público (Promotor) | Legislaçãoreferente Aoministériopúblico | 1 | 2 | 3 |
| Defensoria Pública | Direito Constitucional | 13 | 45.5 | 68 |
| Magistratura | Direito Financeiro e Tributário | 12 | 18.3 | 26.4 |
| Magistratura | Noções Gerais de Direito e Formação Humanística | 17 | 28.9 | 41.6 |
| Magistratura | Direito Ambiental | 14 | 16.6 | 23.5 |
| Defensoria Pública | Direitos Humanos | 12 | 35.8 | 50.3 |
| Defensoria Pública | Filosofia do Direito / Sociologia Jurídica | 7 | 34 | 47 |
| Magistratura | Direito Econômico e do Consumidor | 6 | 9.3 | 12.7 |
| Magistratura | Direito Empresarial | 17 | 15.4 | 19.9 |
| Ministério Público (Promotor) | Direito Penal | 4 | 15 | 19.3 |
| Defensoria Pública | Direito Administrativo | 11 | 64.6 | 82.7 |
| Defensoria Pública | Legislação Institucional / Lei Orgânica | 12 | 19.4 | 24.8 |
| Ministério Público (Promotor) | Direito Ambiental | 1 | 12 | 15 |
| Magistratura | Direito da Criança e do Adolescente | 8 | 15.1 | 18.8 |
| Magistratura | Direitos Humanos | 17 | 8.4 | 10.3 |
| Defensoria Pública | Direito Agrário | 2 | 30 | 36.5 |
| Defensoria Pública | Direito da Criança e do Adolescente | 11 | 28.2 | 34.1 |
| Defensoria Pública | Processo Penal | 10 | 25.1 | 30.3 |
| Defensoria Pública | Direito Penal | 8 | 31.9 | 38.4 |
| Defensoria Pública | Direito Sanitário | 1 | 10 | 12 |
| Magistratura | Direito do Consumidor | 8 | 17 | 19.5 |
| Defensoria Pública | Direito do Consumidor | 13 | 43.2 | 49.5 |
| Magistratura | Direito Eleitoral | 8 | 19.8 | 22.5 |
| Defensoria Pública | Noções De Ciência Política | 1 | 37 | 42 |
| Magistratura | Direito Previdenciário | 7 | 12.3 | 13.7 |
| Defensoria Pública | Medicina Legal | 1 | 35 | 38 |
| Defensoria Pública | Direito do Trabalho | 1 | 39 | 41 |
| Defensoria Pública | Direito Internacional | 1 | 40 | 41 |

## Limites (não corrigido)
- Texto de PDF com palavras coladas ("OrganizaçãofuncionaldoEstado") segue como veio; só a extração de novo conserta.
- Uns 36 assuntos ainda passam de 700 caracteres: frase única sem ";" (ex.: um parágrafo só). Não se corta no meio da frase.
- Os assuntos novos dentro do mesmo item usam número derivado (`17.1`, `17.2`…); numeração do edital que já era assim pode repetir (aviso "item repetido", não bloqueia).
- O rascunho do onboarding guarda assuntos desmarcados por posição na disciplina (`chaveDoItem`): um rascunho aberto antes desta mudança pode desmarcar o assunto errado. Plano criado (Pontos) não é afetado: Ponto vem do título.
