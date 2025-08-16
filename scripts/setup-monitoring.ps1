# Setup monitoring and logging for Telegram Bot Platform
# This script sets up comprehensive monitoring, logging, and alerting

param(
    [switch]$SkipDependencyCheck = $false
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

# Check if Docker and Docker Compose are installed
function Test-Dependencies {
    Write-Status "Checking dependencies..."
    
    try {
        $dockerVersion = docker --version
        Write-Status "Docker found: $dockerVersion"
    }
    catch {
        Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop first."
        exit 1
    }
    
    try {
        $composeVersion = docker-compose --version
        Write-Status "Docker Compose found: $composeVersion"
    }
    catch {
        Write-Error "Docker Compose is not installed or not in PATH."
        exit 1
    }
    
    Write-Status "Dependencies check passed ✓"
}

# Create necessary directories
function New-MonitoringDirectories {
    Write-Status "Creating necessary directories..."
    
    # Log directories (Windows paths)
    $logDirs = @(
        "logs\backend",
        "logs\frontend", 
        "logs\nginx",
        "logs\postgresql",
        "logs\redis",
        "logs\fluentd"
    )
    
    foreach ($dir in $logDirs) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Status "Created directory: $dir"
        }
    }
    
    # Monitoring directories
    $monitoringDirs = @(
        "monitoring\grafana\provisioning\datasources",
        "monitoring\grafana\provisioning\dashboards",
        "monitoring\grafana\dashboards",
        "monitoring\loki",
        "monitoring\promtail",
        "monitoring\alertmanager\templates"
    )
    
    foreach ($dir in $monitoringDirs) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Status "Created directory: $dir"
        }
    }
    
    Write-Status "Directories created ✓"
}

# Install required packages
function Install-MonitoringPackages {
    Write-Status "Installing required packages..."
    
    # Install Node.js dependencies for backend monitoring
    if (Test-Path "backend\package.json") {
        Push-Location backend
        try {
            npm install winston prom-client uuid ioredis
            Write-Status "Backend monitoring packages installed ✓"
        }
        catch {
            Write-Warning "Failed to install some npm packages. Please run 'npm install winston prom-client uuid ioredis' manually in the backend directory."
        }
        finally {
            Pop-Location
        }
    }
    
    Write-Status "Package installation completed ✓"
}

# Setup environment variables
function Set-MonitoringEnvironment {
    Write-Status "Setting up environment variables..."
    
    # Create monitoring environment file if it doesn't exist
    if (!(Test-Path ".env.monitoring")) {
        $envContent = @"
# Monitoring Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123
PROMETHEUS_RETENTION=30d

# Alert Configuration
DEFAULT_ALERT_EMAIL=admin@yourdomain.com
CRITICAL_ALERT_EMAIL=critical@yourdomain.com
INFRASTRUCTURE_TEAM_EMAIL=infra@yourdomain.com
BACKEND_TEAM_EMAIL=backend@yourdomain.com
DATABASE_TEAM_EMAIL=database@yourdomain.com
BUSINESS_TEAM_EMAIL=business@yourdomain.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_FROM=alerts@yourdomain.com

# Slack Webhooks (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SECURITY_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SECURITY/WEBHOOK
ERROR_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/ERROR/WEBHOOK
PERFORMANCE_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/PERFORMANCE/WEBHOOK

# Analytics Webhook (optional)
ANALYTICS_WEBHOOK_URL=https://your-analytics-service.com/webhook
"@
        
        Set-Content -Path ".env.monitoring" -Value $envContent
        Write-Warning "Created .env.monitoring file. Please update it with your actual configuration."
    }
    
    Write-Status "Environment setup completed ✓"
}

# Start monitoring services
function Start-MonitoringServices {
    Write-Status "Starting monitoring services..."
    
    try {
        # Start monitoring stack
        docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
        Write-Status "Monitoring services started ✓"
    }
    catch {
        Write-Error "Failed to start monitoring services. Error: $_"
        exit 1
    }
}

# Wait for services to be ready
function Wait-ForServices {
    Write-Status "Waiting for services to be ready..."
    
    # Wait for Prometheus
    Write-Status "Waiting for Prometheus..."
    $timeout = 60
    $elapsed = 0
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:9090/-/ready" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) { break }
        }
        catch { }
        Start-Sleep 2
        $elapsed += 2
    } while ($elapsed -lt $timeout)
    
    if ($elapsed -ge $timeout) {
        Write-Warning "Prometheus may not be ready yet. Continuing..."
    } else {
        Write-Status "Prometheus is ready ✓"
    }
    
    # Wait for Grafana
    Write-Status "Waiting for Grafana..."
    $elapsed = 0
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) { break }
        }
        catch { }
        Start-Sleep 2
        $elapsed += 2
    } while ($elapsed -lt $timeout)
    
    if ($elapsed -ge $timeout) {
        Write-Warning "Grafana may not be ready yet. Continuing..."
    } else {
        Write-Status "Grafana is ready ✓"
    }
    
    Write-Status "Service readiness check completed ✓"
}

# Test monitoring setup
function Test-MonitoringSetup {
    Write-Status "Testing monitoring setup..."
    
    # Test Prometheus
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/targets" -TimeoutSec 10
        Write-Status "Prometheus is responding ✓"
    }
    catch {
        Write-Warning "Prometheus may not be fully ready yet."
    }
    
    # Test AlertManager
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9093/api/v1/status" -TimeoutSec 10
        Write-Status "AlertManager is responding ✓"
    }
    catch {
        Write-Warning "AlertManager may not be fully ready yet."
    }
    
    # Test Grafana
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 10
        Write-Status "Grafana is responding ✓"
    }
    catch {
        Write-Warning "Grafana may not be fully ready yet."
    }
    
    Write-Status "Monitoring test completed ✓"
}

# Display access information
function Show-AccessInfo {
    Write-Status "Monitoring setup completed successfully! 🎉"
    Write-Host ""
    Write-Host "📊 Access URLs:" -ForegroundColor Cyan
    Write-Host "  Grafana:      http://localhost:3001 (admin/admin123)" -ForegroundColor White
    Write-Host "  Prometheus:   http://localhost:9090" -ForegroundColor White
    Write-Host "  AlertManager: http://localhost:9093" -ForegroundColor White
    Write-Host "  Loki:         http://localhost:3100" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Available Dashboards:" -ForegroundColor Cyan
    Write-Host "  - Application Overview" -ForegroundColor White
    Write-Host "  - Business Metrics" -ForegroundColor White
    Write-Host "  - Infrastructure Monitoring" -ForegroundColor White
    Write-Host ""
    Write-Host "🔔 Alerting:" -ForegroundColor Cyan
    Write-Host "  - Configure email/Slack webhooks in .env.monitoring" -ForegroundColor White
    Write-Host "  - Alerts are configured for critical system events" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Logs:" -ForegroundColor Cyan
    Write-Host "  - Application logs: logs\backend\, logs\frontend\" -ForegroundColor White
    Write-Host "  - Aggregated logs available in Grafana via Loki" -ForegroundColor White
    Write-Host ""
    Write-Warning "Remember to:"
    Write-Warning "1. Update .env.monitoring with your actual configuration"
    Write-Warning "2. Configure SMTP settings for email alerts"
    Write-Warning "3. Set up Slack webhooks for instant notifications"
    Write-Warning "4. Review and customize alert rules in monitoring\alert_rules.yml"
}

# Main execution
function Main {
    Write-Host "🚀 Starting Telegram Bot Platform Monitoring Setup" -ForegroundColor Magenta
    Write-Host "==================================================" -ForegroundColor Magenta
    
    if (-not $SkipDependencyCheck) {
        Test-Dependencies
    }
    
    New-MonitoringDirectories
    Install-MonitoringPackages
    Set-MonitoringEnvironment
    Start-MonitoringServices
    Wait-ForServices
    Test-MonitoringSetup
    Show-AccessInfo
    
    Write-Host ""
    Write-Status "Setup completed successfully! 🎉"
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Setup failed: $_"
    exit 1
}