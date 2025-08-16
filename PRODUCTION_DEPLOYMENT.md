# Production Deployment Guide

This guide covers the complete production deployment of the Telegram Bot Platform using Docker and Docker Compose.

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended) or Windows with Docker Desktop
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl (for health checks)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-bot-platform
   ```

2. **Configure environment**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

3. **Deploy**
   ```bash
   # Linux/macOS
   ./scripts/deploy-production.sh

   # Windows PowerShell
   .\scripts\deploy-production.ps1
   ```

## Configuration

### Environment Variables

Copy `.env.production` to `.env` and configure the following:

#### Database Configuration
```env
POSTGRES_DB=telegram_bot_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_postgres_password
DATABASE_URL=postgresql://postgres:your_secure_postgres_password@postgres:5432/telegram_bot_platform
```

#### Redis Configuration
```env
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_secure_redis_password
```

#### JWT Configuration
```env
JWT_SECRET=your_very_secure_jwt_secret_key_at_least_32_characters
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_key_at_least_32_characters
```

#### Email Configuration
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### Application URLs
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### SSL/HTTPS Configuration

1. **Obtain SSL certificates**
   ```bash
   # Using Let's Encrypt (recommended)
   sudo apt install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Copy certificates**
   ```bash
   mkdir -p nginx/ssl
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
   ```

3. **Update nginx configuration**
   - Uncomment SSL lines in `nginx/nginx.prod.conf`
   - Update server_name with your domain

## Deployment

### Manual Deployment

1. **Build images**
   ```bash
   docker-compose build --no-cache
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Check health**
   ```bash
   curl http://localhost/api/health
   ```

### Automated Deployment

Use the provided deployment scripts:

```bash
# Full deployment
./scripts/deploy-production.sh deploy

# Check status
./scripts/deploy-production.sh status

# Health check
./scripts/deploy-production.sh health

# Rollback
./scripts/deploy-production.sh rollback
```

## Monitoring

### Basic Monitoring

The platform includes built-in health checks:
- Backend: `http://localhost/api/health`
- Frontend: `http://localhost/api/health`
- Nginx: `http://localhost/health`

### Advanced Monitoring (Optional)

Deploy monitoring stack:

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Access monitoring services:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **AlertManager**: http://localhost:9093

## Maintenance

### Backup

```bash
# Create backup
./scripts/deploy-production.sh backup

# Manual database backup
docker-compose exec postgres pg_dump -U postgres telegram_bot_platform > backup.sql
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Deploy updates
./scripts/deploy-production.sh deploy
```

### Log Management

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Log rotation (automatic with fluentd)
docker-compose logs --tail=1000 > logs/app-$(date +%Y%m%d).log
```

### Cleanup

```bash
# Clean unused Docker resources
./scripts/deploy-production.sh cleanup

# Manual cleanup
docker system prune -a
docker volume prune
```

## Security

### Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Block direct access to application ports
sudo ufw deny 3000/tcp   # Frontend
sudo ufw deny 3001/tcp   # Backend
sudo ufw deny 5432/tcp   # PostgreSQL
sudo ufw deny 6379/tcp   # Redis
```

### Security Best Practices

1. **Use strong passwords** for all services
2. **Enable SSL/HTTPS** in production
3. **Regular security updates**
   ```bash
   sudo apt update && sudo apt upgrade
   ```
4. **Monitor logs** for suspicious activity
5. **Backup regularly** and test restore procedures
6. **Use secrets management** for sensitive data

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart service
docker-compose restart service-name
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Reset database connection
docker-compose restart postgres backend
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart

# Scale down if needed
docker-compose up -d --scale backend=1 --scale frontend=1
```

#### SSL Certificate Issues
```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Restart nginx
docker-compose restart nginx
```

### Performance Tuning

#### Database Optimization
```sql
-- Connect to database
docker-compose exec postgres psql -U postgres -d telegram_bot_platform

-- Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- Analyze tables
ANALYZE;

-- Reindex if needed
REINDEX DATABASE telegram_bot_platform;
```

#### Redis Optimization
```bash
# Check Redis info
docker-compose exec redis redis-cli info memory

# Monitor Redis commands
docker-compose exec redis redis-cli monitor
```

#### Nginx Optimization
- Enable gzip compression (already configured)
- Use CDN for static assets
- Implement caching headers (already configured)

## Scaling

### Horizontal Scaling

```yaml
# In docker-compose.yml, increase replicas
deploy:
  replicas: 3  # Scale to 3 instances
```

### Load Balancing

```bash
# Add multiple backend instances
docker-compose up -d --scale backend=3 --scale frontend=2
```

### Database Scaling

For high-traffic scenarios:
1. **Read replicas** for PostgreSQL
2. **Redis Cluster** for caching
3. **Connection pooling** (already implemented)

## Support

### Health Checks

All services include comprehensive health checks:
- **Startup probes**: Ensure services start properly
- **Liveness probes**: Restart unhealthy containers
- **Readiness probes**: Route traffic only to ready services

### Monitoring Alerts

Configure alerts for:
- High CPU/Memory usage
- Service downtime
- Database connection issues
- High error rates
- Disk space warnings

### Log Analysis

Use the included Fluentd configuration for:
- Centralized logging
- Error detection
- Performance monitoring
- Security audit trails

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup complete
- [ ] Health checks passing
- [ ] Performance testing completed
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] Team trained on deployment process

## Contact

For deployment issues or questions:
- Check logs: `docker-compose logs`
- Review health checks: `curl http://localhost/api/health`
- Monitor resources: `docker stats`
- Contact system administrator