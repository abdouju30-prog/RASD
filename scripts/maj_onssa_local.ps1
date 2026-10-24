# Mise à jour ONSSA depuis le poste local.
#
# eservice.onssa.gov.ma et www.onssa.gov.ma refusent les connexions venant des
# serveurs GitHub (constaté le 24/10/2026 : curl 7 / 28 sur chaque exécution),
# donc les workflows ne rafraîchissent plus l'index ONSSA depuis le 01/10.
# Ce script refait en local les étapes qui dépendent du site de l'ONSSA, puis
# pousse sur master — ce qui déclenche le déploiement Vercel.
#
#   powershell -ExecutionPolicy Bypass -File scripts\maj_onssa_local.ps1
#   ... -Rapide   (sans l'index IndPesticide, ~50 min)

param([switch]$Rapide)

$ErrorActionPreference = "Continue"
$env:PYTHONIOENCODING = "utf-8"
$depot = Split-Path -Parent $PSScriptRoot
Set-Location $depot

$journaux = Join-Path (Split-Path -Parent $depot) "homologa-auto-logs"
New-Item -ItemType Directory -Force $journaux | Out-Null
$log = Join-Path $journaux ("maj-onssa-{0}.log" -f (Get-Date -Format "yyyy-MM-dd_HHmm"))
Start-Transcript -Path $log | Out-Null

function Etape($nom, [scriptblock]$cmd) {
    Write-Host "=== $nom ($(Get-Date -Format HH:mm:ss))"
    & $cmd
    if ($LASTEXITCODE -ne 0) { Write-Host "!!! ECHEC : $nom (code $LASTEXITCODE)" }
}

git checkout master 2>&1 | Out-Null
git pull --rebase --autostash origin master 2>&1 | Write-Host

Etape "Textes ONSSA"            { python scripts/import_onssa_reglementation.py }
Etape "Listes retraits"         { python scripts/import_onssa_listes.py }
Etape "Registres e-service"     { python scripts/import_onssa_eservice.py }
if (-not $Rapide) {
    Etape "Index IndPesticide"  { python scripts/import_onssa_indpesticide.py --workers 3 }
}
Etape "Journal des nouveautés"  { python scripts/veille_onssa.py }

git add data/onssa-reglementation.json data/onssa-reglementation-vu.json data/onssa-listes.json `
        data/onssa-eservice.json data/onssa.json data/onssa-sortis.json data/onssa-journal.json `
        data/nouveautes.json 2>&1 | Out-Null
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "Veille ONSSA (poste local) - textes, listes, index" 2>&1 | Write-Host
    git pull --rebase --autostash origin master 2>&1 | Write-Host
    git push origin master 2>&1 | Write-Host
} else {
    Write-Host "Aucune modification ONSSA."
}

Stop-Transcript | Out-Null
