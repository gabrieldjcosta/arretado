# Stitch — tela Hoje (celular), 16/10/2026

Projeto Stitch `9953616237194891956`, tela "Arretado - Hoje", 390 px. O Gabriel colou o HTML na sessão de 16/10/2026; o link exige login e não abre do ambiente do Claude. Conteúdo do mockup: lei pública (LEP art. 112) e dados inventados. Decisão: [`D-D5`](../../decisoes-design.md).

## Tokens do HTML
| Nome | Valor | Papel |
|---|---|---|
| creme | `#fff8ec` | fundo; pontinhos `#d6c9b3` de 0,75 px a cada 16 px |
| marinho | `#14213d` | texto, título, cartão Agora, barra de baixo (a 95%) |
| sol | `#ffb627` | botão primário (texto marinho), ícone do item atual |
| argila | `#c8763a` | etiqueta da matéria |
| verdeFoco | `#2fa36b` | cacto da marca, "+", ponto de Frases, ✓ de calma |
| azulCeu | `#3ba7f0` | ponto de Cartões, destaque no trecho da lei |
| fontes | Playfair Display 600/700 (títulos, marca, trecho da lei) · Plus Jakarta Sans 400–700 (interface) | via Google CDN |

## Estrutura (de cima para baixo)
1. Cabeçalho: "Arretado" (serifa 24 px, bold) + cacto verde · botão "Conta" (pílula, ícone de pessoa, 12 px).
2. Título "Hoje" (serifa 32 px) + data em minúsculas ("quarta-feira, 14 de outubro") · "+" verde redondo de 40 px (`aria-label` "Adicionar tarefa ou leitura").
3. Cartão Agora (raio 28, Marinho): etiqueta de matéria (Argila, caixa-alta, 10 px) + "NO SEU RITMO" (translúcida) · título serifado "Retome no art. 112, § 1º" · fonte "Lei de Execução Penal" com ícone de livro · caixa translúcida com o trecho da lei (serifa itálica 13,5 px; destaque com fundo azul) · botão Sol de largura total "Avançar um tiquinho →". Há espaço reservado acima do cartão (pt-11) para o mascote, que não está no HTML.
4. "Em seguida": linha do tempo vertical com 2 cartões brancos translúcidos (raio 16): ponto verde com aspas, "Revisar 6 frases · Direito Constitucional · 4 min"; ponto azul com cartões, "Revisar 4 cartões · Processo Penal · 3 min".
5. Calma: "✓ Seu ponto está salvo neste aparelho." (`role="status"`).
6. "Para lembrar" (campo centralizado em caixa-alta, placeholder a 40%) + "Salvar".
7. Barra de baixo: pílula flutuante Marinho (360 px, a 12 px da base) com Hoje · Trilha · Fixar · Biblioteca, ícone + rótulo (12 px); a atual com fundo branco a 15% e ícone Sol.

## Mapa para o Arretado
| Stitch | Hoje no app | Observação |
|---|---|---|
| Trilha | Plano (`/plano`) | só o rótulo |
| Fixar | Recall (`/recall`) | só o rótulo; abas Frases · Cartões · Histórico (D-D5) |
| Em seguida | Depois (`LinhaDepois`) | só o rótulo; até 2 itens |
| "Avançar um tiquinho" | botão do `AcaoAgora` | voz regional, `guia-de-voz.md` |
| "Para lembrar" + Salvar | novo | texto livre opcional em `Preferencias.lembrete` (sem migração); lembrete de coisas fora do app; a Frase correta entra pelo "+" |
| Conta (pílula) | "Conta" + "?" do cabeçalho | o "?" (Ajuda) vai para Conta › Orientações |

## Prompt-base para gerar as outras telas no Stitch
"Mesmo sistema visual da tela Hoje do projeto 9953616237194891956: fundo creme #fff8ec com pontinhos, texto marinho #14213d, botão primário sol #ffb627 com texto marinho (um por tela), etiqueta argila #c8763a, verde #2fa36b para Frases, azul #3ba7f0 para Cartões, títulos em serifa (Playfair Display), cartões brancos translúcidos de raio 16, bloco-herói marinho de raio 28, pílula flutuante com Hoje, Trilha, Fixar e Biblioteca, cabeçalho com Arretado e botão Conta. Texto mínimo de 13 px. Tela: <Trilha | Fixar | Biblioteca | Leitor | Conta | Sessão>."
