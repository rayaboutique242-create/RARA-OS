# RAYA Monitoring Examples & Commands

Quick reference for common monitoring tasks and queries.

## Quick Commands

### Start/Stop Monitoring Stack

```bash
# Navigate to project
cd raya-backend

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Stop all services
docker-compose -f docker-compose.monitoring.yml down

# View running services
docker-compose -f docker-compose.monitoring.yml ps

# View logs for all services
docker-compose -f docker-compose.monitoring.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f alertmanager

# Restart a service
docker-compose -f docker-compose.monitoring.yml restart prometheus

# Update and restart all services
docker-compose -f docker-compose.monitoring.yml pull
docker-compose -f docker-compose.monitoring.yml up -d
```

## Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Prometheus | http://localhost:9090 | None (public) |
| Grafana | http://localhost:3000 | admin / admin |
| AlertManager | http://localhost:9093 | None (public) |
| Node Exporter | http://localhost:9100 | None (public) |
| RAYA API Metrics | http://localhost:3000/metrics | (API running) |

## Useful URLs in Prometheus

- Home: http://localhost:9090
- Targets (scrape status): http://localhost:9090/targets
- Alerts (current): http://localhost:9090/alerts
- Alert Rules: http://localhost:9090/rules
- Graph Explorer: http://localhost:9090/graph
- Service Discovery: http://localhost:9090/service-discovery

## Useful URLs in Grafana

- Home: http://localhost:3000
- API Performance Dashboard: http://localhost:3000/d/raya-api-monitoring
- Database Dashboard: http://localhost:3000/d/raya-database-monitoring
- Business Metrics Dashboard: http://localhost:3000/d/raya-business-metrics
- System Resources Dashboard: http://localhost:3000/d/raya-system-resources
- Explore Metrics: http://localhost:3000/explore

## Prometheus Query Examples

### Basic Queries

**1. API Health Check**
```promql
up{job="raya-api"}
```
Returns: 1 (up) or 0 (down)

**2. Total Requests in Last Hour**
```promql
increase(raya_http_requests_total[1h])
```

**3. Requests Per Second (Last 5 Minutes)**
```promql
rate(raya_http_requests_total[5m])
```

**4. Current Active Requests**
```promql
sum(raya_http_requests_active)
```

### Performance Analysis

**5. Average Response Time (Last 5 Minutes)**
```promql
sum(rate(raya_http_request_duration_seconds_sum[5m])) by (route) / 
sum(rate(raya_http_request_duration_seconds_count[5m])) by (route)
```

**6. P95 Request Latency**
```promql
histogram_quantile(0.95, 
  sum(rate(raya_http_request_duration_seconds_bucket[5m])) by (le)
) * 1000
```

**7. P99 Request Latency**
```promql
histogram_quantile(0.99, 
  sum(rate(raya_http_request_duration_seconds_bucket[5m])) by (le)
) * 1000
```

**8. Top 10 Slowest Endpoints**
```promql
topk(10, 
  sum(rate(raya_http_request_duration_seconds_sum[5m])) by (route) / 
  sum(rate(raya_http_request_duration_seconds_count[5m])) by (route)
)
```

### Error Analysis

**9. Error Rate (Last 5 Minutes)**
```promql
sum(rate(raya_http_requests_total{status=~"5.."}[5m])) / 
sum(rate(raya_http_requests_total[5m])) * 100
```

**10. 5xx Errors Per Endpoint**
```promql
sum by (route)(rate(raya_http_requests_total{status=~"5.."}[5m]))
```

**11. 4xx Errors Per Endpoint**
```promql
sum by (route)(rate(raya_http_requests_total{status=~"4.."}[5m]))
```

**12. Errors by Status Code**
```promql
sum by (status)(rate(raya_http_requests_total[5m]))
```

### Database Monitoring

**13. Average Query Duration**
```promql
sum(rate(raya_db_query_duration_seconds_sum[5m])) by (operation) / 
sum(rate(raya_db_query_duration_seconds_count[5m])) by (operation)
```

**14. Database Error Rate**
```promql
rate(raya_db_query_errors_total[5m])
```

**15. Active Database Connections**
```promql
sum(raya_db_connections_active)
```

**16. Connection Pool Usage (%)**
```promql
sum(raya_db_connections_active) / sum(raya_db_connections_max) * 100
```

**17. Slowest Database Operations**
```promql
topk(5, 
  sum by (operation)(rate(raya_db_query_duration_seconds_sum[5m])) / 
  sum by (operation)(rate(raya_db_query_duration_seconds_count[5m]))
)
```

### Cache Monitoring

**18. Cache Hit Rate (%)**
```promql
sum(rate(raya_cache_hits_total[5m])) / 
(sum(rate(raya_cache_hits_total[5m])) + sum(rate(raya_cache_misses_total[5m]))) * 100
```

**19. Hits vs Misses**
```promql
sum(rate(raya_cache_hits_total[5m]))
```

```promql
sum(rate(raya_cache_misses_total[5m]))
```

### Authentication Monitoring

**20. Auth Success Rate (%)**
```promql
sum(rate(raya_auth_successes_total[5m])) / 
sum(rate(raya_auth_attempts_total[5m])) * 100
```

**21. Login Attempts Per Strategy**
```promql
sum by (strategy)(rate(raya_auth_attempts_total[5m]))
```

**22. Failed Auth Attempts**
```promql
rate(raya_auth_failures_total[5m])
```

### Business Metrics

**23. Total Users (Now)**
```promql
raya_users_total
```

**24. New Users Today**
```promql
increase(raya_users_total[1d])
```

**25. User Growth (Last 7 Days)**
```promql
increase(raya_users_total[7d]) / 7
```

**26. Total Revenue**
```promql
raya_revenue_total
```

**27. Daily Revenue**
```promql
increase(raya_revenue_total[1d])
```

**28. Average Order Value**
```promql
raya_revenue_total / raya_orders_total
```

### System Metrics

**29. CPU Usage (%)**
```promql
100 - (avg by (instance)(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**30. Memory Usage (%)**
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

**31. Disk Usage (%)**
```promql
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

**32. Network Transmit Rate (Bytes/sec)**
```promql
rate(node_network_transmit_bytes_total[5m])
```

**33. Network Receive Rate (Bytes/sec)**
```promql
rate(node_network_receive_bytes_total[5m])
```

## Dashboard Navigation Tips

### API Performance Dashboard
1. **Status Gauge**: Shows if API is up (1) or down (0)
2. **Request Rate**: Graph shows requests/sec - hover for exact values
3. **Latency**: P95 latency should typically be < 500ms
4. **Error Rate**: Should be < 1% in normal operation
5. **Active Requests**: Keep this below 100 concurrently

### Database Dashboard
1. **Pool Usage**: Should stay < 80% for healthy state
2. **Query Duration**: P95 should be < 100ms for typical queries
3. **Connection Errors**: Should be zero in normal operation
4. **Operations**: Shows which operations (SELECT/INSERT/UPDATE) are most frequent

### Business Metrics Dashboard
1. **Use time range: Last 7 Days** for trend analysis
2. **Stats cards**: Show current totals (click to set drill-down)
3. **Trends**: Look for growth patterns or anomalies
4. **Revenue**: Use for capacity planning

### System Resources Dashboard
1. **Gauges**: Show current state (green = healthy, yellow/red = alert)
2. **Memory**: Watch for steady increase (memory leak?)
3. **Network**: Spikes may indicate high traffic or DDoS
4. **CPU**: Should correlate with request rates

## Grafana Configuration Tips

### Add a Panel to Dashboard

1. Go to dashboard
2. Click "Add panel" → "Add a new panel"
3. Select datasource: "Prometheus"
4. Enter query: `rate(raya_http_requests_total[5m])`
5. Set title, description
6. Configure visualization (Graph, Stat, Gauge, etc.)
7. Save dashboard

### Create Custom Dashboard

1. Click "+" in sidebar → "Dashboard"
2. Click "Add panel"
3. Add queries and visualizations
4. Customize colors, thresholds, units
5. Save with name: "RAYA [Your Dashboard Name]"

### Set Alert on Panel

1. Edit panel → "Alert" tab
2. Configure condition: ` > 0.05` (5% error rate)
3. For: `5m` (alert after 5 minutes)
4. Set notification channel
5. Save panel

## Common Troubleshooting Queries

### Is the API running?
```promql
up{job="raya-api"} == 1
```

### What's the error rate right now?
```promql
sum(rate(raya_http_requests_total{status=~"5.."}[1m])) / 
sum(rate(raya_http_requests_total[1m])) * 100
```

### Which endpoint is slowest?
```promql
topk(1, 
  sum(rate(raya_http_request_duration_seconds_sum[5m])) by (route) / 
  sum(rate(raya_http_request_duration_seconds_count[5m])) by (route)
)
```

### Is database connection pooling working?
```promql
sum(raya_db_connections_active) / sum(raya_db_connections_max)
```

### Are there any auth attacks?
```promql
rate(raya_auth_failures_total[1m]) > 10
```

## Export Metrics

### Export Prometheus Data

```bash
# Get raw metrics from API
curl -s http://localhost:3000/metrics > metrics.txt

# Get metrics in JSON (for programmatic access)
curl -s http://localhost:3000/metrics/json | jq . > metrics.json

# Query Prometheus API
curl -s 'http://localhost:9090/api/v1/query?query=up{job="raya-api"}'

# Export time series for date range
curl -s 'http://localhost:9090/api/v1/query_range?query=raya_http_requests_total&start=1704067200&end=1704153600&step=60'
```

### Prometheus API Documentation

Base URL: `http://localhost:9090/api/v1`

- `/query` - Instant query
- `/query_range` - Range query
- `/label/__name__/values` - Get all metric names
- `/series` - Find series matching label matchers

## Backup/Restore

### Backup Prometheus Data

```bash
# Create backup directory
mkdir -p backup

# Backup using Docker volume
docker run --rm \
  -v prometheus_data:/data \
  -v $(pwd)/backup:/backup \
  busybox cp -r /data /backup/prometheus_$(date +%Y%m%d)
```

### Restore Prometheus Data

```bash
# Stop Prometheus
docker-compose -f docker-compose.monitoring.yml stop prometheus

# Clear existing data
docker volume rm prometheus_data

# Create new volume
docker volume create prometheus_data

# Restore data
docker run --rm \
  -v prometheus_data:/data \
  -v $(pwd)/backup/prometheus_YYYYMMDD:/backup \
  busybox cp -r /backup/data/* /data/

# Restart Prometheus
docker-compose -f docker-compose.monitoring.yml start prometheus
```

## Performance Testing

### Simulate High Load
```bash
# Using Apache Bench (ab)
ab -n 10000 -c 100 http://localhost:3000/health

# Using wrk (better tool)
# Install: https://github.com/wg/wrk
wrk -t4 -c100 -d30s http://localhost:3000/health
```

### Monitor During Load Test
1. Open Grafana: http://localhost:3000/d/raya-api-monitoring
2. Set time range to "Last 1 minute"
3. Run load test
4. Watch Request Rate and Latency spike
5. Review error rates

## Alert Testing

### Test Alert Email/Slack

```bash
# SSH into AlertManager
docker-compose -f docker-compose.monitoring.yml exec alertmanager sh

# Send test alert (from inside container)
amtool alert add TestAlert severity=warning
```

### Manually Fire Alert

```bash
# Query that violates condition (for testing)
# 1. Go to Prometheus: http://localhost:9090/alerts
# 2. Edit rule to have lower threshold temporarily
# 3. Wait for evaluation (usually 15 seconds)
# 4. Alert should fire to Slack
```

## Documentation

For more detailed information, see:
- `MONITORING_GUIDE.md` - Complete user guide
- `MONITORING_IMPLEMENTATION.md` - Technical implementation details
- `monitoring/prometheus.yml` - Prometheus configuration
- `monitoring/alert-rules.yml` - Alert rules definitions
- `monitoring/alertmanager.yml` - Alert routing configuration

## Next Actions

1. ✅ Start monitoring: `docker-compose -f docker-compose.monitoring.yml up -d`
2. ✅ Access Grafana: http://localhost:3000
3. ✅ Review dashboards
4. ✅ Configure Slack webhook (optional)
5. ✅ Test alert firing
6. ⏭️ Proceed to **Suggestion #4: API Documentation**

