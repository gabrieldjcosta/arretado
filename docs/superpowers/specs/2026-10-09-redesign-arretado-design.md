# Redesign do Arretado para quem tem dificuldade de concentração — spec de design

Data: 09/10/2026 · Origem: brainstorming com o Gabriel · Estado: aguardando revisão do Gabriel

## 1. Intenção

**Problema.** O Arretado tem boas funcionalidades, mas o visual não tem identidade, parece ferramenta técnica e não é intuitivo. O Gabriel (TDAH, banca FCC, Defensoria/SP) quer que o produto seja fácil, com poucas etapas e sem distração, com as funcionalidades integradas ao design de modo a ajudar a concentração e o estudo.

**Direção de produto.** Um produto só: o próprio Arretado, redesenhado para quem estuda para concurso e tem dificuldade de concentração. A intenção declarada é, no futuro, cobrar e crescer o produto. Isso muda a linha "plataforma pessoal" do `CLAUDE.md` e do `README.md`; nenhuma decisão D1–D24 é reaberta.

**Critério de sucesso.**
- Para o Gabriel: começar uma revisão em até 2 toques e 10 s; estudo mais constante; retorno mais leve depois de pausas; menos distração percebida.
- Para o produto: 3 a 5 outras pessoas com dificuldade de concentração usam o app por uma semana e o resultado sustenta (ou derruba) o plano de cobrar.

**Fora de escopo.** Contas, cobrança, vários concursos, tela Hoje, Dia e Sessão (F3), sincronização (F4). Nenhuma subida de esquema do banco.

## 2. Princípios do padrão

1. **Uma coisa em destaque** por tela; o resto fica recuado.
2. **Agora e depois:** o passo atual e uma linha discreta com o próximo.
3. **Poucas etapas:** fluxos diários em até 2 toques até começar; a captura de erro mantém exatamente 2 campos obrigatórios.
4. **Sem ruído:** nada pisca nem disputa atenção; filtros e ajustes recolhidos até serem pedidos.
5. **Recompensa discreta:** progresso e dias de estudo num lugar fixo e pequeno, sem confete nem cores gritantes.

## 3. Identidade visual

Foi revista contra o briefing para fugir do padrão comum (papel creme, título em serifa e acento quente).

**Cores** (contraste AA a conferir na implementação; se o marca-texto não passar como texto, usá-lo só como fundo ou traço):

| Nome | Claro | Escuro |
|---|---|---|
| Papel | `#F1F3EE` | `#151A1F` |
| Tinta | `#1F2A24` | `#E8ECEA` |
| Sálvia (ação) | `#4F7A64` | `#8FBF9F` |
| Recuado ("depois") | `#6B776F` | `#8A958F` |
| Marca-texto (só "agora") | `#E9B949` | `#F0C75E` |

O **marca-texto é o único acento** e marca apenas o que é *agora*. Essa é a coisa memorável do visual. A cor saturada do mockup C aparece só na sequência de dias e na conclusão.

**Tipografia.** Interface em **Atkinson Hyperlegible Next**; texto da lei e títulos de norma em **Literata**. Ambas livres (OFL) e **embutidas no pacote do app**, sem CDN em tempo de execução, por causa do local-first e da CSP. Alinhamento à esquerda, uma coluna, linhas abaixo de 70 caracteres. Sem rótulos em caixa-alta, sem "A · B · C", sem saudação decorativa.

**Temas.** Claro (Papel) e escuro (grafite-noite); o escuro é também o visual do modo foco. Segue o sistema do aparelho, com escolha manual em Conta › Aparência, como hoje. Implementação: troca de valores dos tokens existentes em `src/apresentacao/estilos.css` (cerca de 81 variáveis; temas `claro`, `escuro` e `data-fonte`), mais poucos tokens novos (ênfase, "depois", progresso). CSS puro, sem dependência nova (T-decisões).

## 4. Componentes

Hoje `componentes/` tem só `Dialogo`, `estados` e `teclado`. Novos, em CSS puro:

| Componente | Função | Onde |
|---|---|---|
| `AcaoAgora` | Cartão com a ação principal: título, tempo estimado, botão **Começar**, traço de marca-texto | Início do Recall; depois, Hoje (F3) |
| `LinhaDepois` | Linha recuada com o próximo passo | Abaixo do `AcaoAgora`, fim do drill, leitor |
| `DiasDaSemana` | "4 de 7 dias nesta semana" com 7 marcas; não zera | Início do Recall |
| `BarraFina` | Progresso discreto | Drill, leitor |
| `Rodape` e `BotaoCaptura` | Os atuais, repintados; o **+** sempre no mesmo lugar | Todas as telas |
| Estados vazios e de erro | `estados.tsx` reescrito: diz o que houve e o que fazer, sem pedir desculpa; serve também como primeira experiência de quem chega | Todas as telas |

`Dialogo`, campos e listas só recebem os tokens novos.

## 5. Alavancas de concentração

**Entram agora** (usam telas e dados existentes):
- **Começar em 1 toque:** o início do Recall mostra a revisão do dia escolhida, com tempo estimado e **Começar**.
- **Agora e depois:** no Recall, "Depois:" aponta a próxima ação; no leitor, o próximo trecho.
- **Retorno sem culpa:** a fila vencida aparece como cota ("hoje: 10 de 63"); o resto espera.
- **Sequência que perdoa:** `DiasDaSemana`.
- **Leitura que segura o olho:** no modo foco, esmaecer o que está fora do trecho atual, régua de leitura opcional e Literata no texto da lei.

**Ficam para a F3** (dependem de Dia e Sessão): estacionamento de distração, fechar o dia, temporizador que não ansia. O visual e o padrão já saem desenhados.

**Premissas assumidas (o Gabriel pode mudar):**
- A cota é uma **preferência opcional** em Conta, padrão 10 cartões, que não muda a ordem nem apaga nada da fila. Se a revisão já tiver limite diário, reaproveita-se. Verificar na fatia 3.
- "Dia com revisão" é calculado do registro de revisões existente, sem criar a entidade *Dia* antes da F3.

## 6. Fatias de entrega

Um PR por fatia, a partir do `main`, com `npm run check` verde e E2E nos 3 aparelhos. Nenhuma sobe o esquema, então nenhuma pede backup.

1. **Fundação:** tokens, temas, fontes embutidas, axe nos dois temas, linha de base das métricas do Gabriel.
2. **Componentes e casca:** `AcaoAgora`, `LinhaDepois`, `BarraFina`, rodapé e **+**.
3. **Recall:** início, captura de erro e drill (começar em 1 toque, agora/depois, cota, dias da semana).
4. **Biblioteca e leitor:** leitura que segura o olho e revisão do modo foco.
5. **Conta e acabamento:** Aparência, estados vazios e de erro na nova voz, entrada para quem chega.

**Risco:** o `estilos.css` também é editado pela F2. Começar pela fatia 1 entre duas atividades da F2, não no meio de uma. A F2 e o uso das férias do Gabriel têm prioridade; relatos de problema têm prioridade sobre o redesign.

## 7. Testes e medição

**Técnico, por fatia:** `npm run check` e E2E nos 3 aparelhos; axe nos dois temas com conferência AA das cores; `prefers-reduced-motion` respeitado; foco de teclado visível; largura de linha e tamanho de fonte do leitor conferidos no celular; capturas de tela antes e depois (revisão humana, não teste automático); `glossario.md` e `solucao-de-problemas.md` atualizados.

**Eficácia, no uso real do Gabriel.** Sem telemetria externa (local-first, LGPD); tudo vem do registro de revisões do aparelho.

| Pergunta | Medida | Meta inicial |
|---|---|---|
| Ficou mais fácil começar? | Tempo da abertura à primeira revisão; toques | até 2 toques e menos de 10 s |
| Estudo mais constante? | Dias com revisão por semana, antes e depois | acima da média atual |
| Retorno mais leve? | Retoma em até 1 dia após ausência de 3 dias ou mais | a registrar na 1ª semana |
| Menos distração? | Nota de 1 a 5 ao fim da semana ("consegui ficar no que estava fazendo?") | subir em relação à semana anterior |

As metas são ponto de partida; são fixadas de verdade depois da linha de base (fatia 1).

**Validação com outras pessoas.** Depois da fatia 5: 3 a 5 pessoas com dificuldade de concentração que estudam para concurso usam o app por uma semana e respondem às mesmas perguntas, mais "pagaria por isso?". Pode repetir-se após a F3.

## 8. Preparar o crescimento sem construí-lo

- **Identidade num lugar só:** cores, fontes e o nome provisório em tokens e constantes.
- **Nada específico de concurso nos textos fixos das telas:** "FCC" e "Defensoria" vivem nos dados.
- **Não construir agora:** login e sincronização (F4), cobrança (só após a validação), vários concursos (F7 ou antes, se houver demanda).
- **Cuidados antes de cobrar:**
  - TDAH é dado de saúde (sensível na LGPD): o app nunca pergunta nem guarda diagnóstico.
  - Sem promessa clínica na comunicação.
  - Termos de uso e política de privacidade são pré-requisito; material de terceiros (editais, questões, resumos) é verificado caso a caso.

**Ordem:** redesign (fatias 1–5) → validação com 3 a 5 pessoas → F3 (com as alavancas adiadas) → F4 → decisão de monetização.

## 9. Mudanças em documentos existentes (propostas)

- `CLAUDE.md` e `README.md`: trocar "plataforma pessoal" por uma descrição que inclua a direção de produto, sem alterar D1–D24.
- `docs/glossario.md`: termos novos (`AcaoAgora`, `LinhaDepois`, `DiasDaSemana`, cota).
- `docs/decisoes-tecnicas.md`: registrar as fontes embutidas (Atkinson Hyperlegible Next e Literata) como nova escolha técnica relevante, decidida com o Gabriel.

## 10. Questões em aberto

- Valores finais de contraste AA do marca-texto e da sálvia (medidos na fatia 1).
- Cota: preferência opcional ou regra? (padrão assumido: preferência opcional de 10 cartões.)
- Quando fazer a rodada de validação: logo após a fatia 5 ou só depois da F3.
