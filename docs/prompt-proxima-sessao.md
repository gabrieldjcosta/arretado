Leia docs/proxima-sessao.md e execute a 8.7 (anexos, confiança por dispositivo, validação estrutural e relatório de anomalias), seguindo a rotina de pronto do plano.

Antes de começar, leia só:
* no proxima-sessao.md, a seção "Feita: 8.6" (com "VETADO" e "Risco da reimportação") e "Tolerâncias do corpus";
* no plano (docs/planos/F2.md): a linha da 8.7; "Fatos do estruturador (8.6)"; "Fatos do gabarito (7.3)" (anexo da LC-SP 988, casos `paragrafo-unico-com-numerado` e `paragrafo-1-sem-2`); "Fatos da publicação (9.3)" (o que já bloqueia); "Rotina de cada atividade";
* na Parte 2 §10.6, as regras 11, 12 e 13 do estruturador;
* em solucao-de-problemas.md: "Previsível na 8.7", "Redações do estruturador × gabarito…", "Nota de renumeração que começa pelo dispositivo fica no texto", "Gabarito cheio de pendências…", "A fonte pode ter mudado de formato".
Não abra inteiros *.html, *.colado.html nem o package-lock. Use git grep, faixas de linhas ou script Node que imprima o mínimo.

Escopo (só a 8.7, em src/dominios/legislacao/estruturador.ts e módulos irmãos; sem tela nova):
* regra 11: bloco depois de "ANEXO" vira dispositivo `anexo` (e `anexoII`…) com o texto bruto preservado, sem estruturar; decidir se o tachado do anexo da LC-SP 988 (10 linhas que hoje ficam na faixa) vira redação anterior dele ou fica no texto bruto, e registrar a decisão;
* regra 12: confiança por dispositivo (alta, média, a confirmar); o artigo só tachado sem nota de revogação já sai `media`; conferir que `linhasTachadas`, duplicata e estrutural substituído (redação `heuristica`) são coerentes com o leitor; aviso "a fonte pode ter mudado de formato" quando "a confirmar" passar de 20% (contar só `a_confirmar`);
* regra 13: `validarEstrutura(rascunho)` (não reutilizar `Conflito` do pacote) com sequência de artigos crescente e sufixos válidos, endereço duplicado após a fusão, toda alínea sob inciso (a alínea direto no parágrafo, lei anterior à LC 95/1998, é aviso: LEP 24, CP 24, LC 80 10, LC-SP 988 8, ECA 28, CDC 2), `sem_pai`, `tachado_sem_dispositivo`; fechar a lista de `TipoAnomalia` e a gravidade de cada uma; a LC 80 (duas "SEÇÃO IV") continua só aviso, como decidido na 9.3, mas reexaminar;
* pendência da regra 7 achada na 8.6: a nota que começa pelo dispositivo ("(Parágrafo único renumerado…)", "(Transformado em § 1º…)": CP art. 153 § 1º; CF arts. 102 e 198 § 1º) deve virar nota `renumerado` no estruturador e no gabarito; o gabarito só se regera com `corpus:gabarito`, a diferença é examinada na página e o CP e a CF voltam a "pendente" (dizer quais itens reconferir);
* ligar o relatório à 9.3 (`verificarPublicacao`) e ao sumário da 9.5 sem mudar a tela além do necessário; a subida do esquema do `vetado` NÃO entra aqui.

Critérios:
* relatório sem conflitos na LEP e no CP (e nas outras 5 normas: explicar cada aviso que sobrar, um a um); contagens de anomalias por tipo registradas em "Fatos do estruturador (8.7)";
* testes de unidade por regra (11, 12, 13) com casos tirados do corpus, mais desempenho (sem regra quadrática, `desempenho.test.ts`: anexo grande, milhares de artigos fora de ordem, sequência com sufixos);
* `npm run check` verde; E2E verde (o E2E da 9.5 ainda cola a LEP compilada e o ECA e publica: não pode quebrar); sem subida de esquema;
* termo novo em docs/glossario.md; problemas em solucao-de-problemas.md (incluindo o "previsível na 8.8": texto puro, tudo a confirmar, redação por heurística);
* atualize proxima-sessao.md (próxima: 8.8; registrar a hora do merge do #25, 19h33 de 29/09/2026) e o plano (8.7 com ✅ e "Fatos do estruturador (8.7)");
* commit num branch com PR para o main, merge por "Create a merge commit", e me avise.

Esforço P: se passar de ~200 mil tokens, pare no que estiver verde (regra 11 e 12 primeiro; 13 depois), atualize o proxima-sessao.md e me avise para abrir outra sessão.

Pendente do Gabriel, sem travar a 8.7: exportar o backup em Conta › Dados antes da subida do esquema do `vetado` (atividade própria, depois da 8.9); marco antecipado (LEP e ECA no celular) e reconferência dos gabaritos, que trava só a 8.9.
