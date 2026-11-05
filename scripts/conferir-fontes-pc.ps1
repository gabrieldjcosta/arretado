# Conferência das fontes do Planalto rodando no PC do Gabriel (plano B do workflow
# `.github/workflows/conferir-fontes.yml`, para o caso de o Planalto bloquear o servidor do GitHub).
# Usa um worktree temporário a partir de `origin/integracao`: não toca na sua pasta de trabalho.
# Se alguma norma ganhou texto novo, abre PR de rascunho para a `integracao` (precisa de `gh` logado).
# Não altera o acervo: regerar o item e revisar continuam humanos. Só Node 22.18+ e git.
#
# Uso:   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\conferir-fontes-pc.ps1
# Agendar toda segunda, 9h30 (uma vez):
#   schtasks /Create /SC WEEKLY /D MON /ST 09:30 /TN "Arretado conferir fontes" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\gabri\Projetos\arretado\scripts\conferir-fontes-pc.ps1"
# Desligar: schtasks /Delete /TN "Arretado conferir fontes" /F
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$dia = (Get-Date).ToString('yyyy-MM-dd')
$ramo = "acervo/conferencia-$dia"
$arvore = Join-Path $env:TEMP "arretado-conferencia-$dia"
Set-Location $raiz
git fetch origin integracao
if (Test-Path $arvore) { git worktree remove --force $arvore }
git worktree add -B $ramo $arvore origin/integracao
try {
  Set-Location $arvore
  node scripts/acervo/conferir.ts
  if ($LASTEXITCODE -ne 0) { throw "A conferência falhou (código $LASTEXITCODE). Veja o log acima." }
  git add acervo/fontes-hash.json acervo/conferencia.md
  git diff --cached --quiet -- acervo/fontes-hash.json
  if ($LASTEXITCODE -eq 0) { Write-Host 'Nenhuma mudança na base: nada a abrir.'; return }
  git commit -m "chore(acervo): conferência das fontes de $dia"
  git push origin $ramo
  gh pr create --draft --base integracao --head $ramo --title "Acervo: conferência das fontes de $dia" --body-file acervo/conferencia.md
}
finally {
  Set-Location $raiz
  git worktree remove --force $arvore
}
