#!/bin/bash

# Setup monitoring and logging for Telegram Bot Platform
# This script sets up comprehensive monitoring, logging, and alerting

set -e

echo "🔧 Setting up monitoring and logging for Telegram Bot Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Dependencies check passed ✓"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Log directories
    sudo mkdir -p /var/log/backend
    sudo mkdir -p /var/log/frontend
    sudo mkdir -p /var/log/nginx
    sudo mkdir -p /var/log/postgresql
    sudo mkdir -p /var/log/redis
    sudo mkdir -p /var/log/fluentd
    
    # Monitoring directories
    mkdir -p monitoring/grafana/provisioning/datasources
    mkdir -p monitoring/grafana/provisioning/dashboards
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/loki
    mkdir -p monitoring/promtail
    mkdir -p monitoring/alertmanager/templates
    
    # Set permissions
    sudo chown -R $USER:$USER /var/log/backend /var/log/frontend
    sudo chmod -R 755 /var/log/backend /var/log/frontend
    
    print_status "Directories created ✓"
}

# Install required packages
install_packages() {
    print_status "Installing required packages..."
    
    # Install Node.js dependencies for backend monitoring
    if [ -f "backend/package.json" ]; then
        cd backend
        npm install winston prom-client uuid
        cd ..
        print_status "Backend monitoring packages installed ✓"
    fi
    
    # Install Fluentd plugins if needed
    print_status "Fluentd will be configured via Docker ✓"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Create monitoring environment file if it doesn't exist
    if [ ! -f ".env.monitoring" ]; then
        cat > .env.monitoring << EOF
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
EOF
        print_warning "Created .env.monitoring file. Please update it with your actual configuration."
    fi
    
    print_status "Environment setup completed ✓"
}

# Start monitoring services
start_monitoring() {
    print_status "Starting monitoring services..."
    
    # Load environment variables
    if [ -f ".env.monitoring" ]; then
        export $(cat .env.monitoring | grep -v '^#' | xargs)
    fi
    
    # Start monitoring stack
    docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
    
    print_status "Monitoring services started ✓"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for Prometheus
    print_status "Waiting for Prometheus..."
    until curl -s http://localhost:9090/-/ready > /dev/null 2>&1; do
        sleep 2
    done
    
    # Wait for Grafana
    print_status "Waiting for Grafana..."
    until curl -s http://localhost:3001/api/health > /dev/null 2>&1; do
        sleep 2
    done
    
    # Wait for AlertManager
    print_status "Waiting for AlertManager..."
    until curl -s http://localhost:9093/-/ready > /dev/null 2>&1; do
        sleep 2
    done
    
    print_status "All services are ready ✓"
}

# Configure Grafana datasources and dashboards
configure_grafana() {
    print_status "Configuring Grafana..."
    
    # Wait a bit more for Grafana to fully initialize
    sleep 10
    
    # Import dashboards (they should be auto-provisioned)
    print_status "Dashboards will be auto-provisioned from monitoring/grafana/dashboards/ ✓"
    
    print_status "Grafana configuration completed ✓"
}

# Test monitoring setup
test_monitoring() {
    print_status "Testing monitoring setup..."
    
    # Test Prometheus targets
    print_status "Testing Prometheus targets..."
    TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[].health' | grep -c "up" || echo "0")
    print_status "Active Prometheus targets: $TARGETS"
    
    # Test AlertManager
    print_status "Testing AlertManager..."
    curl -s http://localhost:9093/api/v1/status > /dev/null && print_status "AlertManager is responding ✓"
    
    # Test Grafana
    print_status "Testing Grafana..."
    curl -s http://localhost:3001/api/health > /dev/null && print_status "Grafana is responding ✓"
    
    print_status "Monitoring test completed ✓"
}

# Display access information
display_info() {
    print_status "Monitoring setup completed successfully! 🎉"
    echo ""
    echo "📊 Access URLs:"
    echo "  Grafana:      http://localhost:3001 (admin/admin123)"
    echo "  Prometheus:   http://localhost:9090"
    echo "  AlertManager: http://localhost:9093"
    echo "  Loki:         http://localhost:3100"
    echo ""
    echo "📋 Available Dashboards:"
    echo "  - Application Overview"
    echo "  - Business Metrics"
    echo "  - Infrastructure Monitoring"
    echo ""
    echo "🔔 Alerting:"
    echo "  - Configure email/Slack webhooks in .env.monitoring"
    echo "  - Alerts are configured for critical system events"
    echo ""
    echo "📝 Logs:"
    echo "  - Application logs: /var/log/backend/, /var/log/frontend/"
    echo "  - Aggregated logs available in Grafana via Loki"
    echo ""
    print_warning "Remember to:"
    print_warning "1. Update .env.monitoring with your actual configuration"
    print_warning "2. Configure SMTP settings for email alerts"
    print_warning "3. Set up Slack webhooks for instant notifications"
    print_warning "4. Review and customize alert rules in monitoring/alert_rules.yml"
}

# Main execution
main() {
    echo "🚀 Starting Telegram Bot Platform Monitoring Setup"
    echo "=================================================="
    
    check_dependencies
    create_directories
    install_packages
    setup_environment
    start_monitoring
    wait_for_services
    configure_grafana
    test_monitoring
    display_info
    
    echo ""
    print_status "Setup completed successfully! 🎉"
}

# Run main function
main "$@"