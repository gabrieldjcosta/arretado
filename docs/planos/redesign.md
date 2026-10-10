# Plano do redesign — Arretado para quem tem dificuldade de concentração

Planejado em 09/10/2026 com o Gabriel. Spec aprovada: [`docs/superpowers/specs/2026-10-09-redesign-arretado-design.md`](../superpowers/specs/2026-10-09-redesign-arretado-design.md). Este plano a transforma em atividades pequenas e verificáveis, uma fatia por PR. **Não é fase do `CLAUDE.md`**: roda ao lado da F2 (ver "Convivência com a F2"). Nenhuma fatia sobe o esquema do banco, então nenhuma pede backup.

> **Revisado em 09/10/2026:** a ordem e as decisões finais estão em [`curso-de-acao.md`](curso-de-acao.md), que vale em caso de divergência.

## Ajustes à spec descobertos ao ler o código (aprovados pelo Gabriel em 09/10/2026)

1. **Contraste AA.** Contas feitas em 09/10/2026 sobre o Papel `#F1F3EE`: o "recuado" `#6B776F` dá cerca de 4,2:1 e a sálvia `#4F7A64` usada **como texto** dá cerca de 4,4:1; ambos abaixo de 4,5:1. A sálvia como **fundo de botão com texto branco** passa (cerca de 4,9:1). Plano: "recuado" passa a ~`#5C6860` (cerca de 5,2:1) e o texto de link usa uma sálvia mais escura (~`#3F6B4C`); valores finais medidos na 1.2.
2. **Navegação.** Hoje as 4 áreas ficam no **cabeçalho**, com "Registrar erro" ao lado (`Shell.tsx`). A fatia 2 decide: barra inferior no celular e no tablet, cabeçalho no desktop. O botão **+** flutuante só no celular; no desktop continua o botão do cabeçalho e o atalho `E`.
3. **"Dias nesta semana" → "dias nos últimos 7".** A semana de calendário zeraria toda segunda-feira, contra o princípio "não zera". A janela é móvel.
4. **Meta de 10 s.** O app não registra o instante em que é aberto, então "menos de 10 s" não sai do log. A medida vira: **toques da abertura até o primeiro cartão** (assertado no E2E) mais o relato do Gabriel. A cota e os dias com revisão saem do registro de `revisoes`, como previsto.
5. **Alavanca 6 e a 11.8.** A atividade 11.8 da F2 (leitura artigo por artigo, resto esmaecido) já cobre o "esmaecer fora do trecho". A fatia 4 só acrescenta o que a 11.8 não faz (régua opcional, Literata, "depois") e **só começa depois da 11.8 e da 11.9**.
6. **Cota não esconde nada.** O drill revisa até a cota e termina com "Revisar mais N". A fila nunca é cortada nem reordenada. Preferência opcional, padrão 10 (premissa da spec).

## Convivência com a F2

- `src/apresentacao/estilos.css` é editado também pela F2. Cada fatia sai de um `main` atualizado, entra entre duas atividades da F2 e é mergeada antes da próxima começar.
- Relatos do uso das férias (correções) têm prioridade sobre qualquer fatia.
- **Ordem (decidida em 09/10/2026):** 1, 2, 11.8, 3, (11.9 + 4), 5.
- Branches `claude/redesign-<fatia>`, PR para o `main`; merge pelo Gabriel (PR empilhado: "Create a merge commit"). Commits só quando o Gabriel pedir.

## Rotina de pronto (toda fatia)

- `npm run check > saida.txt` verde (no Windows, `--maxWorkers=4`; ver `solucao-de-problemas.md`) e conferir só as falhas.
- `npm run test:e2e` verde nos 3 aparelhos (desktop, celular, tablet) quando houver tela; axe nos dois temas nas telas tocadas.
- Capturas antes e depois (claro, escuro, celular) anexadas ao PR, só para revisão humana.
- Termo ou identificador novo em `docs/glossario.md`; problema encontrado ou previsível em `docs/solucao-de-problemas.md`; `docs/proxima-sessao.md` atualizado.
- Vocabulário obrigatório preservado (Aparelho, Problema, Erro, Dispositivo, Norma, Ponto, Dia, Sessão, Cartão, Revisão, Estrela, Frase correta).

---

## Fatia 1 — Fundação: tokens, temas e fontes

Arquivos: `src/apresentacao/estilos.css`, `config/seguranca.ts` (só conferir), `docs/decisoes-tecnicas.md`, `package.json`, `src/apresentacao/Aparencia.tsx` (conferir).

- [~] **1.1 (adiada por decisão do Gabriel em 09/10/2026: ele está desenvolvendo, não usando; medir quando abrirem os testes externos; ver `docs/redesign/linha-de-base.md`) Linha de base (antes de mexer em cor).** Registrar em `docs/redesign/linha-de-base.md`: toques da abertura ao primeiro cartão hoje (contar no app), dias com revisão nos últimos 14 (contar em `revisoes`), e a nota 1–5 de concentração da semana (pergunta ao Gabriel). Capturas de Recall, Biblioteca e leitor nos dois temas.
- [x] **1.2 Medir o contraste.** Script Node em `scripts/contraste.mjs` (sem dependência): calcula a razão WCAG de pares de tokens e imprime reprovados. Escrever primeiro o teste (`scripts/contraste.test.ts` no projeto de unidade, se o config permitir; senão rodar o script no `npm run check`) com os pares: texto/papel, atenuado/papel, link/papel, botão (texto branco/sálvia), tinta/marca-texto, nos dois temas. Ajustar os hex até todos passarem; registrar os finais no PR.
- [x] **1.3 Escolher e conferir as fontes.** `npm view @fontsource/atkinson-hyperlegible-next` e `npm view @fontsource-variable/literata` para confirmar que os pacotes existem e a licença (OFL). Se não existirem, parar e perguntar ao Gabriel. Pedir o OK para instalar (acrescenta dependências).
- [x] **1.4 Embutir as fontes.** Instalar os dois pacotes; importar só o subconjunto latino e os pesos 400, 500 e 700 (interface) e o eixo variável da Literata (leitura), por `@font-face` em `estilos.css` apontando para os arquivos do pacote, de modo que o Vite os copie para `dist/assets/`. Conferir que `font-src 'self'` basta e que o app abre offline depois de carregado (E2E de "funciona sem rede" já existente). Medir o acréscimo no `dist/` e registrar.
- [x] **1.5 Novos tokens e remapeamento.** Manter os nomes em português (`--fundo`, `--superficie`, `--texto`, `--texto-atenuado`, `--borda`, `--primaria`, `--foco`…) e só trocar os valores, para as regras existentes continuarem valendo. Acrescentar `--agora` (marca-texto), `--depois` (recuado) e `--progresso`. `--fonte-interface` = Atkinson; `--fonte-leitura` = Literata (a opção `sem_serifa` continua mapeando para a interface). Os dois blocos escuros (`prefers-color-scheme` e `[data-tema='escuro']`) recebem os mesmos valores.
- [x] **1.6 Revalidar o que depende do fundo.** Grifos (`--grifo-1..3`), destaques (`--destaque-*`), estrela e `--superficie-translucida` foram medidos contra o fundo antigo; reconferir cada um contra o Papel e o grafite-noite no `contraste.mjs` e ajustar.
- [x] **1.7 Testes.** `e2e/acessibilidade.spec.ts` já roda axe nos dois temas: confirmar que continua verde; acrescentar a verificação de que as fontes carregam (`document.fonts.check`) no desktop e no celular.
- [x] **1.8 (T19 aprovada em 09/10/2026) Decisão técnica.** Acrescentar **T19** em `docs/decisoes-tecnicas.md` (fontes embutidas: pacotes, licença, peso no `dist/`); propor ao Gabriel antes de gravar.
- **Pronto quando:** `check` e E2E verdes; capturas mostram a nova identidade em Recall, Biblioteca e leitor sem outro ajuste de layout; `contraste.mjs` sem reprovados.

## Fatia 2 — Componentes e casca

Arquivos novos em `src/apresentacao/componentes/`: `AcaoAgora.tsx`, `LinhaDepois.tsx`, `BarraFina.tsx`, `DiasDaSemana.tsx` (cada um com `.test.tsx`); alterados `Shell.tsx`, `componentes/estados.tsx`, `estilos.css`.

- [x] **2.1 `AcaoAgora` (teste primeiro).** Props: `titulo`, `estimativa?` (minutos), `rotuloBotao`, `para` (rota) ou `aoClicar`. Renderiza um cartão com o título, a estimativa em texto ("cerca de 6 min"), o botão principal e o traço de marca-texto sob o título. Testes: renderiza título e botão; sem `estimativa` não mostra a linha; o botão é um link quando recebe `para`; área de toque ≥ 44 px (classe de alvo); sem rótulos em caixa-alta.
- [x] **2.2 `LinhaDepois`.** Props: `children`. Texto recuado (`--depois`), com o prefixo "Depois:" em texto, não em rótulo separado. Teste: não renderiza nada sem filhos.
- [x] **2.3 `BarraFina`.** `role="progressbar"` com `aria-valuenow/min/max` e rótulo acessível; o texto "3 de 10" vai ao lado, em texto, para não depender só da cor. Teste: valores e rótulo; clamp entre 0 e max.
- [x] **2.4 `DiasDaSemana`.** Props: `dias` (7 booleanos, do mais antigo ao mais recente). Texto "4 dos últimos 7 dias" mais 7 marcas decorativas (`aria-hidden`); a sequência usa a única cor saturada permitida. Teste: contagem no texto; todas vazias dizem "Nenhum dia nos últimos 7" sem tom de cobrança.
- [x] **2.5 Casca.** `Shell.tsx`: no celular e no tablet, as 4 áreas em barra inferior fixa e o **+** flutuante (mesmo destino e atalho `E` de hoje); no desktop, mantém o cabeçalho. O rodapé legal (`RODAPE`) continua, recuado. Conferir antes as regras de `.topo`, `.areas`, `.rodape` e do modo foco (`:root[data-modo-foco]`, ~linha 815 do CSS) para a barra inferior sumir no modo foco como o cabeçalho some hoje.
- [~] **2.6 Estados (parcial: FaixaOffline reescrita; Falha mantida; os textos dos Vazio de cada tela vão junto com a fatia que revisa a tela).** `estados.tsx`: reescrever `Vazio` (convite: o que é este espaço + um verbo), `Falha` (o que houve e o que fazer; mantém "Nada foi perdido…") e `FaixaOffline` na nova voz (sem "—" decorativo, sem pedir desculpa). Atualizar os testes que dependem do texto.
- [x] **2.7 E2E.** Navegação por teclado e leitor de tela: barra inferior com `aria-label="Áreas"`, foco visível, ordem de tabulação; o atalho `E` continua; axe nos dois temas; os três aparelhos.
- **Pronto quando:** os quatro componentes têm testes verdes, a casca funciona nos 3 aparelhos e nenhum E2E existente quebrou.

## Fatia 3 — Recall (alavancas 1, 2, 4, 5)

Arquivos: `src/apresentacao/recall/RecallInicio.tsx`, `Drill.tsx`, `RegistrarErro.tsx`, `carregadores.ts`; `src/dominios/recall/servico.ts`; `src/core/modelo/sistema.ts` e `src/core/preferencias/`; `src/apresentacao/conta/AparenciaConta.tsx` (ou a seção de Conta mais adequada).

- [x] **3.1 Dias com revisão (teste primeiro).** `diasComRevisao(repo, hoje, janela = 7)` em `servico.ts`: lista de 7 booleanos pelas datas locais das `revisoes`. Ler o índice de `revisoes` em `src/core/modelo/index.ts` (~linha 96) para escolher a consulta; sem criar entidade *Dia*. Testes: nenhum, um e sete dias; revisões do mesmo dia contam uma vez; fuso (data civil local, como o agendamento).
- [x] **3.2 Cota (testes primeiro).** `cotaDiaria` opcional em `Preferencias` (`sistema.ts`), padrão 10, inteiro de 5 a 100; seguir o precedente da 9.8 (`destacarCondicionantesEPrazos`): o campo é opcional, o pacote v1 continua válido, **sem subida de esquema**. Testes em `preferencias.test.ts` e `pacote-v1.test.ts`: ausente = 10; fora da faixa é rejeitado; pacote antigo importa.
- [x] **3.3 Fila com cota.** `filaDoDia(repo, maximo)` já aceita limite; o `Drill` passa a pedir `cota` cartões e, ao terminar, mostra "Revisar mais N" (N = min(cota, restantes)). A fila e a ordem (do mais atrasado) não mudam; testar que nada é adiado ou descartado e que o "mais N" encadeia até zerar.
- [x] **3.4 Início do Recall.** Trocar o botão atual de `RecallInicio` por `AcaoAgora`: "Revisar N cartões" (N = min(cota, vencidos)), estimativa = N × 30 s arredondada para cima (constante nomeada e documentada, ajustável pelo uso real), botão **Começar**. Abaixo, "hoje: N de V" quando V > cota, e `LinhaDepois` ("Registrar erro" se há fila; "Revisar" se amanhã há cartões). Sem fila: `AcaoAgora` de "Registrar erro". O aviso de `LIMITE_FILA_DIARIA` passa a falar com o tom do retorno sem culpa e continua dispensável.
- [x] **3.5 Dias da semana e barra.** `DiasDaSemana` no início do Recall; `BarraFina` no `Drill` ("3 de 10"). Revisar os textos do `Drill` e do `RegistrarErro` para a nova voz, mantendo exatamente os 2 campos obrigatórios.
- [x] **3.6 Preferência na interface.** Campo "Cartões por vez" em Conta com o texto "Os outros esperam; nada é apagado." Teste de componente e de persistência.
- [~] **3.7 (E2E feito; falta medir a linha de base, adiada com a 1.1) E2E.** Da abertura ao primeiro cartão em **no máximo 2 toques** (asserção explícita); cota com fila de 25 (10 + "Revisar mais 10" + 5); retorno após dias sem abrir; axe; 3 aparelhos. Medir de novo a linha de base e anotar no PR.
- **Pronto quando:** as metas "2 toques" e "cota sem perda" passam em E2E e o `check` fica verde.

## Fatia 4 — Biblioteca e leitor (alavanca 6) — depois da 11.8 e da 11.9

Arquivos: `src/apresentacao/biblioteca/Leitor.tsx`, `Normas.tsx`, `FiltroDaNorma.tsx` e o CSS do modo foco.

- [x] **4.1 Ler a 11.8 e a 11.9 prontas** e listar o que já fazem (esmaecer fora do artigo, "lido até", remissões). Só implementar o que falta; registrar no PR o que foi reaproveitado.
- [x] **4.2 Literata na lei.** Confirmar que `--fonte-leitura` já aplica a Literata ao texto da norma e que a opção `sem_serifa` continua valendo; reconferir quebra de linha, `--largura-texto: 70ch` e tamanho no celular.
- [x] **4.3 Régua de leitura opcional.** Preferência `reguaDeLeitura` (opcional, padrão desligada): destaca a linha ou o bloco sob o dedo ou o cursor sem mover o texto. Testes de preferência como em 3.2; teste de componente do estado ligado/desligado; sem animação contínua (respeitar `prefers-reduced-motion`).
- [x] **4.4 (dispensada: a 11.8 tem o próprio "Próximo →" e, no texto corrido, o próximo já está logo abaixo) "Depois" no leitor.** `LinhaDepois` no fim do artigo com o próximo (artigo seguinte ou "fim da seção"); some no modo foco se a 11.8 já tiver sua própria navegação.
- [x] **4.5 Biblioteca.** Aplicar `AcaoAgora` à "Continuar leitura" (norma, ponto onde parou, tempo estimado a partir do tamanho da seção) e a nova voz às listas e estados vazios.
- [x] **4.6 E2E e axe** no leitor (LEP compilada) com os destaques da 9.8, grifos e estrela, nos dois temas e 3 aparelhos; conferir que a abertura medida do leitor (limiar de 1 s) não piora.
- **Pronto quando:** leitor e Biblioteca na identidade nova, sem regressão de desempenho nem de acessibilidade.

## Fatia 5 — Conta e acabamento

Arquivos: `src/apresentacao/conta/*`, `src/apresentacao/Aparencia.tsx`, `src/apresentacao/orientacoes/*`, `src/apresentacao/telas/Areas.tsx`.

- [ ] **5.1 Aparência.** Escolha de tema (igual ao aparelho, claro, escuro), fonte da leitura e tamanho na nova voz; prévia ao vivo curta.
- [ ] **5.2 Primeira experiência.** Com o banco vazio: Recall abre com `AcaoAgora` "Registre seu primeiro erro" (2 campos), depois "Seu primeiro cartão aparece amanhã"; Biblioteca com convite a importar a primeira norma. Texto curto, sem tutorial obrigatório.
- [ ] **5.3 Varredura de voz.** Passar por todos os textos fixos: frase curta, verbo no início dos botões, sem "por favor", sem "!" em texto do sistema, sem termos de concurso fixos no código (FCC e Defensoria só em dados). Atualizar testes dependentes de texto.
- [ ] **5.4 Documentos.** `CLAUDE.md` e `README.md` já atualizados em 09/10/2026 (direção de produto); resta `glossario.md` (`AcaoAgora`, `LinhaDepois`, `DiasDaSemana`, `BarraFina`, cota); `decisoes-tecnicas.md` (T19 se não foi na 1.8). Propor o texto ao Gabriel antes de gravar.
- [ ] **5.5 Roteiro da validação.** `docs/redesign/validacao.md`: as 4 perguntas da spec §7 mais "pagaria por isso?", instruções de uso de uma semana para 3–5 pessoas e como cada uma exporta o registro (Conta › Dados › Exportar) sem enviar dado pessoal; nada pergunta nem guarda diagnóstico.
- **Pronto quando:** nenhuma tela com a identidade antiga; documentos atualizados; roteiro de validação pronto para uso.

## Depois da fatia 5

Segue a F2 (etapa 10, 11.7, 13, portão) e a F3. Rodada de validação com 3 a 5 pessoas **só depois da F3** (Gabriel recruta); só então tratar de contas (F4), termos de uso, política de privacidade e cobrança. Nada disso é construído por este plano.

## Riscos

| Risco | Mitigação |
|---|---|
| Conflito de merge em `estilos.css` com a F2 | Fatias curtas, entre atividades da F2; rebase no `main` antes de abrir o PR |
| Cores novas quebram o contraste dos destaques, grifos e estrela | Tarefas 1.2 e 1.6 com script de contraste |
| Fontes aumentam o peso do app | Só subconjunto latino e poucos pesos; medir na 1.4 e registrar |
| Cota muda o hábito de revisão sem querer | Preferência opcional, "Revisar mais N", nada cortado (3.3) |
| Redesign atrasa a F2 e o uso das férias | Relatos de uso têm prioridade; fatia 4 espera a 11.8 e a 11.9 |
