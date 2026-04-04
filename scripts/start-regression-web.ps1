param(
  [int]$Port = 3090
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$tmpDir = Join-Path $workspaceRoot "tmp"
$appDir = Join-Path $workspaceRoot "apps\web"

if (-not (Test-Path $tmpDir)) {
  New-Item -ItemType Directory -Path $tmpDir | Out-Null
}

$pidPath = Join-Path $tmpDir "regression-web-$Port.pid"
$stdoutPath = Join-Path $tmpDir "regression-web-$Port.out.log"
$stderrPath = Join-Path $tmpDir "regression-web-$Port.err.log"

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

if (Test-Path $pidPath) {
  $existingPid = (Get-Content $pidPath -Raw).Trim()
  if ($existingPid) {
    $existing = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($existing) {
      Write-Output "RUNNING:${existingPid}:${Port}"
      exit 0
    }
  }

  Remove-Item $pidPath -Force
}

if (Test-Path $stdoutPath) { Remove-Item $stdoutPath -Force }
if (Test-Path $stderrPath) { Remove-Item $stderrPath -Force }

$inner = ('""C:\Program Files\nodejs\npm.cmd"" run start -- --port {0} 1>> ""{1}"" 2>> ""{2}""' -f $Port, $stdoutPath, $stderrPath)
$launcher = ('start "" /min cmd /k {0}' -f $inner)
Start-Process -FilePath "C:\Windows\System32\cmd.exe" -ArgumentList "/c", $launcher -WorkingDirectory $appDir -WindowStyle Hidden | Out-Null

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Milliseconds 500
  $listenerPid = Get-ListeningProcessId $Port
  if ($listenerPid) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/sign-in" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        Set-Content -Path $pidPath -Value $listenerPid -NoNewline
        Write-Output "READY:${listenerPid}:${Port}"
        exit 0
      }
    } catch {
    }
  }
}

$listenerPid = Get-ListeningProcessId $Port
if ($listenerPid) {
  Set-Content -Path $pidPath -Value $listenerPid -NoNewline
  Write-Output "STARTED:${listenerPid}:${Port}"
  exit 0
}

Write-Output "FAILED:${Port}"
exit 1