$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$hugo = Get-Command hugo -ErrorAction SilentlyContinue

if ($hugo) {
    $hugoExe = $hugo.Source
} else {
    $wingetPackages = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    $hugoExe = Get-ChildItem -LiteralPath $wingetPackages -Recurse -Filter hugo.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "Hugo\.Hugo\.Extended" } |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $hugoExe) {
    Write-Host "Hugo was not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Hugo Extended, then reopen PowerShell:"
    Write-Host "  winget install Hugo.Hugo.Extended"
    Write-Host ""
    Write-Host "Or if Hugo is already installed, add hugo.exe to PATH."
    exit 1
}

& $hugoExe `
  --source "$root\blog-src" `
  --destination "$root\blog" `
  --baseURL "http://127.0.0.1:8000/blog/" `
  --gc

Write-Host "Blog built to $root\blog"
Write-Host "Preview with: .\serve.ps1"
