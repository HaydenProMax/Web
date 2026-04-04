param(
  [int]$Port = 3090
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path (Join-Path $workspaceRoot "tmp") "regression-web-$Port.pid"

function Get-ListeningProcessId([int]$ListeningPort) {
  $lines = cmd /c "netstat -ano -p tcp | findstr LISTENING | findstr :$ListeningPort"
  foreach ($line in $lines) {
    $parts = ($line -split "\s+") | Where-Object { $_ }
    if ($parts.Length -ge 5) {
      return $parts[-1]
    }
  }

  return $null
}

$listenerPid = Get-ListeningProcessId $Port
if (-not $listenerPid) {
  Write-Output "NOT-RUNNING"
  exit 0
}

Set-Content -Path $pidPath -Value $listenerPid -NoNewline

try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/sign-in" -UseBasicParsing -TimeoutSec 2
  if ($response.StatusCode -eq 200) {
    Write-Output "READY:${listenerPid}:${Port}"
    exit 0
  }
} catch {
}

Write-Output "RUNNING:${listenerPid}:${Port}"