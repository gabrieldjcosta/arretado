# Política de segurança

## Reportar uma vulnerabilidade
Não abra issue pública. Use **Security > Report a vulnerability** neste repositório (aviso privado do GitHub) ou escreva para gabrieldjcosta@gmail.com. Resposta inicial em até 7 dias.

## Escopo
Aplicativo web (`src/`), Worker (`worker/`), esquema e políticas do Supabase (`supabase/`) e workflows (`.github/`).

## Princípios
- Local-first: o remoto é espelho; dados de estudo ficam legíveis só pelo dono (RLS).
- Nenhum segredo, chave ou dado pessoal no código; o repositório é público.
- HTML colado é sempre sanitizado antes de renderizar.
