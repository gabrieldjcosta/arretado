# Bibliotecas e referências por tipo de elemento

Regra do Gabriel (04/11/2026): ao imaginar e implementar elementos (botões, sobreposições, menus, animações, organização da tela), **usar de fato** as bibliotecas e referências da pesquisa, para um resultado melhor. O mockup aprovado continua mandando na aparência; a biblioteca entra onde dá o comportamento ou o acabamento que o mockup pede, e **todo PR de UI cita qual foi usada** (ou diz "nenhuma, porque ...").

Tamanho de partida (`npm run tamanho`): JS 523 kB gzip no total, 334 kB no início. O teto cede à cara nova; todo PR informa o tamanho. Importar sempre pela porta lazy (`LazyMotion`, `import()`), nunca no início sem medir.

| Tipo de elemento | Usar | Custo | Notas |
| --- | --- | --- | --- |
| Troca de tela, abertura e fechamento de folha | **View Transitions API** (nativa), com CSS/WAAPI de reserva | 0 kB | Reproduzir o `ir()` do mockup (saída 260 ms, entrada 480 ms). Sem suporte, cai no CSS. |
| Botão, hover, press, onda ao toque | **CSS puro**; referência de acabamento: uiverse.io, animations.dev (Emil Kowalski) | 0 kB | Copiar só CSS; ignorar Tailwind do código de origem. Sempre `:hover`, `:active`, `:focus-visible`. |
| Gesto, arrasto, mola, layout animado, saída de elemento desmontado | **Motion** (`LazyMotion` + `m`, `useReducedMotion`) | ~5 kB inicial, ~15 kB lazy | Entra primeiro no que a WAAPI à mão não faz bem: sheet arrastável, reordenação, saída. |
| Lista que reordena, entra ou sai (Varal, Caderno) | **Auto-Animate** ou Motion `layout` | ~6 kB | Só onde o mockup não define coreografia própria. |
| Sequência longa ou cena com timeline (pouso, abertura) | WAAPI como o mockup; **GSAP** só se a timeline passar de ~10 passos | ~23 kB | Evitar duas libs de timeline. |
| Mascote ou personagem que reage a estado (Zé) | SVG animado; **Rive** se o SVG não bastar | ~150 kB runtime, .riv 10 a 50 kB | Medir antes; carregar só na Chegada. |
| Conquista, desbloqueio de etapa, fecho do Dia | **canvas-confetti** (lazy, só no evento), curva do mockup | ~6 kB | Calmo: sem confete, fade. Copy sem dívida nem urgência. |
| Aviso curto ("Desfazer", "Salvo") | **Sonner** ou o toast do mockup | ~5 kB | O mockup já tem toast próprio; usar Sonner se a fila e o empilhar forem necessários. |
| Menu, folha, sobreposição | CSS + `<dialog>`/popover nativo; referência: Aceternity UI e Magic UI | 0 kB | Só referência visual: o código deles pede Tailwind e Motion; reescrever em CSS do projeto. |
| Trilha, progresso, estrelas, streak | CSS/SVG do mockup; referência: Magic UI, Aceternity | 0 kB | Nunca perda de sequência (ver Don'ts do DESIGN.md). |

## Movimento reduzido

Reduz, não zera: fade curto no lugar de deslize e mola, feedback de estado mantido, confete vira fade, Rive vira quadro parado, View Transition vira cross-fade. `useReducedMotion` do Motion e `data-movimento`/`data-perfil='calmo'` do app decidem o modo.
