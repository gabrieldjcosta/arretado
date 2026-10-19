# Acompanhamento de editais: plano e recomendação (19/10/2026)

Status: **proposta, nada construído**. Aguarda o aval do Gabriel.

## Objetivo
Edital novo ou retificado chega ao app como catálogo (trilha) e lista de legislação sem a pessoa procurar fora. Hoje o catálogo (`corpus/catalogo/`) é montado à mão por carreira via CSV do Perplexity e `npm run catalogo`; não há detecção.

## Fontes (por prioridade)
1. **Bancas**: FCC (`concursosfcc.com.br`, uma página por concurso com histórico de editais e retificações), FGV (`conhecimento.fgv.br/concursos`), Cebraspe (`cebraspe.org.br/concursos`), Fundatec. São a fonte do PDF e dizem "em andamento/encerrado".
2. **Órgão**: site da Defensoria, TJ, MP e Diário Oficial (publicação oficial e retificação).
3. **Descoberta**: agregadores (PCI, Concursos no Brasil) só como alerta de "saiu edital"; nunca como fonte do conteúdo (regra do validador do catálogo).

## Frequência
Diária, de manhã, para a lista de concursos "abertos/em andamento" das 4 bancas; semanal para varrer órgãos sem edital no catálogo (hoje: 14 DPEs, 20 TJs/TRF4, 2 ambientais). Concurso com inscrições abertas: checar retificação a cada execução diária.

## Detecção
- Guardar por concurso a URL do edital + hash (SHA-256) do PDF e a lista de links da página da banca.
- **Novo**: concurso do órgão/carreira cobertos que não existe no catálogo.
- **Retificado**: hash do PDF mudou, ou apareceu "Edital nº 0X/AAAA – retificação" na página. Compara o texto do conteúdo programático antigo × novo e lista só o diff.
- Saída: um arquivo `docs/editais/fila.json` (ou issue no GitHub) com `{órgão, banca, url, tipo: novo|retificado, detectadoEm}`.

## Do edital à trilha e à legislação
1. Baixa o PDF e extrai o texto (já feito para a Corte IDH: `scripts/pdf-para-md.mjs`).
2. Estrutura em CSV no contrato do catálogo (`docs/planos/catalogo-formato.md`): hoje via Perplexity; proposta: extração por modelo com saída no mesmo CSV, validada pelo `validar`.
3. `npm run catalogo -- converter` já divide assuntos juntados e gera JSON + índice.
4. Lista de legislação: as leis citadas no programa (ex.: `leis_citadas` do `edital-parsed.json`) são cruzadas com as normas do corpus; as que faltam entram na fila do estruturador da F2.
5. Trilha: o catálogo novo aparece no onboarding (já lê `index.json`); nada de código novo.

## Automático × revisão
| Etapa | Automático | Revisão do Gabriel |
|---|---|---|
| Detectar novo/retificado, baixar PDF, guardar hash | sim | não |
| Extrair e estruturar o programa | sim (rascunho) | **sim**: conferir contagem de disciplinas e itens contra o PDF |
| Publicar no catálogo | não | **sim**: PR para `integracao`, como hoje |
| Leis faltantes na fila de estruturação | sim | só ao importar a norma |

Princípio: o robô nunca altera o catálogo publicado; abre PR. Retificação que só muda cronograma é ignorada (compara só o programa).

## Recomendação
Fazer em 3 passos pequenos, cada um com aval:
1. **Radar** (só detecção): script Node que lê as páginas das 4 bancas, compara com `docs/editais/estado.json` e grava a fila. Sem extração. Rotina agendada diária proposta (não criada): 06h BRT, abre/atualiza uma issue "Editais novos" com a fila. Custo baixo.
2. **Rascunho de extração**: do item da fila ao CSV validado e PR de rascunho.
3. **Legislação**: cruzar leis citadas com o corpus e abrir a fila do estruturador.

Começar pelo passo 1 em carreiras já cobertas (Defensoria, Magistratura, MP, ambiental); as demais carreiras entram quando houver catálogo.

## Pré-requisitos e riscos
- **Rede da nuvem**: domínios a liberar (valem só para sessões novas): `concursosfcc.com.br`, `defensoria.sp.def.br`, `defensoria.ba.def.br`, `conhecimento.fgv.br`, `cebraspe.org.br` e `cdn.cebraspe.org.br`, `fundatec.org.br`. Em 19/10 todos davam 403.
- Páginas de banca mudam de layout: o radar deve falhar com aviso, não calar.
- PDF escaneado ou com tabela quebrada: extração automática errada passa batida; por isso a revisão obrigatória antes de publicar.
- Recorrência e faixa por disciplina (hoje sobre 13 editais da Defensoria) precisam ser recalculadas a cada edital novo; hoje é manual. Incluir no passo 2.
