#!/bin/bash

# Production Deployment Script for Telegram Bot Platform
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Please copy .env.production to .env and configure it"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

backup_data() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose exec -T postgres pg_dump -U postgres telegram_bot_platform > "$BACKUP_DIR/database.sql"
        log_success "Database backup created"
    else
        log_warning "Database container not running, skipping database backup"
    fi
    
    # Backup uploaded files
    if [ -d "./uploads" ]; then
        log_info "Backing up uploaded files..."
        cp -r ./uploads "$BACKUP_DIR/"
        log_success "Files backup created"
    fi
    
    log_success "Backup completed: $BACKUP_DIR"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build backend image
    log_info "Building backend image..."
    docker-compose build --no-cache backend
    
    # Build frontend image
    log_info "Building frontend image..."
    docker-compose build --no-cache frontend
    
    log_success "Docker images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose down
    
    # Start database and Redis first
    log_info "Starting database and Redis..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose run --rm backend npm run migrate
    
    # Start application services
    log_info "Starting application services..."
    docker-compose up -d backend frontend
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Start nginx
    log_info "Starting nginx..."
    docker-compose up -d nginx
    
    # Start log aggregation
    log_info "Starting log aggregation..."
    docker-compose up -d fluentd
    
    log_success "Services deployed successfully"
}

health_check() {
    log_info "Performing health checks..."
    
    # Check backend health
    for i in {1..30}; do
        if curl -f http://localhost/api/health &> /dev/null; then
            log_success "Backend health check passed"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "Backend health check failed after 30 attempts"
            return 1
        fi
        
        log_info "Waiting for backend to be ready... (attempt $i/30)"
        sleep 10
    done
    
    # Check frontend health
    for i in {1..30}; do
        if curl -f http://localhost/api/health &> /dev/null; then
            log_success "Frontend health check passed"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "Frontend health check failed after 30 attempts"
            return 1
        fi
        
        log_info "Waiting for frontend to be ready... (attempt $i/30)"
        sleep 10
    done
    
    log_success "All health checks passed"
}

cleanup() {
    log_info "Cleaning up unused Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log_success "Cleanup completed"
}

show_status() {
    log_info "Deployment status:"
    docker-compose ps
    
    log_info "Service logs (last 20 lines):"
    docker-compose logs --tail=20
}

rollback() {
    log_warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose down
    
    # Restore database backup if available
    if [ -f "$BACKUP_DIR/database.sql" ]; then
        log_info "Restoring database backup..."
        docker-compose up -d postgres
        sleep 30
        docker-compose exec -T postgres psql -U postgres -d telegram_bot_platform < "$BACKUP_DIR/database.sql"
    fi
    
    # Restore files backup if available
    if [ -d "$BACKUP_DIR/uploads" ]; then
        log_info "Restoring files backup..."
        rm -rf ./uploads
        cp -r "$BACKUP_DIR/uploads" ./uploads
    fi
    
    log_warning "Rollback completed. Please check the previous version manually."
}

# Main deployment process
main() {
    log_info "Starting production deployment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    backup_data
    
    # Build images
    build_images
    
    # Deploy services
    deploy_services
    
    # Perform health checks
    if ! health_check; then
        log_error "Health checks failed. Rolling back..."
        rollback
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    # Show status
    show_status
    
    log_success "Production deployment completed successfully!"
    log_info "Application is available at: http://localhost"
    log_info "API health check: http://localhost/api/health"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "backup")
        backup_data
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|health|backup|cleanup}"
        echo "  deploy   - Full production deployment (default)"
        echo "  rollback - Rollback to previous backup"
        echo "  status   - Show current deployment status"
        echo "  health   - Perform health checks"
        echo "  backup   - Create backup only"
        echo "  cleanup  - Clean up Docker resources"
        exit 1
        ;;
esac