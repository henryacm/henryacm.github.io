$ErrorActionPreference = "Stop"

$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location -LiteralPath $root

Write-Host "Serving $root"
Write-Host "Open: http://127.0.0.1:$port/index.html"
Write-Host "Blog: http://127.0.0.1:$port/blog/"
Write-Host "Press Ctrl+C to stop."

python -m http.server $port --bind 127.0.0.1
