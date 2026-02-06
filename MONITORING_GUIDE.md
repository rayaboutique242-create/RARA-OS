# RAYA Monitoring Guide

Complete guide to monitoring the RAYA API using Prometheus, Grafana, and AlertManager.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Components](#components)
3. [Metrics Available](#metrics-available)
4. [Dashboards](#dashboards)
5. [Alerts & Rules](#alerts--rules)
6. [Getting Started](#getting-started)
7. [Prometheus Queries](#prometheus-queries)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The RAYA monitoring system uses a modern observability stack:

```
┌─────────────────┐
│   RAYA API      │ 
│   (Prometheus)  │
└────────┬────────┘
         │
         ├──→ Prometheus (scrape /metrics)
         │
┌────────┴────────┐
│  Prometheus     │─────→ AlertManager ───→ Slack/Email
│  (15s interval) │
└────────┬────────┘
         │
    Grafana (Visualization)
```

## Components

### 1. Prometheus
- **Purpose**: Collects metrics from RAYA API
- **Config**: `monitoring/prometheus.yml`
- **Scrape Interval**: 15 seconds
- **Data Retention**: 30 days
- **Address**: http://localhost:9090

### 2. Grafana
- **Purpose**: Visualizes metrics via dashboards
- **Address**: http://localhost:3000
- **Default Credentials**: admin/admin
- **Dashboards**: 4 pre-configured dashboards
- **Data Source**: Prometheus (auto-configured)

### 3. AlertManager
- **Purpose**: Routes and manages alerts
- **Config**: `monitoring/alertmanager.yml`
- **Address**: http://localhost:9093
- **Channels**: Slack, Email

### 4. Node Exporter
- **Purpose**: Exports system metrics
- **Address**: http://localhost:9100
- **Metrics**: CPU, Memory, Disk, Network

## Metrics Available

### HTTP Request Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `raya_http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `raya_http_request_duration_seconds` | Histogram | Request duration in seconds (buckets: 0.01-10s) |
| `raya_http_requests_active` | Gauge | Currently active HTTP requests |

**Labels**: 
- `method`: GET, POST, PUT, DELETE, PATCH
- `route`: Normalized path (/users/:id, /tenants/:tenantId/users)
- `status`: HTTP status code

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `raya_db_query_duration_seconds` | Histogram | Query execution time |
| `raya_db_query_errors_total` | Counter | Failed database queries |
| `raya_db_connections_active` | Gauge | Active DB connections |
| `raya_db_connections_max` | Gauge | Maximum connection pool size |
| `raya_db_connection_errors_total` | Counter | Connection pool errors |

**Labels**:
- `operation`: SELECT, INSERT, UPDATE, DELETE
- `entity`: User, Tenant, Order, Product

### Cache Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `raya_cache_hits_total` | Counter | Cache hits |
| `raya_cache_misses_total` | Counter | Cache misses |
| `raya_cache_hit_rate` | Gauge | Hit rate percentage (0-100) |

**Labels**:
- `key_prefix`: users, tenants, products

### Authentication Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `raya_auth_attempts_total` | Counter | Total authentication attempts |
| `raya_auth_successes_total` | Counter | Successful authentications |
| `raya_auth_failures_total` | Counter | Failed authentications |

**Labels**:
- `strategy`: otp, password, refresh_token

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `raya_users_total` | Gauge | Total number of users |
| `raya_tenants_total` | Gauge | Total number of tenants |
| `raya_orders_total` | Gauge | Total number of orders |
| `raya_revenue_total` | Gauge | Total revenue |

## Dashboards

### 1. API Performance Dashboard
**Location**: http://localhost:3000/d/raya-api-monitoring

Shows:
- API Status (gauge)
- Request Rate (requests/sec by endpoint)
- P95 Request Latency (ms)
- Error Rate (5xx errors/sec)
- Active Requests (gauge)
- Database Query Rate (queries/sec)

### 2. Database Performance Dashboard
**Location**: http://localhost:3000/d/raya-database-monitoring

Shows:
- Connection Pool Usage (%)
- Query Duration Percentiles (P95, P50)
- Database Query Errors
- Connection Errors
- Pool Size Trends
- Operations Distribution

### 3. Business Metrics Dashboard
**Location**: http://localhost:3000/d/raya-business-metrics

Shows:
- Total Users (stat)
- Total Tenants (stat)
- Total Orders (stat)
- Total Revenue (stat)
- New Users per Day (trend)
- Orders per Day (trend)
- Daily Revenue (trend)

### 4. System Resources Dashboard
**Location**: http://localhost:3000/d/raya-system-resources

Shows:
- CPU Usage (%)
- Memory Usage (%)
- Memory Usage Over Time
- Network I/O (Bytes/sec)
- Overall System Resources

## Alerts & Rules

### Alert Rules (`monitoring/alert-rules.yml`)

**1. HighErrorRate**
- Fires when: Error rate > 5% for 5 minutes
- Severity: Warning
- Action: Notify #alerts on Slack

**2. HighLatency**
- Fires when: P95 latency > 1000ms for 10 minutes
- Severity: Warning
- Action: Notify #alerts on Slack

**3. DatabaseErrors**
- Fires when: DB error rate > 1% for 5 minutes
- Severity: Warning
- Action: Notify #alerts on Slack

**4. HighAuthFailures**
- Fires when: Auth failure rate > 10% for 5 minutes
- Severity: Warning
- Action: Notify #alerts on Slack

**5. CacheLowHitRate**
- Fires when: Cache hit rate < 60% for 10 minutes
- Severity: Info
- Action: Notify #alerts on Slack

**6. TooManyRequests**
- Fires when: Active requests > 100 for 5 minutes
- Severity: Warning
- Action: Notify #critical-alerts on Slack + Email

**7. APIDown**
- Fires when: API unreachable for 2 minutes
- Severity: Critical
- Action: Notify #critical-alerts on Slack + Email + Page On-Call

**8. HighMemoryUsage**
- Fires when: Memory > 90% for 5 minutes
- Severity: Warning
- Action: Notify #critical-alerts on Slack

## Getting Started

### 1. Start the Monitoring Stack

```bash
cd raya-backend

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### 2. Access Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **AlertManager**: http://localhost:9093
- **Node Exporter**: http://localhost:9100

### 3. Configure Slack Webhook (Optional)

Edit `monitoring/alertmanager.yml`:

```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
```

### 4. Verify API Metrics

```bash
# Check if API metrics endpoint is working
curl http://localhost:3000/metrics

# Example output:
# # HELP raya_http_requests_total Total HTTP requests
# # TYPE raya_http_requests_total counter
# raya_http_requests_total{method="GET",route="/health",status="200"} 42
```

## Prometheus Queries

### Common Queries

**1. Request Rate (requests per second)**
```promql
rate(raya_http_requests_total[5m])
```

**2. Error Rate (5xx errors per second)**
```promql
rate(raya_http_requests_total{status=~"5.."}[5m])
```

**3. P95 Latency (milliseconds)**
```promql
histogram_quantile(0.95, sum(rate(raya_http_request_duration_seconds_bucket[5m])) by (le)) * 1000
```

**4. Database Query Duration (P95)**
```promql
histogram_quantile(0.95, sum(rate(raya_db_query_duration_seconds_bucket[5m])) by (le)) * 1000
```

**5. Cache Hit Rate (%)**
```promql
sum(rate(raya_cache_hits_total[5m])) / (sum(rate(raya_cache_hits_total[5m])) + sum(rate(raya_cache_misses_total[5m]))) * 100
```

**6. Active User Sessions**
```promql
sum(rate(raya_auth_successes_total[1h]))
```

**7. Top 5 Slowest Endpoints**
```promql
topk(5, sum by (route)(rate(raya_http_request_duration_seconds_sum[5m])) / sum by (route)(rate(raya_http_request_duration_seconds_count[5m])))
```

**8. System Memory Usage**
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

**9. CPU Usage (%)**
```promql
100 - (avg by (instance)(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**10. Top Endpoints by Request Volume**
```promql
topk(10, sum by (route)(rate(raya_http_requests_total[5m])))
```

### Query Operators

- `rate()`: Per-second average (use 5m window)
- `increase()`: Total increase over time period
- `histogram_quantile()`: Calculate percentiles
- `sum()`: Aggregate metrics
- `by()`: Group by labels
- `topk()`: Top N results

## Troubleshooting

### Prometheus Not Scraping Metrics

**Problem**: Prometheus targets show "DOWN"

**Solution**:
1. Check API /metrics endpoint: `curl http://localhost:3000/metrics`
2. Verify API is running: `docker-compose logs raya-backend`
3. Check Prometheus config: `cat monitoring/prometheus.yml`
4. Restart Prometheus: `docker-compose -f docker-compose.monitoring.yml restart prometheus`

### Grafana Not Showing Data

**Problem**: Dashboards show "No data"

**Solution**:
1. Verify Prometheus datasource: Grafana → Configuration → Datasources
2. Test Prometheus connection: Click "Test" button
3. Check if metrics are being collected: http://localhost:9090/graph → Enter query
4. Increase time range in dashboard (try 1h instead of 5m)

### Alerts Not Firing

**Problem**: Alerts configured but not triggering

**Solution**:
1. Check alert rules: `http://localhost:9090/alerts`
2. Verify metrics exist: Query in Prometheus graph
3. Check AlertManager status: `http://localhost:9093`
4. Review AlertManager config: `cat monitoring/alertmanager.yml`
5. Test Slack webhook: `http://localhost:9093/#/status`

### High Memory Usage in Prometheus

**Problem**: Prometheus container consuming too much memory

**Solution**:
1. Reduce retention period in `monitoring/prometheus.yml`:
   ```yaml
   global:
     retention: 15d  # Reduce from 30d
   ```
2. Restart Prometheus:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart prometheus
   ```

### Performance: Slow Queries

Use this query to identify slow database operations:

```promql
topk(10, sum by (operation, entity)(rate(raya_db_query_duration_seconds_sum[5m])) / sum by (operation, entity)(rate(raya_db_query_duration_seconds_count[5m])))
```

### Performance: High Error Rate

Investigate with:

```promql
topk(10, sum by (route, status)(rate(raya_http_requests_total[5m])))
```

## Best Practices

1. **Review dashboards daily** during business hours
2. **Set up Slack/Email notifications** for critical alerts
3. **Keep alert thresholds realistic** (avoid spam)
4. **Use time ranges appropriately**:
   - API Performance: last 1 hour
   - Business Metrics: last 7 days
   - System Resources: last 1 hour
5. **Run regular load tests** to establish baselines
6. **Archive old data** periodically to manage storage
7. **Document custom queries** for team reference
8. **Review and update alerts** quarterly

## Support Commands

```bash
# View all running services
docker-compose -f docker-compose.monitoring.yml ps

# View service logs
docker-compose -f docker-compose.monitoring.yml logs -f [service]

# Restart a service
docker-compose -f docker-compose.monitoring.yml restart [service]

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# Clean up volumes (⚠️ DELETES DATA)
docker-compose -f docker-compose.monitoring.yml down -v

# SSH into Prometheus container
docker-compose -f docker-compose.monitoring.yml exec prometheus bash

# Check Prometheus config validity
docker-compose -f docker-compose.monitoring.yml exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Check Alert Rules validity
docker-compose -f docker-compose.monitoring.yml exec prometheus promtool check rules /etc/prometheus/alert-rules.yml
```

## Next Steps

1. Customize dashboards based on your needs
2. Add custom metrics for business logic
3. Integrate with your incident management system
4. Set up on-call rotations for critical alerts
5. Establish SLOs (Service Level Objectives)
6. Create runbooks for common issues

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
