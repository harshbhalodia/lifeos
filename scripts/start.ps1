#requires -Version 5.1
# Launches the backend (new window) and frontend dev server (this window).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$web = Join-Path $root "apps\web"

Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "& '$backend\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000 --app-dir '$backend'"
)

Write-Host "Starting frontend on http://localhost:5173 ... (Ctrl+C here stops the frontend)" -ForegroundColor Cyan
Push-Location $web
npm run dev
Pop-Location
