# Ordem ao coordenador — Resumos e Precedentes na Biblioteca

Data: 14/10/2026 · Autor da ordem: Gabriel · Destino: coordenador do projeto
Status: **aprovada pelo Gabriel em 14/10/2026**; vira o pacote **F3-C** (ver `f3-pacotes.md`). Antecipa conteúdo previsto para depois da V1.

## Objetivo
Trazer para **antes da V1 (teste com 3 a 5 pessoas)** duas capacidades da Biblioteca, sem IA, sem rede e sem conta:

1. **Resumo manual** (Nota do tipo resumo, D22).
2. **Precedente** (decisão judicial) com **trecho-chave** (tese, ementa, ratio) **vinculado a dispositivos da lei**, tratado como **ativo da Biblioteca** (asset).

Resumo gerado por IA **fica fora** (A2, depois da F4; R4 e R6 mantidos).

## Exemplo-guia (critério de aceite central)
Cadastrar a ADPF 347 (ex.: "estado de coisas inconstitucional"). O usuário:
- vê o precedente **só pela tese** (2 a 4 linhas), sem abrir o acórdão;
- toca na tese e **abre o trecho do texto que a resume** (ementa ou voto, com o intervalo destacado);
- vê, na lei (ex.: art. 5º, XLIX da CF), o aviso "1 precedente" e abre a tese a partir dali;
- seleciona a tese ou o trecho e usa **"Enviar às frases"** (a frase guarda o link de volta).

## Escopo

### Atividade A — Resumo manual (esquema sem mudança, se possível)
- Criar/editar Nota tipo `resumo`: título, corpo, disciplina e ponto (opcionais). Obrigatório: só o corpo.
- Leitura na Biblioteca com grifo, anotação e "Enviar às frases", reaproveitando o leitor e as Marcações da F2.
- Corpo colado ou digitado passa pelo sanitizador (regra: nunca renderizar HTML colado sem sanitizar).
- Vínculos opcionais com Ponto e com Dispositivo (reaproveita o mecanismo da Atividade B quando existir).
- Modelo sugerido: Sonnet 5.5 médio. Nuvem, sem rede.

### Atividade B — Precedente com trecho-chave e vínculo a dispositivo (**esquema v8**; o v7 já está na `integracao` desde a P0)
- Entidade `Precedente`: tribunal, tipo (ADPF, ADI, RE, REsp, Tema, HC etc.), número, relator (opcional), data (opcional), fonte/URL (opcional).
- **Corpo do precedente** (ementa ou texto colado, sanitizado) com **Trecho-chave** = intervalo marcado no corpo (início, fim, rótulo: `tese`, `ementa`, `ratio`, `dispositivo-da-decisão`). Um precedente pode ter vários trechos-chave. A tese é o trecho exibido por padrão (visão "só a tese").
- **Vínculo Precedente↔Dispositivo**: por trecho-chave, N dispositivos (norma + endereço canônico, ex.: `cf88` / `art5.incXLIX`). Digitar "art. 5º, XLIX, CF" e escolher o dispositivo sugerido (busca por norma + endereço, Parte 2, item 6).
- **No leitor da lei**: contador "N precedentes" no dispositivo; toque abre a lista de teses; toque na tese abre o precedente já rolado ao trecho que a resume.
- **Reancoragem**: o vínculo e o trecho sobrevivem à atualização da norma e à correção do texto: exata → aproximada → pendente em "Para reler" (mesma regra das Marcações, 11.7/6a).
- **Biblioteca**: nova entrada "Precedentes" (lista com a tese como linha de resumo; busca por número, tribunal e texto).
- Formulário mínimo: obrigatórios só **tribunal + número + um trecho-chave**. O resto é opcional (D25).
- Vocabulário: "Precedente", "Trecho-chave", "Tese" (já existe "Tese" do acervo; ver decisão abaixo).

## Decisões que o coordenador precisa tomar antes de abrir a atividade
1. **Tese do acervo × Trecho-chave `tese` do Precedente.** Hoje "Tese" é dispositivo de uma `Norma` com `especie: 'teses'` (peça 5 do acervo). Recomendo **não fundir**: o Precedente aponta para a tese do acervo quando existir (campo opcional `teseDoAcervo`), e o trecho-chave cobre o que não está no acervo. Registrar no glossário.
2. **Ordem no plano**: recomendo A (resumo) logo após o portão da F2 e antes da F3; B (precedente) em seguida, também antes da F3-A, porque a V1 só vem depois da F3. Se a F3 não puder esperar, B vai para depois da V1 e A fica sozinha.
3. **Esquema v8**: B sobe o esquema (v7 → v8) (nova tabela, índices por dispositivo). Exige desenho com modelo acima do Sonnet 5.5 médio (Opus 5.5), migração testada, **backup do Gabriel antes do merge** e revisão independente em outra sessão (risco alto: migração e reancoragem).
4. **Tamanho do corpo**: limite de caracteres do corpo do precedente e do resumo (definir na atividade; backup e sanitização devem comportar).

## Regras que continuam valendo
- Local-first, sem rede. Sanitizar todo HTML colado.
- Nada obrigatório além do mínimo. Diagnóstico nunca perguntado.
- Não importar nada do Acervo antigo nem do Acumen v2 (conteúdo recomeça do zero).
- Registrar termos novos em `docs/glossario.md`, decisão técnica nova em `docs/decisoes-tecnicas.md` (próximo T), problemas em `docs/solucao-de-problemas.md`.
- Segurança/LGPD da entrega (Parte 1 §15): payload malicioso no corpo colado, backup/restauração com precedentes, exclusão.

## Critérios de pronto
- `npm run check` verde; E2E verde nos 3 aparelhos nas telas novas (cadastro, lista, leitura da tese, abrir trecho, contador no leitor da lei).
- Teste: exemplo-guia (ADPF) de ponta a ponta, incluindo reancoragem após correção do texto da norma.
- Backup: exportar → apagar → restaurar idêntico com precedentes e vínculos.
- Migração v7→v8 testada com dados representativos; reancoragem exata/aproximada/pendente coberta.
- Axe nos dois temas; alvos de toque ≥ 44 px.
- `docs/proxima-sessao.md` atualizado; portão correspondente em `docs/portoes/`.

## Fora do escopo
- Resumo ou tese gerados por IA, OCR, busca semântica, sincronização, importação automática de jurisprudência de sites de tribunais.
- Banco de questões (D22).

## Acréscimos aprovados (14/10/2026)

### Vínculo entre precedentes (esquema v8)
- Entidade própria `VinculoDePrecedente` (de, para, tipo): navegável nos dois sentidos e linha própria no backup. Tipos (revisão de design: só três): `relacionado` (padrão), `cita`, `supera`. Só o destino é obrigatório. Tribunal e número do precedente são opcionais (só o texto é obrigatório, D25).
- Origem e destino podem ser Precedente do usuário **ou** súmula/tese do acervo (sem fundir tese do acervo com trecho-chave).
- Âncora opcional ao trecho-chave dos dois lados; o v8 já traz os campos para não exigir v9.
- Na tela do precedente: bloco discreto "Relacionados" por tipo; "superado por" com aviso visível, como o aviso de vigência das normas.
- Duas âncoras distintas, testadas separadamente: vínculo → dispositivo segue a **versão da norma**; trecho-chave segue a **correção do texto do precedente**.

### Selecionar trecho → frase de revisão
- Qualquer seleção no corpo do precedente (ou do resumo), não só o trecho-chave, tem "Enviar às frases": abre a captura com o trecho como frase correta; a frase guarda o link de volta (precedente + intervalo), com a regra exata → aproximada → "Para reler".
- Critério de pronto: selecionar → frase → revisar → voltar ao trecho, inclusive depois de corrigir o texto.

### Aproveitar o que já está na plataforma, e adicionar novos
- Súmulas (STF, SV, STJ, TJSP, TNU) e teses da DPE-SP do acervo contam como precedentes da Biblioteca: aparecem na lista e na busca de Precedentes, aceitam trecho-chave, vínculo a dispositivo, vínculo a outros precedentes e "Enviar às frases". Sem copiar o texto: o precedente pessoal aponta para o item do acervo.
- O usuário também cadastra os seus (formulário mínimo: tribunal + número + um trecho-chave).

### Favoritos e organização, sempre discretos
- Reaproveitar a Estrela existente (estrela discreta do leitor) para precedente, súmula e tese; sem tela, contador nem lembrete novos.
- Marcador "lido / para revisar" opcional e silencioso (já há `statusLeitura` no modelo). Nada disso aparece no Hoje nem na Sessão; vive só dentro da Biblioteca.
- Regra de interface: nenhuma ação nova compete com a leitura. Um toque, sem confirmação, desfazer à vista, sem badge.

### Interface e código
- Seguir a identidade visual vigente (cartão verde "Agora", creme/espresso, mascote só em pontos estratégicos, não no Leitor) e o guia de voz do #125.
- Considerar a modernização do código em andamento (#126: rotas preguiçosas, `LimiteDeErro`, storage persist; #127 e fatias de UI): componentes e rotas novos entram no padrão atual, sem reintroduzir o que foi removido.
- Ordem: depois do PR do Filtro da Biblioteca (mesma pasta `src/apresentacao/biblioteca/`) e da F3-B (B2→B4), antes da F4-A. Atividade A e B em sequência; B exige backup do Gabriel antes do merge e revisão independente.
