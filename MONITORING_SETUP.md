# Monitoring and Logging Setup

This document describes the comprehensive monitoring and logging system implemented for the Telegram Bot Platform.

## Overview

The monitoring system includes:
- **Application Performance Monitoring (APM)** with Prometheus metrics
- **Centralized Logging** with Fluentd and Loki
- **Real-time Alerting** with AlertManager
- **Visualization** with Grafana dashboards
- **Health Checks** and readiness probes
- **Distributed Tracing** capabilities

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   Prometheus    │───▶│    Grafana      │
│   (Metrics)     │    │   (Metrics)     │    │ (Visualization) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│  AlertManager   │
│     (Logs)      │    │   (Alerting)    │
└─────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐    ┌─────────────────┐
│    Fluentd      │───▶│      Loki       │
│ (Log Aggregation)│    │ (Log Storage)   │
└─────────────────┘    └─────────────────┘
```

## Components

### 1. Application Metrics (Prometheus)

**Location**: `backend/src/middleware/metricsMiddleware.ts`

**Metrics Collected**:
- HTTP request duration and count
- Active connections
- Database query performance
- Redis operation performance
- Business metrics (registrations, payments, etc.)
- Error rates and types

**Endpoints**:
- `/metrics` - Prometheus metrics endpoint
- `/health` - Comprehensive health check
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### 2. Structured Logging (Winston)

**Location**: `backend/src/utils/logger.ts`

**Features**:
- Structured JSON logging
- Multiple log levels (error, warn, info, http, debug)
- Request correlation with unique IDs
- Sensitive data sanitization
- Performance logging
- Security event logging

**Log Formats**:
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "message": "User registration successful",
  "service": "auth",
  "requestId": "req-123-456",
  "userId": "user-789",
  "meta": {
    "email": "user@example.com",
    "duration": 150
  }
}
```

### 3. Log Aggregation (Fluentd)

**Location**: `fluentd/fluent.conf`

**Features**:
- Multi-source log collection
- Real-time log processing
- Error detection and alerting
- Security event monitoring
- Performance issue detection
- Log routing and filtering

**Sources**:
- Backend application logs
- Frontend application logs
- Nginx access/error logs
- PostgreSQL logs
- Redis logs
- Docker container logs
- System logs (journald)

### 4. Alerting (AlertManager)

**Location**: `monitoring/alertmanager.yml`

**Alert Categories**:
- **Critical**: Service down, database issues, high error rates
- **Warning**: High resource usage, slow responses
- **Info**: Low registration rates, business metrics

**Notification Channels**:
- Email (SMTP)
- Slack webhooks
- Custom webhooks

### 5. Visualization (Grafana)

**Dashboards**:
- **Application Overview**: Request rates, response times, error rates
- **Business Metrics**: User registrations, payments, module activations
- **Infrastructure**: CPU, memory, disk usage
- **Database**: Query performance, connection pools
- **Logs**: Centralized log viewing and searching

## Setup Instructions

### Quick Setup (Recommended)

**Windows**:
```powershell
.\scripts\setup-monitoring.ps1
```

**Linux/macOS**:
```bash
chmod +x scripts/setup-monitoring.sh
./scripts/setup-monitoring.sh
```

### Manual Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install winston prom-client uuid ioredis express-rate-limit
   ```

2. **Create Log Directories**:
   ```bash
   mkdir -p logs/{backend,frontend,nginx,postgresql,redis,fluentd}
   ```

3. **Configure Environment**:
   ```bash
   cp .env.monitoring.example .env.monitoring
   # Edit .env.monitoring with your settings
   ```

4. **Start Monitoring Stack**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
   ```

## Configuration

### Environment Variables

Create `.env.monitoring` file:

```env
# Monitoring Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123
PROMETHEUS_RETENTION=30d

# Alert Configuration
DEFAULT_ALERT_EMAIL=admin@yourdomain.com
CRITICAL_ALERT_EMAIL=critical@yourdomain.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_FROM=alerts@yourdomain.com

# Slack Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SECURITY_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SECURITY/WEBHOOK
ERROR_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/ERROR/WEBHOOK
```

### Custom Alerts

Edit `monitoring/alert_rules.yml` to add custom alerts:

```yaml
- alert: CustomBusinessAlert
  expr: increase(telegram_bot_platform_payment_transactions_total{status="failed"}[10m]) > 5
  for: 1m
  labels:
    severity: warning
    team: business
  annotations:
    summary: "High payment failure rate"
    description: "More than 5 payment failures in 10 minutes"
```

## Access URLs

After setup, access the monitoring tools:

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Loki**: http://localhost:3100

## Usage Examples

### Adding Custom Metrics

```typescript
import { recordBusinessEvent, recordApplicationError } from '../middleware/metricsMiddleware';

// Record business event
recordBusinessEvent('user_registration', { userId, email });

// Record application error
recordApplicationError('validation_error', 'auth_service');
```

### Structured Logging

```typescript
import { createServiceLogger, logBusinessEvent, logSecurityEvent } from '../utils/logger';

const logger = createServiceLogger('payment');

// Business event
logBusinessEvent('payment_completed', {
  userId,
  amount,
  currency: 'USD',
  paymentMethod: 'stripe'
});

// Security event
logSecurityEvent('failed_login_attempt', {
  email,
  ip: req.ip,
  userAgent: req.get('User-Agent')
});
```

### Performance Monitoring

```typescript
import { logPerformance } from '../utils/logger';

const startTime = Date.now();
// ... perform operation
logPerformance('database_query', startTime, { table: 'users', operation: 'select' });
```

## Alert Rules

### Critical Alerts
- Service down (1 minute)
- Database connection failure (1 minute)
- High error rate >20% (2 minutes)
- Critical resource usage >95% (2 minutes)

### Warning Alerts
- High response time >1s (5 minutes)
- High resource usage >80% (5 minutes)
- Payment failures >5 in 10 minutes
- Telegram API errors >10 in 5 minutes

### Info Alerts
- Low user registration rate <1/hour for 2 hours
- Container restarts

## Log Retention

- **Application logs**: 30 days (configurable)
- **Metrics**: 30 days (configurable)
- **Alerts**: 7 days
- **Grafana dashboards**: Persistent

## Security Considerations

1. **Log Sanitization**: Sensitive data (passwords, tokens) is automatically redacted
2. **Access Control**: Grafana requires authentication
3. **Network Security**: All services run in isolated Docker network
4. **Data Encryption**: Logs can be encrypted at rest (configure in Loki)

## Troubleshooting

### Common Issues

1. **Services not starting**:
   ```bash
   docker-compose -f docker-compose.monitoring.yml logs
   ```

2. **Metrics not appearing**:
   - Check `/metrics` endpoint: http://localhost:3001/metrics
   - Verify Prometheus targets: http://localhost:9090/targets

3. **Alerts not firing**:
   - Check AlertManager: http://localhost:9093
   - Verify SMTP configuration in `.env.monitoring`

4. **Logs not appearing**:
   - Check Fluentd logs: `docker logs telegram-bot-platform-fluentd`
   - Verify log file permissions

### Performance Tuning

1. **High log volume**: Adjust sampling rates in `fluentd/fluent.conf`
2. **Memory usage**: Increase Docker memory limits
3. **Disk space**: Configure log rotation and retention policies

## Maintenance

### Regular Tasks

1. **Update dashboards**: Import new dashboard configurations
2. **Review alerts**: Adjust thresholds based on usage patterns
3. **Clean old data**: Configure retention policies
4. **Update configurations**: Keep monitoring configs in sync with application changes

### Backup

Important files to backup:
- `monitoring/` directory (configurations)
- `.env.monitoring` (environment settings)
- Grafana dashboards (exported JSON)
- Alert rules and configurations

## Integration with CI/CD

Add monitoring checks to your deployment pipeline:

```yaml
# Example GitHub Actions step
- name: Health Check
  run: |
    curl -f http://localhost:3001/health || exit 1
    curl -f http://localhost:9090/-/ready || exit 1
```

## Support

For issues with the monitoring setup:
1. Check the troubleshooting section above
2. Review Docker logs for specific services
3. Verify network connectivity between services
4. Check resource usage and limits

## Future Enhancements

Planned improvements:
- Distributed tracing with Jaeger
- Custom business dashboards
- Automated anomaly detection
- Integration with external monitoring services
- Mobile app for alerts