# Stop development environment for Telegram Bot Platform

param(
    [switch]$Clean = $false
)

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

Write-Host "🛑 Stopping Telegram Bot Platform Development Environment" -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Red

Write-Status "Stopping development services..."
docker-compose -f docker-compose.dev.yml down

if ($Clean) {
    Write-Status "Cleaning up volumes and networks..."
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f
    Write-Status "Cleanup completed ✓"
}

Write-Status "Development environment stopped successfully!"