---
title: Monitoring — Prometheus & Grafana
summary: Metrics for the whole homelab — how Prometheus scrapes, node_exporter on every machine, a Docker Compose stack, PromQL you will actually use, alert rules, Grafana dashboards, and fixing targets that are DOWN
tags: [monitoring, prometheus, grafana, node_exporter, promql, alertmanager, metrics, dashboard, exporter, observability, docker compose, alerts]
order: 8
---

> Prometheus collects numbers over time, Grafana draws them. Together they answer "is everything OK?" and "what changed at 03:00?" without logging in to every box.

## 🧠 How it fits together

```text
 node_exporter :9100 ─┐
 node_exporter :9100 ─┤  scrape (HTTP GET /metrics every 15 s)
 cAdvisor      :8080 ─┼──────────────► Prometheus :9090 ──► Grafana :3000
 other exporters      ─┘                  │  (time-series DB)   (dashboards)
                                          └──► Alertmanager :9093 ──► mail / chat
```

| Piece | Job |
|---|---|
| **Exporter** | exposes metrics as plain text on `/metrics` |
| **Prometheus** | **pulls** (scrapes) targets on a schedule, stores time series, evaluates alert rules |
| **PromQL** | the query language |
| **Alertmanager** | groups, silences and delivers alerts |
| **Grafana** | dashboards on top of Prometheus (and many other sources) |

Pull-based means Prometheus must be able to **reach each target's port** — remember that when writing firewall rules.

The three pillars of observability: **metrics** (numbers — this page), **logs** (events — Loki, journald), **traces** (a request's path through services).

### Metric types

| Type | Behaviour | Example | Query it with |
|---|---|---|---|
| **Counter** | only goes up (resets on restart) | `node_network_receive_bytes_total` | `rate()` / `increase()` |
| **Gauge** | goes up and down | `node_memory_MemAvailable_bytes` | as it is, `avg_over_time()` |
| **Histogram** | counts observations in buckets | `http_request_duration_seconds_bucket` | `histogram_quantile()` |
| **Summary** | pre-computed quantiles | `go_gc_duration_seconds` | as it is |

A time series = metric name + **labels**: `node_cpu_seconds_total{instance="pve:9100", cpu="0", mode="idle"}`.

## 📥 Step 1 — node_exporter on every Linux machine

```bash
sudo apt install -y prometheus-node-exporter
systemctl status prometheus-node-exporter
curl -s http://localhost:9100/metrics | head
```

That is all: a systemd service on port **9100**. Allow only the monitoring host to reach it:

```bash
sudo ufw allow from 192.168.1.5 to any port 9100 proto tcp
```

Other useful exporters:

| Exporter | Port | Watches |
|---|---|---|
| node_exporter | 9100 | Linux host: CPU, RAM, disk, network |
| windows_exporter | 9182 | Windows hosts |
| cAdvisor | 8080 | per-container usage |
| blackbox_exporter | 9115 | "is this URL / port / ping reachable from outside?" |
| pve-exporter | 9221 | Proxmox VE nodes and guests |
| snmp_exporter | 9116 | switches, routers, UPS |

## 🐳 Step 2 — Prometheus + Grafana with Docker Compose

```text
monitoring/
├── compose.yaml
├── prometheus.yml
└── alerts.yml
```

```yaml
# compose.yaml
services:
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alerts.yml:/etc/prometheus/alerts.yml:ro
      - prom-data:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=30d

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  prom-data:
  grafana-data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - alerts.yml

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: node
    static_configs:
      - targets:
          - 192.168.1.10:9100
          - 192.168.1.20:9100
          - 192.168.1.21:9100
        labels:
          env: homelab
```

```bash
docker compose up -d
docker compose logs -f prometheus
```

- Prometheus UI: `http://<host>:9090` → **Status → Targets** should show every target **UP**.
- Grafana: `http://<host>:3000`, first login `admin` / `admin` — it forces a password change. **Do not skip it**, and do not expose either port to the internet.
- After editing `prometheus.yml`: `docker compose restart prometheus`.
- Validate first: `docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml`

More on Compose: [Docker](docker.md).

## 📊 Step 3 — Grafana

1. **Connections → Data sources → Add → Prometheus**, URL `http://prometheus:9090` (the Compose service name), **Save & test**.
2. **Dashboards → New → Import**, ID **1860** ("Node Exporter Full") → pick the Prometheus data source.
3. Use the **instance** dropdown at the top to switch between machines.

Building your own panel: **Add visualization** → write a PromQL query → pick a type.

| Panel type | Use for |
|---|---|
| Time series | anything over time |
| Stat / Gauge | one current number (uptime, disk %) |
| Bar gauge | comparing hosts |
| Table | lists — top processes, all targets and their state |
| State timeline | up/down history |

💡 **Dashboard variables** make one dashboard serve every host: add a variable `instance` of type *Query* with `label_values(node_uname_info, instance)`, then use `{instance="$instance"}` in queries.

## 🔍 PromQL you will actually use

```promql
up                                             # 1 = target reachable, 0 = down
up == 0                                        # only the broken ones
node_memory_MemAvailable_bytes{instance="pve:9100"}     # filter by label
node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"}    # regex NOT match
```

| Selector | Meaning |
|---|---|
| `{job="node"}` | equals |
| `{job!="node"}` | not equal |
| `{instance=~"web.*"}` | regex match |
| `{mode!~"idle\|iowait"}` | regex not match |
| `metric[5m]` | a **range** of the last 5 minutes — needed by `rate()` |
| `metric offset 1d` | the value one day ago |

Ready-made queries:

```promql
# CPU usage % per host
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage %
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Root filesystem usage %
100 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100)

# Network receive, bits per second
rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8

# Load average per CPU core
node_load5 / on (instance) count by (instance) (node_cpu_seconds_total{mode="idle"})

# Uptime in days
(time() - node_boot_time_seconds) / 86400

# Will the disk be full within 4 hours?
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4 * 3600) < 0

# Top 5 hosts by memory used
topk(5, node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
```

| Function | Use |
|---|---|
| `rate(counter[5m])` | per-second average increase — the default for counters |
| `irate(counter[5m])` | instant rate from the last two samples — spiky, for zoomed-in graphs |
| `increase(counter[1h])` | total growth over the window |
| `sum / avg / min / max / count by (label) (...)` | aggregate across series |
| `topk(n, ...)` | the n largest |
| `avg_over_time(gauge[1h])` | smooth a gauge |
| `histogram_quantile(0.95, sum by (le) (rate(x_bucket[5m])))` | 95th percentile latency |

⚠️ Never graph a raw counter, and never `rate()` a gauge.

## 🚨 Alert rules

```yaml
# alerts.yml
groups:
  - name: homelab
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.instance }} is down"

      - alert: DiskAlmostFull
        expr: 100 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes * 100) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.instance }} {{ $labels.mountpoint }} at {{ $value | printf \"%.0f\" }}%"

      - alert: HighMemory
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 10m
        labels:
          severity: warning
```

- `for:` = the condition must hold this long before the alert **fires** (it is *pending* until then). It filters out blips.
- See states under **Alerts** in the Prometheus UI: inactive → pending → firing.
- Prometheus only **evaluates** rules. Delivering mail/Telegram/Discord needs **Alertmanager** — or, simpler for a homelab, create the alert in **Grafana Alerting** and attach a contact point there.
- Check rules: `promtool check rules alerts.yml`

Good alerts are **actionable**: if you would not get out of bed for it, make it a dashboard panel, not a page.

## 🩺 Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Target **DOWN**, `connection refused` | exporter not running, or bound to localhost only |
| Target **DOWN**, `context deadline exceeded` | firewall drops the port — allow it from the Prometheus host |
| Target **DOWN**, `no such host` | Prometheus runs in a container — `localhost` is the container itself; use the machine's IP |
| Grafana: *No data* | wrong time range, wrong data source URL, or a label value that does not match |
| Grafana cannot reach Prometheus | inside Compose use `http://prometheus:9090`, not `localhost` |
| Graph has gaps | scrapes are failing intermittently — check `up` and `scrape_duration_seconds` |
| Config change ignored | YAML error on reload — `docker compose logs prometheus`, run `promtool check config` |
| Disk filling up | lower `--storage.tsdb.retention.time`, drop noisy targets or labels |

```bash
curl -s http://192.168.1.20:9100/metrics | grep -c ^node_     # exporter answering?
curl -s 'http://localhost:9090/api/v1/query?query=up'         # ask Prometheus directly
```

## 🔒 Keep it private

- Neither Prometheus nor node_exporter has authentication by default — keep them on the LAN / management VLAN and firewall the ports.
- Metrics leak hostnames, kernel versions, mounted paths and running software.
- Remote access? Through a VPN — see [Firewalls, IDS/IPS, DMZ & VPN](../security/08-firewalls-ids-vpn.md).

## ⚡ Page cheat sheet

| Thing | Value |
|---|---|
| Prometheus UI | `:9090` |
| Grafana | `:3000` |
| node_exporter | `:9100` |
| Alertmanager | `:9093` |
| Is the target up | `up` |
| CPU % | `100 - avg by (instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100` |
| Check config | `promtool check config prometheus.yml` |
| Host dashboard ID | `1860` |
