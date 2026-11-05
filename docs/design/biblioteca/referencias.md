# Referências (gerado de dados.json; não editar à mão)

Atualizado em 2026-11-05. Referência é fonte de ideia, não de código. O mockup aprovado do Fio manda na aparência; a biblioteca só entra onde dá comportamento ou acabamento. Todo PR de UI cita o que usou daqui.

| Referência | Tipo | Licença | Custo | Na nuvem | Veredito | Pegar | Não pegar | Estado no Arretado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Base UI](https://base-ui.com/) | componentes | MIT (Copyright MUI/Material-UI SAS) | grátis | abre (HTTP 200, 05/11) | avaliar | Comportamento e acessibilidade de menu, select, diálogo e popover sem estilo, para vestir com o CSS do Fio. | Estilos padrão; segunda biblioteca de primitivos ao lado de outra (escolher uma). | Hoje usamos <dialog>/popover nativo. Só entra onde o nativo falhar (Select com busca, Combobox, Toast com fila). |
| [Uiverse](https://uiverse.io/) | detalhes de UI | MIT (código de cada autor) | grátis | 403 mesmo liberado (proteção anti-robô; não contornar) | usar | CSS de botão, interruptor, loader e acabamento; reescrever em tokens do app. | Tailwind do código de origem; animação perpétua em área de estudo. | Lua do bad-parrot no seletor dia/noite (#424). Seis links esperam o código colado. |
| [Motion](https://motion.dev/) | animação | MIT (Copyright Motion B.V.; Motion+ é pago, não usar) | grátis | abre (HTTP 200, 05/11) | usar | LazyMotion + m: sheet arrastável, layout animado, saída de elemento desmontado, useReducedMotion. | Motion+ e exemplos premium; Motion e Auto-Animate no mesmo elemento. | Regra de uso em movimento-e-bibliotecas.md. |
| [AutoAnimate](https://auto-animate.formkit.com/) | animação | MIT | grátis | abre (HTTP 200, 05/11) | avaliar | Lista que entra, sai ou reordena (Varal, Caderno) onde o mockup não define coreografia. | Uso junto com Motion no mesmo nó. | Nenhum uso ainda. |
| [React Bits](https://github.com/DavidHDev/react-bits) | efeitos | MIT + Commons Clause (Copyright David Haz; não revender nem redistribuir os componentes) | grátis | abre (HTTP 200, 05/11) | referência | Poucos detalhes de marca; variante CSS, sem Tailwind. | Fundos animados em leitura; republicar os componentes. | Nenhum uso ainda. |
| [Lucide](https://lucide.dev/) | ícones | ISC (Copyright Lucide Icons and Contributors) + MIT nos herdados do Feather; manter avisos | grátis | abre (HTTP 200, 05/11) | avaliar | Ícones de traço consistentes. | Misturar com outra família; trocar os ícones de traço único e néon do Zé/caneta. | O app tem ícones próprios (IconesM.tsx). Lucide só para o que faltar. |
| [Realtime Colors](https://www.realtimecolors.com/) | cor | uso livre, inclusive comercial | grátis | abre (HTTP 200, 05/11) | referência | Prévia de paleta e fonte sobre página de exemplo. | Trocar a paleta aprovada (sertão em neon). | Só para experimento; contraste final vai em scripts/contraste.test.ts. |
| [Playwright (capturas)](https://playwright.dev/docs/test-snapshots) | verificação | Apache-2.0 | grátis | instalado | usar | Comparativo mockup × app; foto de cada tela. | Aceitar baseline sem aval da Marca. | Em uso (e2e/, folhas lado a lado). |
| [Godly](https://godly.design/) | galeria | sem licença de reuso dos ativos | grátis | abre (HTTP 200, 05/11) | referência | Direção de arte, tipografia, acabamento. | Copiar ativos; imitar site de marketing no leitor. | Galeria de humor para a Marca. |
| [Land-book](https://land-book.com/) | galeria | sem licença de reuso | grátis limitado (3 pranchas) | 403 mesmo liberado (anti-robô; não contornar). Navegar no PC. | referência | Seções de página (landing futura). | Layouts de app. | Para a página pública, não para o app. |
| [Mobbin](https://mobbin.com/) | telas de produtos reais | sem licença de reuso; referência | Pro ≈ US$10/mês (conector exige Pro) | abre a página pública (HTTP 200); conteúdo completo exige login Pro, sem assinatura | 1 mês de teste, só com aval | Onboarding, estado vazio, retomada, revisão em apps de estudo e hábito. | Copiar telas; qualquer gasto sem aval do Gabriel. | Conector desconectado; ver guia, seção 13. |
| [Laws of UX](https://lawsofux.com/) | princípios | leitura livre | grátis | abre (HTTP 200, 05/11) | usar | Vocabulário para justificar decisão (carga cognitiva, escolha, agrupamento). | Tratar como teste com usuário. | Citar a lei no desvio ou no PR. |
| [Checklist Design](https://www.checklist.design/) | checklist | leitura livre; revisão por IA não verificada | grátis (leitura) | abre (HTTP 200, 05/11) | usar | Lista de conferência de tela, estado e fluxo. | Assumir que o serviço de IA é grátis. | Conferir ao fechar cada tela. |
| [Penpot](https://penpot.app/) | design | MPL-2.0 | grátis (nuvem e auto-hospedado) | abre (HTTP 200, 05/11) | adiar | Nada agora: o fluxo é mockup em HTML aprovado e porte literal. | Segunda fonte de verdade ao lado do mockup. | Só se o Gabriel quiser desenhar fora do HTML. |
| [Figma Starter](https://www.figma.com/) | design | serviço | grátis limitado (3 arquivos) | conector desconectado | adiar | Nada agora. | Upgrade automático. | Mesmo critério do Penpot. |
| [Material 3 (layout adaptativo)](https://m3.material.io/foundations/layout/applying-layout/window-size-classes) | princípios | documentação; só princípios | grátis | abre (HTTP 200, 05/11) | usar (princípios) | Classes de largura e painel de apoio para o desktop em duas colunas. | Componentes, cores e formas do M3. | Desktop em duas colunas: sim, depois do celular (Gabriel, 05/11). |
| [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | DESIGN.md de sites reais | ver o repositório | grátis | raw.githubusercontent.com acessível | referência | Formato de seções; contraponto calmo (Notion, Runway). | Paleta de terceiros. | Avaliação em /mnt/project-files/design/avaliacao-referencias-design-systems.md. |
| [unDraw](https://undraw.co/) | ilustração | uso livre sem atribuição; proíbe raspagem e pacote concorrente | grátis | bloqueado | evitar | Nada: o Zé e o cacto são a ilustração do produto. | Raspar com agente. | Só se faltar estado vazio e o Zé não couber. |

## Casos de uso

| Caso | Onde | Mockup | Referências | Estado |
| --- | --- | --- | --- | --- |
| Agora (tela inicial do Fio) | `src/apresentacao/fio/m/AgoraM.tsx` | data-tela=inicio | Laws of UX, Motion | no app |
| Destino (mapa do Nordeste) | `src/apresentacao/fio/m/` | data-tela=mapa | awesome-design-md | no app (#419) |
| Varal e Caderno de Frases | `src/apresentacao/fio/m/` | data-tela=varal | AutoAnimate, Motion | no app (#420, #423) |
| Cartão que vira / lembrar | `LembrarM.tsx, CartaoM.tsx` | data-tela=lembrar | Motion, Uiverse | no app |
| Porteira (deque misturado) | `DequeM.tsx` | folha porteira | Laws of UX | folha-porteira aguarda cartão do Gabriel |
| Guardar um erro / Ache o erro | `m/AcheOErroM.tsx` | folha erro | Checklist Design | no app (#426, #428) |
| Conta em folha | `src/apresentacao/fio/m/` | folha conta | Base UI | no app (#427, #430) |
| Seletor dia/noite (lua e sol) | `Conta › Aparência` | prancha uiverse v4 | Uiverse | PR #424 em rascunho |
| Abertura com cacto e prova | `thread C1` | data-tela=abertura, prova | Motion, Uiverse | em outra thread |
| Aviso curto (Desfazer, Salvo) | `m/ToastM.tsx` | toast do mockup | Uiverse | no app; Sonner só se precisar de fila |
| Fecho do Dia / conquista | `PousoM.tsx` | data-tela=pouso | Motion, Laws of UX | no app; confete só no modo Vivo, sem perda de sequência |
| Estado vazio e retomada | `várias telas` | sem | Mobbin, Checklist Design | a pesquisar (Mobbin ou Kombai) |
| Desktop em duas colunas | `Fio, a partir de ~840 px` | sem | Material 3 (layout adaptativo) | depois do celular (Gabriel, 05/11) |
| Leitor de norma | `src/apresentacao/leitor` | sem | Laws of UX, Checklist Design | no app |
