# Start development environment for Telegram Bot Platform

param(
    [switch]$Build = $false,
    [switch]$Clean = $false
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is running
function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Main function
function Start-DevEnvironment {
    Write-Host "🚀 Starting Telegram Bot Platform Development Environment" -ForegroundColor Magenta
    Write-Host "=======================================================" -ForegroundColor Magenta
    
    # Check Docker
    if (-not (Test-DockerRunning)) {
        Write-Error "Docker is not running. Please start Docker Desktop first."
        exit 1
    }
    
    Write-Status "Docker is running ✓"
    
    # Clean up if requested
    if ($Clean) {
        Write-Status "Cleaning up existing containers and volumes..."
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans
        docker system prune -f
        Write-Status "Cleanup completed ✓"
    }
    
    # Build if requested or if images don't exist
    if ($Build) {
        Write-Status "Building Docker images..."
        docker-compose -f docker-compose.dev.yml build --no-cache
        Write-Status "Build completed ✓"
    }
    
    # Load environment variables
    if (Test-Path ".env.dev") {
        Write-Status "Loading development environment variables..."
        Get-Content ".env.dev" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
        Write-Status "Environment variables loaded ✓"
    }
    
    # Start services
    Write-Status "Starting development services..."
    docker-compose -f docker-compose.dev.yml up -d
    
    # Wait for services to be ready
    Write-Status "Waiting for services to start..."
    Start-Sleep 10
    
    # Check service health
    Write-Status "Checking service health..."
    
    # Check PostgreSQL
    $dbReady = $false
    $attempts = 0
    while (-not $dbReady -and $attempts -lt 30) {
        try {
            $result = docker exec telegram-bot-platform-db-dev pg_isready -U postgres -d telegram_bot_platform_dev
            if ($LASTEXITCODE -eq 0) {
                $dbReady = $true
                Write-Status "PostgreSQL is ready ✓"
            }
        }
        catch {
            Start-Sleep 2
            $attempts++
        }
    }
    
    if (-not $dbReady) {
        Write-Warning "PostgreSQL may not be ready yet, but continuing..."
    }
    
    # Check Redis
    try {
        docker exec telegram-bot-platform-redis-dev redis-cli ping | Out-Null
        Write-Status "Redis is ready ✓"
    }
    catch {
        Write-Warning "Redis may not be ready yet, but continuing..."
    }
    
    # Wait a bit more for backend to start
    Write-Status "Waiting for backend to start..."
    Start-Sleep 15
    
    # Check backend
    $backendReady = $false
    $attempts = 0
    while (-not $backendReady -and $attempts -lt 20) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $backendReady = $true
                Write-Status "Backend is ready ✓"
            }
        }
        catch {
            Start-Sleep 3
            $attempts++
        }
    }
    
    if (-not $backendReady) {
        Write-Warning "Backend may not be ready yet. Check logs with: docker logs telegram-bot-platform-backend-dev"
    }
    
    # Check frontend
    Write-Status "Waiting for frontend to start..."
    Start-Sleep 10
    
    $frontendReady = $false
    $attempts = 0
    while (-not $frontendReady -and $attempts -lt 20) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $frontendReady = $true
                Write-Status "Frontend is ready ✓"
            }
        }
        catch {
            Start-Sleep 3
            $attempts++
        }
    }
    
    if (-not $frontendReady) {
        Write-Warning "Frontend may not be ready yet. Check logs with: docker logs telegram-bot-platform-frontend-dev"
    }
    
    # Display access information
    Write-Host ""
    Write-Host "🎉 Development Environment Started Successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Application URLs:" -ForegroundColor Cyan
    Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend:   http://localhost:3001" -ForegroundColor White
    Write-Host "  API Docs:  http://localhost:3001/api" -ForegroundColor White
    Write-Host "  Health:    http://localhost:3001/health" -ForegroundColor White
    Write-Host ""
    Write-Host "🗄️  Database URLs:" -ForegroundColor Cyan
    Write-Host "  PostgreSQL: localhost:5432 (postgres/password)" -ForegroundColor White
    Write-Host "  Redis:      localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Useful Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:     docker-compose -f docker-compose.dev.yml logs -f [service]" -ForegroundColor White
    Write-Host "  Stop services: docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
    Write-Host "  Restart:       docker-compose -f docker-compose.dev.yml restart [service]" -ForegroundColor White
    Write-Host "  Shell access:  docker exec -it telegram-bot-platform-[service]-dev sh" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Services Status:" -ForegroundColor Cyan
    docker-compose -f docker-compose.dev.yml ps
    
    Write-Host ""
    Write-Status "Development environment is ready! Open http://localhost:3000 to view the application."
}

# Run main function
try {
    Start-DevEnvironment
}
catch {
    Write-Error "Failed to start development environment: $_"
    Write-Host ""
    Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check Docker Desktop is running" -ForegroundColor White
    Write-Host "2. Check if ports 3000, 3001, 5432, 6379 are available" -ForegroundColor White
    Write-Host "3. View logs: docker-compose -f docker-compose.dev.yml logs" -ForegroundColor White
    Write-Host "4. Try rebuilding: .\scripts\start-dev.ps1 -Build" -ForegroundColor White
    exit 1
}