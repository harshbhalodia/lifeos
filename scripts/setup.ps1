#requires -Version 5.1
# One-time (or repeatable) setup: backend venv + deps + DB migration, frontend deps + env file.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$web = Join-Path $root "apps\web"

Write-Host "== Backend setup ==" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $backend ".venv"))) {
    py -m venv (Join-Path $backend ".venv")
}
$pythonExe = Join-Path $backend ".venv\Scripts\python.exe"
& $pythonExe -m pip install --upgrade pip -q
& $pythonExe -m pip install -r (Join-Path $backend "requirements.txt") -q

$configYaml = Join-Path $root "config\config.yaml"
$configExample = Join-Path $root "config\config.example.yaml"
if (-not (Test-Path $configYaml)) {
    Copy-Item $configExample $configYaml
    Write-Host "Created config/config.yaml - edit jwt_secret and admin credentials before real use." -ForegroundColor Yellow
}

Push-Location $backend
& $pythonExe -m alembic upgrade head
Pop-Location

Write-Host "== Frontend setup ==" -ForegroundColor Cyan
$envLocal = Join-Path $web ".env.local"
$envExample = Join-Path $web ".env.example"
if (-not (Test-Path $envLocal)) {
    Copy-Item $envExample $envLocal
}
Push-Location $web
npm install
Pop-Location

Write-Host "`nSetup complete. Run .\scripts\start.ps1 to launch the app." -ForegroundColor Green
