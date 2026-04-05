param(
  [int]$Port = 3090
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $workspaceRoot 'apps\web'
Set-Location $appDir
& 'C:\Program Files\nodejs\npm.cmd' run start -- --port $Port
