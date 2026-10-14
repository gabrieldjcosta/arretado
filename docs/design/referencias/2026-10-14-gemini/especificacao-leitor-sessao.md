# Especificação do Leitor e da Sessão (Gabriel, 14/10/2026, 11:28 UTC)

Texto como o Gabriel mandou, sem edição (só os `>`/`<` do envio viraram `>`/`<`). Acompanha as imagens
[`sessao-estudo-e-fechar.jpg`](sessao-estudo-e-fechar.jpg) e [`leitor-acoes-paisagem.jpg`](leitor-acoes-paisagem.jpg).
Como cada parte entra no app: [`leia-me.md`](leia-me.md) e a decisão D-D4 em
[`../../decisoes-design.md`](../../decisoes-design.md).

> Faça o mesmo com os seguintes:

# Especificação estruturada para src/apresentacao/biblioteca/leitor e src/apresentacao/sessao

```yaml
leitor_de_normas:
  header_controls:
    layout: "flex, align-items: center, justify-content: space-between, gap: 8px"
    font_stepper: "Segmented pill (height: 38px, border-radius: 9999px, border: 1px solid rgba(59,63,33,0.18)) contendo [A-] (44x38px), label '18px', [A+] (44x38px)"
    destaques_toggle: "Pill button (height: 38px, bg active: #3B3F21, text: #F6F1E6) com ícone de check"
    semantic_legend_bar:
      behavior: "Barra horizontal colapsável de 1 linha abaixo dos controles quando Destaques = true"
      tokens:
        prazos_e_tempo: "text-decoration: underline double #173F52; text-underline-offset: 4px"
        excecoes_e_condicoes: "text-decoration: underline dashed #CF893A; text-underline-offset: 4px"
        termos_absolutos: "text-decoration: underline wavy #963417; text-underline-offset: 3px"
        penas_quoruns_fracoes: "text-decoration: underline dotted #963417; text-underline-offset: 4px"

  regua_de_leitura:
    container: "background: rgba(234, 210, 176, 0.45); border-left: 4px solid #3B3F21; border-radius: 0 12px 12px 0; padding: 12px 14px; position: relative"
    inline_actions: "Canto superior direito do bloco focado exibe botão [☆] (44x44px hit area) e chip [Ações] (height: 32px, border-radius: 8px, bg: #FAF6EE)"

  floating_reader_dock_portrait:
    position: "fixed, bottom: 76px (acima da Bottom Nav), left: 16px, right: 16px, z-index: 30"
    layout: "display: flex; gap: 10px; align-items: center"
    left_pill_group: "flex: 1; height: 52px; border-radius: 9999px; background: rgba(250, 246, 238, 0.92); backdrop-filter: blur(12px); box-shadow: 0 4px 16px rgba(22,19,15,0.12); display: grid; grid-template-columns: repeat(3, 1fr) -> [Buscar, Filtrar, Foco]"
    right_bookmark_cta: "min-width: 112px; height: 52px; border-radius: 14px; background: #3B3F21; color: #F6F1E6; font-weight: 600; label: '📍 Lido até aqui'"
    scroll_clearance: "O container <article> da lei DEVE ter padding-bottom: 156px para nunca ter texto coberto pela dock."

  modo_foco_responsive:
    portrait_layout: "flex-direction: column; justify-content: center; padding: 16px; gap: 12px"
    landscape_layout: "@media (orientation: landscape) and (max-height: 560px), (min-width: 768px) -> display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 16px; height: 100dvh; overflow: hidden"
    neighbor_peek: "max-height: 2.8em (2 linhas em portrait, 1 linha em landscape); overflow: hidden; opacity: 0.42; mask-image: linear-gradient(to bottom, transparent, black)"
    right_control_panel_landscape:
      pagination_bar: "display: flex; align-items: center; justify-content: space-between; height: 44px; background: #EAE2D3; border-radius: 10px"
      action_grid_2x2: "display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; buttons com min-height: 54px, border-radius: 12px, bg: #EAD2B0"
      exit_button: "width: 100%; min-height: 44px; border-radius: 12px; background: #3B3F21; color: #F6F1E6; label: 'Sair do foco'"

  modal_acoes_dispositivo:
    type: "Bottom Sheet (mobile) / Centered Dialog (desktop, max-width: 420px)"
    quick_tiles_row: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px -> [Estrelar, Copiar ref., Corrigir texto] (bg: #EAD2B0, border-radius: 12px, height: 64px, ícone + label 12px)"
    primary_cta: "Botão Primário Terracota (#963417, height: 48px, border-radius: 12px, width: 100%) -> 'Registrar erro neste artigo →'"
    secondary_row: "Action Row (#FAF6EE, border: 1px solid rgba(59,63,33,0.16), height: 48px, border-radius: 12px) -> 'Criar cartão deste trecho >'"

sessao_de_estudo:
  header:
    modo_so_estudo_switch: "Switch pill em #628981 (Acqua); quando ativo, oculta a barra de navegação global e avisos de rodapé"
    timer_chips: "Row de chips [15m, 25m, 45m, 60m] (height: 34px, active bg: #3B3F21, inactive bg: #EAD2B0) + texto auxiliar 'X min passados (só informa)'"
  card_tarefa_ativa:
    background: "#3B3F21 (Caatinga)"
    mascote: "Pose 'Estudando!' (livro verde + lâmpada) alinhada à esquerda (96px)"
    actions: "Botão primário Solace (#CF893A, color: #231F1A) 'Voltar à leitura →' + botão ghost 'Pausar'"
  card_estacionamento_distracao:
    background: "#EAD2B0 (Areia)"
    mascote: "Pose 'Distraído...' (queixo na pata + lápis + símbolos '? ♪ ♫') no cabeçalho"
    input_group: "Input 'Ex: responder mensagem, pagar conta...' (bg: #FAF6EE, border-radius: 10px) + botão compacto 'Estacionar' (height: 40px, border-radius: 10px, bg: #EAD2B0, border: 1px solid #3B3F21)"
  modal_fechar_sessao:
    mascote: "Pose 'Sorrindo!' centralizada entre a dupla de cactos"
    summary_badge: "Pill em #628981 (Acqua) com tempo e dispositivos lidos"
    distraction_resolution_list: "Checkboxes customizados (22x22px, border: 2px solid #2B1B12, border-radius: 6px) para resolver ou descartar os itens estacionados antes de clicar em 'Guardar e fechar sessão →' (#963417)"
```
