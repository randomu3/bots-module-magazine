# Production Deployment Script for Telegram Bot Platform (PowerShell)
# This script handles the complete production deployment process on Windows

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "rollback", "status", "health", "backup", "cleanup")]
    [string]$Action = "deploy"
)

# Configuration
$ComposeFile = "docker-compose.yml"
$EnvFile = ".env"
$BackupDir = ".\backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    try {
        $null = docker --version
        $null = docker info
    }
    catch {
        Write-Error "Docker is not installed or not running"
        exit 1
    }
    
    # Check if Docker Compose is installed
    try {
        $null = docker-compose --version
    }
    catch {
        Write-Error "Docker Compose is not installed"
        exit 1
    }
    
    # Check if environment file exists
    if (-not (Test-Path $EnvFile)) {
        Write-Error "Environment file $EnvFile not found"
        Write-Info "Please copy .env.production to .env and configure it"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Backup-Data {
    Write-Info "Creating backup..."
    
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    
    # Backup database
    try {
        $postgresStatus = docker-compose ps postgres
        if ($postgresStatus -match "Up") {
            Write-Info "Backing up database..."
            docker-compose exec -T postgres pg_dump -U postgres telegram_bot_platform | Out-File -FilePath "$BackupDir\database.sql" -Encoding UTF8
            Write-Success "Database backup created"
        }
        else {
            Write-Warning "Database container not running, skipping database backup"
        }
    }
    catch {
        Write-Warning "Failed to backup database: $_"
    }
    
    # Backup uploaded files
    if (Test-Path ".\uploads") {
        Write-Info "Backing up uploaded files..."
        Copy-Item -Path ".\uploads" -Destination $BackupDir -Recurse
        Write-Success "Files backup created"
    }
    
    Write-Success "Backup completed: $BackupDir"
}

function Build-Images {
    Write-Info "Building Docker images..."
    
    # Build backend image
    Write-Info "Building backend image..."
    docker-compose build --no-cache backend
    
    # Build frontend image
    Write-Info "Building frontend image..."
    docker-compose build --no-cache frontend
    
    Write-Success "Docker images built successfully"
}

function Deploy-Services {
    Write-Info "Deploying services..."
    
    # Stop existing services
    Write-Info "Stopping existing services..."
    docker-compose down
    
    # Start database and Redis first
    Write-Info "Starting database and Redis..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    Write-Info "Waiting for database to be ready..."
    Start-Sleep -Seconds 30
    
    # Run database migrations
    Write-Info "Running database migrations..."
    docker-compose run --rm backend npm run migrate
    
    # Start application services
    Write-Info "Starting application services..."
    docker-compose up -d backend frontend
    
    # Wait for services to be ready
    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 30
    
    # Start nginx
    Write-Info "Starting nginx..."
    docker-compose up -d nginx
    
    # Start log aggregation
    Write-Info "Starting log aggregation..."
    docker-compose up -d fluentd
    
    Write-Success "Services deployed successfully"
}

function Test-Health {
    Write-Info "Performing health checks..."
    
    # Check backend health
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend health check passed"
                break
            }
        }
        catch {
            if ($i -eq 30) {
                Write-Error "Backend health check failed after 30 attempts"
                return $false
            }
            
            Write-Info "Waiting for backend to be ready... (attempt $i/30)"
            Start-Sleep -Seconds 10
        }
    }
    
    # Check frontend health
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "Frontend health check passed"
                break
            }
        }
        catch {
            if ($i -eq 30) {
                Write-Error "Frontend health check failed after 30 attempts"
                return $false
            }
            
            Write-Info "Waiting for frontend to be ready... (attempt $i/30)"
            Start-Sleep -Seconds 10
        }
    }
    
    Write-Success "All health checks passed"
    return $true
}

function Invoke-Cleanup {
    Write-Info "Cleaning up unused Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    Write-Success "Cleanup completed"
}

function Show-Status {
    Write-Info "Deployment status:"
    docker-compose ps
    
    Write-Info "Service logs (last 20 lines):"
    docker-compose logs --tail=20
}

function Invoke-Rollback {
    Write-Warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose down
    
    # Restore database backup if available
    if (Test-Path "$BackupDir\database.sql") {
        Write-Info "Restoring database backup..."
        docker-compose up -d postgres
        Start-Sleep -Seconds 30
        Get-Content "$BackupDir\database.sql" | docker-compose exec -T postgres psql -U postgres -d telegram_bot_platform
    }
    
    # Restore files backup if available
    if (Test-Path "$BackupDir\uploads") {
        Write-Info "Restoring files backup..."
        if (Test-Path ".\uploads") {
            Remove-Item -Path ".\uploads" -Recurse -Force
        }
        Copy-Item -Path "$BackupDir\uploads" -Destination ".\uploads" -Recurse
    }
    
    Write-Warning "Rollback completed. Please check the previous version manually."
}

# Main deployment process
function Invoke-Deploy {
    Write-Info "Starting production deployment..."
    
    # Check prerequisites
    Test-Prerequisites
    
    # Create backup
    Backup-Data
    
    # Build images
    Build-Images
    
    # Deploy services
    Deploy-Services
    
    # Perform health checks
    if (-not (Test-Health)) {
        Write-Error "Health checks failed. Rolling back..."
        Invoke-Rollback
        exit 1
    }
    
    # Cleanup
    Invoke-Cleanup
    
    # Show status
    Show-Status
    
    Write-Success "Production deployment completed successfully!"
    Write-Info "Application is available at: http://localhost"
    Write-Info "API health check: http://localhost/api/health"
}

# Handle script arguments
switch ($Action) {
    "deploy" { Invoke-Deploy }
    "rollback" { Invoke-Rollback }
    "status" { Show-Status }
    "health" { Test-Health }
    "backup" { Backup-Data }
    "cleanup" { Invoke-Cleanup }
    default {
        Write-Host "Usage: .\deploy-production.ps1 [deploy|rollback|status|health|backup|cleanup]"
        Write-Host "  deploy   - Full production deployment (default)"
        Write-Host "  rollback - Rollback to previous backup"
        Write-Host "  status   - Show current deployment status"
        Write-Host "  health   - Perform health checks"
        Write-Host "  backup   - Create backup only"
        Write-Host "  cleanup  - Clean up Docker resources"
        exit 1
    }
}