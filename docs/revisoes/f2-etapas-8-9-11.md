# `/code-review` das etapas 8, 9 e 11 da F2 (13/10/2026)

Escopo: `src/dominios/legislacao`, `src/dominios/acervo` (reancoragem, versões), `src/integracoes`, `worker/`, `src/apresentacao/biblioteca` (importar, revisão do rascunho, leitor, marcações, estrelas, remissões, modo foco, 11.7) e `src/core/util/reancoragem.ts`. Revisão em esforço alto (skill `code-review`), mais uma segunda passada à mão em sanitização, links, local-first, "lido até", posição e transações. Cada achado foi verificado com um caminho real antes de virar código; cada correção tem teste que falhava antes. **Sem subida de esquema.**

## Corrigidos (com teste que falhava antes)

| # | Onde | Defeito | Caminho real | Teste |
|---|---|---|---|---|
| 1 | `Colecoes.tsx` | `useDados` recebia função nova a cada render: laço de recarga do IndexedDB enquanto Súmulas/Teses ficava aberta | abrir Biblioteca › Súmulas | `Colecoes.test.tsx` |
| 2 | `Acervo.tsx` | com `?tudo`, o 1º clique numa caixa partia de conjunto vazio e jogava fora a pré-marcação | "Tudo do edital" → desmarcar uma → "Adicionar 1" adicionaria só a desmarcada | `Acervo.test.tsx` |
| 3 | `reancoragem.ts` (+ `correcao.ts`, `atualizacao.ts`) | texto inserido antes de um grifo curto o levava à outra ocorrência mais perto das posições antigas (grifo no lugar errado, em silêncio) | corrigir o começo de um artigo com grifo em "de"/"lei" repetido | `reancoragem.test.ts`, `correcao.test.ts` |
| 4 | `atualizacao.ts` (6a) | grifo já pendente (de versão mais antiga) nunca tentava de novo na atualização do acervo | correção deixa grifo pendente; acervo traz o texto de volta; grifo seguia em "Para reler" | `atualizacao.test.ts` |
| 5 | `edicao-integral.ts` | `comOrdinal` trocava "2 o" e "°" em qualquer lugar da linha: o corpo da lei mudava ao salvar | "I - nos casos do art. 2 o juiz" virava "2º juiz" | `edicao-integral.test.ts` |
| 6 | `correcao.ts` `textosAnteriores` | depois de desfazer, "Texto de antes" oferecia texto igual ao de agora | corrigir → desfazer → "Voltar a este texto" não fazia nada | `correcao.test.ts` |
| 7 | `CorrecaoDoTexto.tsx` | "Até <data>" mostrava quando o texto começou a valer, não quando foi trocado | lei importada em 01/09 e corrigida em 10/10 dizia "Até 01/09" | `correcao.test.ts` (`substituidoEm`) |
| 8 | `CorrecaoDoTexto.tsx` `AvisoDaCorrecao` | `sem_mudanca` dizia "Texto corrigido. O texto de antes ficou guardado." e oferecia desfazer | salvar a correção sem mudar nada | `CorrecaoDoTexto.test.tsx` |
| 9 | `RevisaoDoRascunho.tsx` | `gravarAgora` engolia a falha: "Fechar", "Juntar", conversões e "Salvar e confirmar" seguiam e descartavam o texto digitado | rótulo acima do limite (ou falha do IndexedDB) e clicar "Fechar" | `Importar.test.tsx` |
| 10 | `PendenciasDaNorma.tsx` | grifo/nota pendente não tinha ação: "Para reler" nunca saía da tela | correção que deixa um grifo sem trecho | `PendenciasDaNorma.test.tsx` (agora "Tirar" com confirmação; a nota aparece por extenso antes) |
| 11 | `correcao.ts` `textoLimpo` | texto corrigido não passava pela regra 1 (NFC, invisíveis): sumia da busca e das remissões | colar correção vinda de PDF/macOS (NFD) | `correcao.test.ts` |
| 12 | `correcao.ts` | "ficaram em Para reler" contava pendentes antigos de dispositivos que a correção não tocou | 3 grifos pendentes de antes + corrigir outro artigo | `correcao.test.ts` |
| 13 | `worker/regras.ts` (T17) | corpo de 3xx, de erro e de resposta grande demais não era cancelado (conexões presas no Worker) | cadeia de redirecionamentos do Planalto | `regras.test.ts` |
| 14 | vocabulário | `catch (erro)` e `{ tipo: 'falha'; erro }` para falha técnica (glossário: `excecao`) | `git grep -E "catch \(erro\)"` | conferência do glossário |

## Verificados e sem defeito
- **HTML sempre sanitizado:** colagem e URL passam pelo `sanitizador` (DOMPurify) e viram blocos; a interface nunca recebe HTML. Nenhum `dangerouslySetInnerHTML`/`innerHTML` no `src`.
- **Links:** só `http:`/`https:` na conversão (`resolverLink`) e no esquema (`z.url({ protocol: /^https?$/ })`), inclusive no acervo e na restauração do backup; `target="_blank"` sempre com `rel="noopener noreferrer"`.
- **Worker (T17):** hosts exatos (sem sufixo, subdomínio, credenciais, porta), só https, cada redirecionamento revalidado, limite de 5 saltos, 15 s e 6 MB (declarado e lido).
- **Local-first:** o único `fetch` do domínio é a fonte do acervo (só para adicionar/atualizar); ler, importar por colagem, corrigir e marcar não usam rede.
- **"Lido até" e posição:** gravação numa transação (duas abas não criam duas leituras); no artigo por artigo o "lido até" só avança; a posição não grava ao sair da norma com a lista já desmontada.
- **Descartar rascunho:** `exigirVersaoUnica` impede apagar norma com versão publicada; publicação e correção numa transação só.

## Descartados (sem caminho real ou custo maior que o ganho)
- **Âncora reancorada acima de 5.000 caracteres** (`reancoragem.ts`): exige grifo de quase 5.000 letras com espaços duplicados; sem caso real.
- **`PendenciasDaNorma` recarrega a cada evento** (`useDados` assina `*`): lê índices de uma norma (dezenas de registros) a cada pausa de rolagem; custo de milissegundos.
- **Duplicações** (`textoDosTrechos`, `todos`, `segmentoDe`, `trechosSimples` repetidos entre arquivos): qualidade, sem defeito; ficam para quando um deles mudar.
- **`status_erro` e `{ erro }` na resposta do Worker:** contrato da rota já publicado; renomear quebraria o cliente sem ganho.

## Grandes demais para esta sessão (em `planos/proximos-passos.md`)
- **Correção copia todos os textos da norma** (`corrigirTextoPublicado`): cada correção (e cada desfazer) grava a norma inteira de novo (CF: ~5 mil textos). Versões imutáveis por desenho; reduzir pede texto por dispositivo compartilhado entre versões (mexe no modelo, F4).
- **`acharNasColecoes` abre a árvore de cada coleção a cada busca:** trocar por consulta no índice `[normaId+endereco]`.
