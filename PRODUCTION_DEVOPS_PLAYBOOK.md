# 🛡️ StockSmart AI — Production DevOps Playbook & Infrastructure Guide

This playbook outlines the operational architecture, health monitoring protocols, multi-region database backup schedule, zero-downtime blue-green deployments, secrets storage strategy, and automated fallback/rollback runbooks for **StockSmart AI**.

---

## 🏗️ 1. Architecture Overview

StockSmart AI is designed as a full-stack high-concurrency Node/Express service paired with a React frontend, compiled into a single CJS bundle using Vite and esbuild. 

* **Container Port**: Configured strictly to run on **Port 3000** under an Alpine Node base image.
* **Database**: PostgreSQL with persistent write-ahead logging (WAL) storage.
* **Caching Layer**: Redis for high-throughput machine learning ensemble predictions and ONDC marketplace requests.

---

## 🚦 2. Health Checks & Probes

To integrate with cloud ingress controllers, Kubernetes, or Google Cloud Run, the application exposes optimized API probes.

### Liveness Probe (`/api/health`)
* **Purpose**: Indicates if the container needs to be restarted.
* **Response**: `{"status": "ok", "timestamp": "..."}` with standard HTTP 200.

### Readiness Probe (`/api/health/readiness`)
* **Purpose**: Indicates if the container is ready to accept production traffic (verifies database & cache sockets are connected).
* **Internal Check Flow**:
  1. Ping the PostgreSQL pool.
  2. Ping the Redis cluster.
  3. Respond 200 if OK; 503 Service Unavailable if downstream channels are blocked.

---

## ⚡ 3. Zero-Downtime Blue-Green Deployment Strategy

To prevent active POS checkouts or customer marketplace purchases from dropping during releases, we use a fully automated **Blue-Green** pattern:

```
                  [ Ingress / DNS Router ]
                             │
            ┌────────────────┴────────────────┐
            ▼ (Active)                        ▼ (Standby)
     ┌─────────────┐                   ┌─────────────┐
     │  Revision   │                   │  Revision   │
     │  "Blue"     │                   │  "Green"    │
     │  (v1.0.0)   │                   │  (v1.1.0)   │
     └─────────────┘                   └─────────────┘
```

### Steps Executed by the CI/CD Pipeline:
1. **Deploy Standby**: Push the new container build to GCP Cloud Run / ECS as a standby revision (e.g., `Green`) with **0% traffic allocation**.
2. **Warm-up Probe**: Execute internal smoke tests against the isolated `Green` URL.
3. **Traffic Shift**: Update the traffic routing allocation programmatically:
   ```bash
   gcloud run services update-traffic stocksmartai --to-revisions=stocksmartai-green=100
   ```
4. **Gradual Rollout**: The platform handles progressive load switching (or instant swap in < 1 second).

---

## 🔍 4. Monitoring, Logging, and Alerts

### Log Aggregation
All server stdout/stderr logs are written in **JSON Lines (JSONL)** format, allowing effortless parsing by FluentBit, Winston, CloudWatch, or Google Cloud Logging.
* **Format**: `{"level":"info","message":"POS transaction completed","txId":"T1001","timestamp":"2026-07-01T..."}`

### Core Prometheus Metrics & Alerts
The application exposes custom Prometheus indicators at `/metrics`:
* `stocksmart_sales_total`: Counter for successful sales records.
* `stocksmart_forecast_calc_duration_seconds`: Histogram measuring machine learning calculation latencies.
* `stocksmart_expiry_warning_count`: Gauge of active batches near critical expiry window.

### Alerting Conditions (Slack / PagerDuty Triggers):
* **Downstream Error Spike**: `sum(rate(http_requests_total{status=~"5.."}[5m])) > 1%` of total traffic.
* **Memory Exhaustion Alert**: `container_memory_usage_bytes / container_spec_memory_limit_bytes > 85%` for 3 consecutive minutes.
* **Database Connection Pool Exhaustion**: `pg_pool_active_connections > 90%` of configured max connection limit.

---

## 🔒 5. Production Secrets & Security Compliance

To maintain robust security controls (under OWASP Top 10 and SOC2 guidance), secrets **MUST NEVER** be hardcoded or checked into Git repositories.

### Storage Matrix:
* **Cloud Run / Kubernetes**: Mount secrets using **Google Secret Manager** or **AWS Secrets Manager** as environment variables injected at startup.
* **CI/CD Keys**: Store deployment service accounts and registry passwords securely inside **GitHub Encrypted Secrets**.
* **Database Credentials**: Encrypt all credentials inside `.env.production` files which are included in `.gitignore`.

---

## 💾 6. Automated Backup & Recovery Runbook

### Continuous Backup Operations
Our databases execute daily snapshots and automated WAL-G archival backups:
* **Storage Location**: Cloud Storage Buckets (S3/GCS) configured with **Object Versioning** and a **30-day retention lifecycle rule**.
* **Frequency**: Full logical backups every 24 hours at 02:00 IST (during store down hours) + continuous Write-Ahead Log streaming for point-in-time recovery (PITR).

### Restore Runbook (PostgreSQL Disaster Recovery):
In the event of database failure or corrupted state:
1. Provision a clean staging instance or isolate the target cluster.
2. Download the latest daily snapshot from the backup bucket:
   ```bash
   gcloud storage cp gs://stocksmartai-backups/db/daily-latest.dump /tmp/db.dump
   ```
3. Restore the schema and data contents:
   ```bash
   pg_restore -h localhost -U stocksmart_user -d stocksmart_db -v --clean /tmp/db.dump
   ```
4. Verify application data consistency via liveness checks.

---

## 🔄 7. Automated Rollback Protocol

If post-deployment telemetry monitors trigger alarms (e.g. error rate peaks or latency climbs), execute the automatic rollback:

```bash
# 1. Immediately swap 100% of ingress routing back to the stable preceding revision
gcloud run services update-traffic stocksmartai --to-revisions=stocksmartai-blue=100

# 2. Add an annotation to the failed release tag in Github
git tag -a failed-v1.1.0 -m "Rolled back due to high 500 error count"
git push origin failed-v1.1.0

# 3. Pull failed logs for post-mortem analysis
# gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50
```
