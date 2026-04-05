param(
  [int]$Port = 3090
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$tmpDir = Join-Path $workspaceRoot "tmp"
$runnerScript = Join-Path $workspaceRoot "scripts\run-regression-web.ps1"

if (-not (Test-Path $tmpDir)) {
  New-Item -ItemType Directory -Path $tmpDir | Out-Null
}

$pidPath = Join-Path $tmpDir "regression-web-$Port.pid"

if (Test-Path $pidPath) {
  $existingPid = [System.IO.File]::ReadAllText($pidPath).Trim()
  if ($existingPid) {
    $existing = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($existing) {
      Write-Output "RUNNING:${existingPid}:${Port}"
      exit 0
    }
  }
  Remove-Item $pidPath -Force
}

$process = Start-Process -FilePath "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
  -ArgumentList @("-ExecutionPolicy", "Bypass", "-File", $runnerScript, "-Port", "$Port") `
  -WindowStyle Hidden `
  -PassThru

[System.IO.File]::WriteAllText($pidPath, $process.Id.ToString(), [System.Text.UTF8Encoding]::new($false))

for ($attempt = 0; $attempt -lt 40; $attempt++) {
  Start-Sleep -Milliseconds 500

  $running = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
  if (-not $running) {
    break
  }

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/sign-in" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Write-Output "READY:$($process.Id):$Port"
      exit 0
    }
  } catch {
  }
}

$running = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if ($running) {
  Write-Output "STARTED:$($process.Id):$Port"
  exit 0
}

if (Test-Path $pidPath) { Remove-Item $pidPath -Force }
Write-Output "FAILED:$Port"
exit 1
