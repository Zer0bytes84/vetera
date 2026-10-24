# Banc de recherche locale sur un poste Windows (condition 3 de la phase A2).
# Même moteur que sur Mac : binaire de debug, webview WebView2, données isolées.
# Usage (PowerShell, depuis la racine du dépôt) :
#   .\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-courtes -Tasks queries
#   .\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-phqa -Tasks public -OnlySets "PublicHealthQA,SyntecRetrieval"
#   .\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-alloprof -Tasks public -OnlySets AlloprofRetrieval -MaxMinutes 360
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [string]$Tasks = "queries",
  [string]$OnlySets = "",
  [int]$Threads = 0,          # 0 = règle de l'app (moitié des cœurs logiques, 4 au plus)
  [string]$Model = "arctic",
  [int]$MaxMinutes = 180
)
$ErrorActionPreference = "Stop"
$W = Join-Path $env:LOCALAPPDATA "baitari-eval"
New-Item -ItemType Directory -Force -Path $W | Out-Null
$Out = Join-Path $W "report-$Label.json"
Remove-Item -ErrorAction SilentlyContinue $Out, (Join-Path $W "report-$Label.progress.log")

# Fiche du poste, jointe au rapport.
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpu = Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion
$webview = (Get-ItemProperty -ErrorAction SilentlyContinue "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}").pv
@{
  label = $Label; ramGo = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
  cpu = $cpu.Name; cores = $cpu.NumberOfCores; logical = $cpu.NumberOfLogicalProcessors
  gpu = $gpu; webview2 = $webview; os = (Get-CimInstance Win32_OperatingSystem).Caption
} | ConvertTo-Json -Depth 3 | Set-Content -Encoding utf8 (Join-Path $W "poste-$Label.json")

$env:BAITARI_EVAL_CASES = Join-Path $W "cases.json"
$env:BAITARI_EVAL_PUBLIC = Join-Path $W "public-sets.json"
$env:BAITARI_EVAL_OUT = $Out
$env:BAITARI_EVAL_LABEL = $Label
$env:BAITARI_EVAL_TASKS = $Tasks
$env:BAITARI_EVAL_ONLY_SETS = $OnlySets
$env:BAITARI_EVAL_SIZES = "800"
$env:BAITARI_EVAL_SKIP_SECTIONS = "1"
$env:BAITARI_EVAL_SEARCH_MODEL = $Model
if ($Threads -gt 0) { $env:BAITARI_EVAL_SEARCH_THREADS = "$Threads" } else { Remove-Item -ErrorAction SilentlyContinue Env:BAITARI_EVAL_SEARCH_THREADS }

$vite = Start-Process -PassThru -WindowStyle Hidden -FilePath "npx.cmd" -ArgumentList "vite", "--config", "scripts/eval-local-ai/vite.eval.config.ts" -RedirectStandardOutput (Join-Path $W "vite-$Label.log")
do { Start-Sleep -Seconds 1 } until ((Test-NetConnection -ComputerName localhost -Port 5180 -InformationLevel Quiet -WarningAction SilentlyContinue))

$data = Join-Path $env:TEMP ("baitari-eval-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $data | Out-Null
$env:BAITARI_DATA_DIR = $data
$launchedAt = Get-Date
$app = Start-Process -PassThru -FilePath "src-tauri\target\debug\vetera.exe"
"lancement $($launchedAt.ToString('o'))" | Set-Content -Encoding utf8 (Join-Path $W "mem-$Label.csv")

# Mémoire : processus WebView2 apparus avec l'app, chaque seconde (Mo).
$deadline = $launchedAt.AddMinutes($MaxMinutes)
while (-not (Test-Path $Out) -and -not $app.HasExited -and (Get-Date) -lt $deadline) {
  $views = Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -ge $launchedAt }
  $private = [math]::Round((($views | Measure-Object PrivateMemorySize64 -Sum).Sum) / 1MB)
  $working = [math]::Round((($views | Measure-Object WorkingSet64 -Sum).Sum) / 1MB)
  $free = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB)
  $cpuLoad = (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
  "$([DateTimeOffset]::Now.ToUnixTimeSeconds()) $private $working $free $cpuLoad" | Add-Content (Join-Path $W "mem-$Label.csv")
  Start-Sleep -Seconds 1
}
Start-Sleep -Seconds 2
Stop-Process -ErrorAction SilentlyContinue -Id $app.Id
Stop-Process -ErrorAction SilentlyContinue -Id $vite.Id
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -ge $launchedAt.AddMinutes(-2) } | Stop-Process -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $data
if (Test-Path $Out) { "rapport : $Out" } else { "PAS DE RAPPORT : voir $(Join-Path $W "report-$Label.progress.log")" }
