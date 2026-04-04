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

$processId = Get-ListeningProcessId $Port
if (-not $processId -and (Test-Path $pidPath)) {
  $processId = (Get-Content $pidPath -Raw).Trim()
}

if (-not $processId) {
  Write-Output "NOT-RUNNING"
  exit 0
}

$process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id ([int]$processId) -Force
  Write-Output "STOPPED:${processId}"
} else {
  Write-Output "STALE:${processId}"
}

if (Test-Path $pidPath) {
  Remove-Item $pidPath -Force
}