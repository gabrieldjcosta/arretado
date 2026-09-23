# Pacote Arretado (`.arretado`) — formato v1

Formato único de backup, restauração e migração (D21, T8; Parte 2 §12). Esquema executável em `src/core/pacote/formato.ts` — este documento e o esquema devem dizer a mesma coisa.

## Arquivo

Um ZIP comum (abre em qualquer descompactador).

### Sem cifra

```
manifesto.json          metadados, contagens e hashes (abaixo)
dados/<colecao>.json    um arquivo por coleção incluída: lista de registros, ordenada por id
log.json                (opcional) log de alterações do usuário
anexos/<id>             (opcional) conteúdo binário dos anexos
```

### Com cifra (senha do usuário)

```
manifesto.json          só formato, versão do formato e parâmetros da cifra
conteudo.cifrado        o ZIP "sem cifra" acima, cifrado
```

- Cifra: **AES-256-GCM** (IV aleatório de 12 bytes).
- Chave: **PBKDF2-SHA-256**, 600 000 iterações, sal aleatório de 16 bytes.
- O app **não guarda a senha**. Sem a senha não há recuperação.
- Sal, IV e iterações vão no manifesto externo (não são segredo).

## `manifesto.json` (sem cifra)

| Campo | Conteúdo |
|---|---|
| `formato` | `"arretado-pacote"` |
| `versaoFormato` | `1` |
| `versaoEsquema` | versão do esquema local que gerou o pacote |
| `versaoApp` | versão do app que gerou o pacote |
| `criadoEm` | instante ISO 8601 UTC |
| `usuarioId` / `aparelhoId` | origem do pacote |
| `escopo` | `{ "tipo": "integral" }` ou `{ "tipo": "modulos", "modulos": [...] }` |
| `modulos` | módulos incluídos |
| `incluiLog` / `incluiAnexos` | se `log.json` e `anexos/` estão presentes |
| `contagens` | registros por coleção |
| `arquivos` | por caminho: `sha256` (hex), `bytes` |
| `hashConjunto` | SHA-256 das linhas `caminho<TAB>sha256\n` de todos os arquivos, em ordem de caminho |

Cada arquivo de dados é JSON canônico (chaves ordenadas), então o mesmo conteúdo gera sempre o mesmo hash: exportar → apagar → restaurar → exportar produz arquivos de dados idênticos, byte a byte (só `dados/aparelhos.json` ganha o registro do Aparelho que restaurou, que nunca é apagado). No mesmo aparelho, sem apagar, o `hashConjunto` é idêntico.

## Validação na importação

Em ordem; qualquer falha recusa o pacote inteiro com mensagem clara, sem escrever nada:

1. É um ZIP com `manifesto.json` válido e `formato` correto.
2. Cifrado → exige senha; senha errada ou conteúdo alterado → recusa (o GCM detecta).
3. `versaoFormato` conhecido; `versaoEsquema` ≤ versão local (posterior → "atualize o app"); anterior → registros migrados.
4. Conteúdo descompactado até 512 MB (conferido antes de descompactar: proteção contra "zip bomb").
5. Todo arquivo listado existe, nenhum arquivo sobra, cada `sha256` confere, `hashConjunto` confere.
6. Todo registro passa no esquema da sua coleção e pertence ao `usuarioId` do manifesto.
7. Todo arquivo em `anexos/` exige `incluiAnexos`, um registro de Anexo com o mesmo id e o mesmo hash.

Falha de 4 a 7 = **arquivo alterado fora do aplicativo** (rodapé, D18).

## Modos de importação (Parte 2 §12.2)

| Modo | Regra por registro do pacote (`P`) contra o local (`L`, mesmo id) |
|---|---|
| 1 Simulação | Calcula a prévia de qualquer outro modo; não escreve |
| 2 Adicionar somente novos | sem `L` → cria; com `L` → ignora |
| 3 Atualizar identificados | `L` existe, difere e `P` é mais recente (relógio lógico) → atualiza; resto ignora; nunca cria |
| 4 Mesclar com resolução | sem `L` → cria; igual → ignora; mesma autoria (mesmo aparelho no carimbo) → vence o mais recente; autorias diferentes e conteúdo diferente → **conflito** para escolha (padrão: manter local) |
| 5 Substituir módulo | nos módulos escolhidos: `P` grava (cria ou sobrescreve); `L` ausente do pacote → exclusão lógica |
| 6 Restaurar integral | o local passa a ser exatamente o pacote: diferentes/novos gravam, ausentes do pacote são apagados; a identidade (usuário) passa a ser a do pacote |
| 7 Espaço separado | cria um banco local isolado com o pacote (integral ou parcial), visível em Conta; depois pode ser mesclado (modo 4), sem trazer usuário, aparelho e preferências do espaço |

Regras comuns:

- **Pacote de outro usuário** só nos modos 6 e 7. O modo 6 não mistura dados: substitui tudo, inclusive a identidade (caso normal de recuperação num aparelho novo). O modo 7 isola.
- **O registro deste Aparelho nunca é apagado** por importação (modos 5 e 6); no modo 6 de outra identidade ele passa para a identidade do pacote.
- **Prévia defasada é recusada**: se os dados afetados mudarem entre a prévia e a confirmação, a importação não roda e pede nova prévia.
- **Anexos**: só o conteúdo dos anexos cujo registro foi gravado nesta importação é escrito.
- **Revisões são imutáveis**: mesmo id com conteúdo diferente é ignorado e avisado.
- **Provável duplicata**: registro novo com conteúdo idêntico a um local de outro id é criado e avisado — nunca fundido.
- **Idempotência**: repetir o mesmo pacote no mesmo modo não altera nada.
- **Snapshot** automático antes de qualquer modo que escreva; **LogDeImportação** com hash do pacote, modo, contagens e snapshot; **rollback** de um clique enquanto o snapshot existir (retenção mínima de 5). O rollback também guarda o estado anterior e pode ser desfeito.
- Coleções só locais (log de importações, snapshots, espaços) nunca entram no pacote.
- O `log.json`, quando presente, é guardado para auditoria e não é reaplicado: os registros são a verdade.
