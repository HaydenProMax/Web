param(
  [int]$Port = 3090
)

$ErrorActionPreference = "Stop"
$workspaceRoot = Split-Path -Parent $PSScriptRoot
node (Join-Path $workspaceRoot 'scripts\start-regression-web.mjs') --port $Port
