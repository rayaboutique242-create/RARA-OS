# RAYA Production Deployment Guide
# ============================================================

## 📋 Pre-Deployment Checklist

### 1. Docker Installation ✅
- [ ] Docker Desktop installed and running
- [ ] `docker --version` returns version >= 24.0
- [ ] `docker compose --version` returns version >= 2.0
- [ ] WSL2 configured (Windows) with sufficient memory (8GB+)

### 2. Environment Configuration
- [ ] `.env.production` created with all required variables
- [ ] All secrets replaced (JWT, STRIPE, SENDGRID, AWS, etc.)
- [ ] Database credentials secured in secrets manager
- [ ] SSL certificates prepared

### 3. Database Preparation
- [ ] PostgreSQL migration scripts ready
- [ ] Run: `npm run migration:run` before first deploy
- [ ] RLS (Row-Level Security) policies configured
- [ ] Backup strategy tested

### 4. Infrastructure
- [ ] SSL/TLS certificates obtained (Let's Encrypt, AWS ACM, etc.)
- [ ] Nginx/Traefik reverse proxy configured
- [ ] Firewall rules set up
- [ ] DNS A records pointing to server

### 5. Monitoring & Logging
- [ ] Sentry configured for error tracking
- [ ] ELK Stack or CloudWatch for logs
- [ ] Prometheus for metrics
- [ ] Healthcheck endpoints configured

---

## 🚀 Deployment Steps

### Step 1: Prepare Server
```bash
# SSH into production server
ssh user@your-production-server.com

# Clone repository
git clone https://github.com/your-org/raya-backend.git
cd raya-backend

# Copy production environment
cp .env.example .env.production
# Edit with actual values
nano .env.production
```

### Step 2: Build Docker Images
```bash
# Build API image
docker build -t raya-api:latest .

# Or use compose to build all services
docker compose -f docker-compose.prod.yml build
```

### Step 3: Run Migrations
```bash
# Start containers
docker compose -f docker-compose.prod.yml up -d

# Wait 10 seconds for PostgreSQL to be ready
sleep 10

# Run migrations
docker compose -f docker-compose.prod.yml exec api npm run migration:run

# Verify database
docker compose -f docker-compose.prod.yml exec postgres psql -U raya_user -d raya_prod -c "\dt"
```

### Step 4: Verify Services
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f api

# Test health endpoint
curl -s http://localhost:3000/health | jq .
```

### Step 5: Configure Reverse Proxy (Nginx)
```bash
# Example Nginx config at /etc/nginx/sites-available/raya-api
```

### Step 6: Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d api.your-domain.com

# Configure Nginx to use SSL certificate
```

### Step 7: Start Production Services
```bash
# Start all services in background
docker compose -f docker-compose.prod.yml up -d

# Check all services are running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🧪 Post-Deployment Validation

### Run API Test Suite
```bash
# Run PowerShell test script
powershell -ExecutionPolicy Bypass -File "scripts/run_api_tests.ps1"

# Check results
cat api_test_report.json | jq .
```

### Expected Test Results
```json
{
  "passed": 8,
  "failed": 0,
  "tests": [
    { "name": "health", "ok": true },
    { "name": "auth/login", "ok": true },
    { "name": "auth/me", "ok": true },
    { "name": "products/list", "ok": true },
    { "name": "products/create", "ok": true },
    { "name": "orders/create", "ok": true },
    { "name": "payments/create", "ok": true },
    { "name": "notifications/send", "ok": true }
  ]
}
```

---

## 🔒 Security Hardening

### Docker Security
```bash
# Verify no privileged containers
docker compose -f docker-compose.prod.yml exec api whoami
# Should output: node (not root)

# Check read-only filesystem
docker compose -f docker-compose.prod.yml exec api touch /test.txt
# Should fail: Read-only file system
```

### Network Security
- [ ] Database only accessible from API container
- [ ] Redis only accessible from API container
- [ ] API only accessible via nginx reverse proxy
- [ ] No direct port exposure except 80/443

### Secrets Management
- [ ] All sensitive data in `.env.production` (never committed)
- [ ] Use GitHub Secrets for CI/CD
- [ ] Rotate JWT secrets quarterly
- [ ] Rotate database passwords regularly

---

## 📊 Monitoring Setup

### Healthcheck Monitoring
```bash
# Monitor health endpoint
watch -n 5 'curl -s http://localhost:3000/health | jq .'

# Or with uptime tracking
crontab -e
# Add: */5 * * * * curl -s http://your-domain.com/health || alert-admin
```

### Log Aggregation
```bash
# View real-time logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Export logs to file
docker compose -f docker-compose.prod.yml logs > logs/$(date +%Y%m%d_%H%M%S).log
```

### Performance Metrics
```bash
# Monitor container resource usage
docker stats raya_api_prod --no-stream

# Check database performance
docker compose -f docker-compose.prod.yml exec postgres psql -U raya_user -d raya_prod -c "SELECT * FROM pg_stat_statements LIMIT 10;"
```

---

## 🔄 Backup & Recovery

### Automated Daily Backups
```bash
# Create backup script (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U raya_user raya_prod > /backups/db_$DATE.sql
tar -czf /backups/redis_$DATE.tar.gz /var/lib/docker/volumes/postgres_data
echo "Backup completed: $DATE"

# Schedule with cron
0 2 * * * /path/to/backup.sh
```

### Database Recovery
```bash
# Stop API service
docker compose -f docker-compose.prod.yml stop api

# Restore from backup
docker compose -f docker-compose.prod.yml exec postgres psql -U raya_user raya_prod < /backups/db_YYYYMMDD_HHMMSS.sql

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

---

## 🆘 Troubleshooting

### Container Won't Start
```bash
docker compose -f docker-compose.prod.yml logs api
# Look for errors in output
# Common issues: Port already in use, insufficient memory, DNS resolution
```

### Database Connection Issues
```bash
# Test connection from API container
docker compose -f docker-compose.prod.yml exec api psql -h postgres -U raya_user -d raya_prod

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres
```

### High Memory Usage
```bash
# Check container memory limits
docker stats

# Increase if needed in docker-compose.prod.yml:
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

### Redis Connection Timeout
```bash
# Verify redis is running
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check password authentication
docker compose -f docker-compose.prod.yml exec redis redis-cli -a "your_password" ping
```

---

## 📈 Scaling for Production

### Horizontal Scaling (Multiple API instances)
```yaml
services:
  api:
    deploy:
      replicas: 3  # Run 3 instances
  
  # Load balancer needed (Nginx upstream, Traefik, etc.)
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_orders_tenant_user ON orders(tenant_id, user_id);
CREATE INDEX idx_products_tenant_active ON products(tenant_id, is_active);

-- Enable connection pooling (PgBouncer)
```

### Redis Optimization
```bash
# Use Redis Cluster for high availability
# Configure Sentinel for automatic failover
# Monitor memory usage and eviction policies
```

---

## ✅ Final Checklist

- [ ] All tests passing (8/8)
- [ ] API responding to requests
- [ ] Database migrations executed
- [ ] SSL/TLS working correctly
- [ ] Backups running automatically
- [ ] Monitoring/alerting configured
- [ ] Team trained on deployment process
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested
- [ ] Performance baseline established

---

## 📞 Support & Escalation

- **API Issues**: Check logs with `docker compose -f docker-compose.prod.yml logs api`
- **Database Issues**: Connect to postgres container and investigate
- **Infrastructure Issues**: Check Docker daemon status and server resources
- **Critical Issues**: Execute rollback to previous working version

---

Generated: 2026-02-01
RAYA SaaS Deployment Guide v1.0
