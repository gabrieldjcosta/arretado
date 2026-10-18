# Preparo da V1 (pacote A7)

Itens de infraestrutura e texto para abrir a V1. Fonte da decisão: `docs/planos/f4a-contas.md` (linha 5 da tabela de custos) e `docs/planos/f4a-pacotes.md` (A7).

## Consulta diária contra a pausa do Supabase gratuito

- [x] Workflow `.github/workflows/consulta-diaria.yml` (cron diário às 09:17 UTC + execução manual). Faz um GET em `/rest/v1/` com a chave publicável; sem escrita, sem dado pessoal, só `curl`.
- [ ] **Gabriel cadastra os 2 segredos** em GitHub › Settings › Secrets and variables › Actions › Repository secrets:
  - `SUPABASE_URL`: URL do projeto (`https://<ref>.supabase.co`).
  - `SUPABASE_PUBLISHABLE_KEY`: chave publicável (`sb_publishable_…`), nunca a `secret`/`service_role`.
- Sem os segredos o job termina verde com aviso. Com eles, falha vermelho só se a resposta for 5xx ou timeout 3 vezes seguidas.
- Teste: Actions › Consulta diária › Run workflow; o log mostra `HTTP 200` (ou 4xx, que também conta como resposta do projeto).
