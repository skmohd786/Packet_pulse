# PacketPulse — Database Design Specification

PostgreSQL serves as the primary relational persistence store for PacketPulse. High-frequency time-series metrics are buffered in memory / Redis before being aggregated into PostgreSQL to avoid database bloat.

---

## Entity Relationship Summary

```
+------------+       1:N       +--------------+
|   users    +---------------->+   monitors   |
+------------+                 +------+-------+
                                      | 1:N
                                      v
                               +------+-------+
                               |   metrics    |
                               +--------------+

+------------+       1:N       +--------------+
|  monitors  +---------------->+  incidents   |
+------------+                 +------+-------+
                                      | 1:N
                                      v
                               +------+-------+
                               |incident_events|
                               +--------------+

+------------+       1:N       +--------------+
|  servers   +---------------->+    agents    |
+------------+                 +--------------+

+------------+       1:N       +--------------+
|  services  +---------------->+    logs      |
+------------+                 +--------------+

+------------+       1:N       +--------------+
|  services  +---------------->+   traces     |
+------------+                 +--------------+
```

---

## Core Table Schemas

### 1. `users`
Stores system users and authentication credentials.
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `monitors`
Stores domain and application monitoring target configurations.
```sql
CREATE TABLE monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'HTTP', -- HTTP, DNS, TLS, APPLICATION, NETWORK
  check_interval_seconds INT NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  expected_status INT DEFAULT 200,
  timeout_ms INT DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `metrics`
Stores aggregated time-series performance metrics.
```sql
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  availability BOOLEAN NOT NULL DEFAULT true,
  response_time_ms FLOAT NOT NULL,
  dns_time_ms FLOAT,
  tls_time_ms FLOAT,
  requests_per_sec FLOAT DEFAULT 0,
  p95_latency_ms FLOAT DEFAULT 0,
  p99_latency_ms FLOAT DEFAULT 0,
  error_count_4xx INT DEFAULT 0,
  error_count_5xx INT DEFAULT 0,
  error_rate_pct FLOAT DEFAULT 0,
  packets_per_sec FLOAT DEFAULT 0,
  bandwidth_mbps FLOAT DEFAULT 0,
  packet_loss_pct FLOAT DEFAULT 0
);

CREATE INDEX idx_metrics_monitor_timestamp ON metrics (monitor_id, timestamp DESC);
```

### 4. `servers` & `agents`
Stores registered server nodes and server telemetry agents.
```sql
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  os_info VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  agent_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'OFFLINE', -- ONLINE, OFFLINE, DEGRADED
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  cpu_usage_pct FLOAT DEFAULT 0,
  ram_usage_pct FLOAT DEFAULT 0,
  disk_usage_pct FLOAT DEFAULT 0,
  network_in_mbps FLOAT DEFAULT 0,
  network_out_mbps FLOAT DEFAULT 0,
  active_connections INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `incidents` & `incident_events`
Stores anomaly-triggered and rule-triggered incident records.
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  evidence JSONB NOT NULL DEFAULT '{}',
  ai_diagnosis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE incident_events (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL, -- THRESHOLD_BREACH, ANOMALY_DETECTED, LOG_PATTERN, AI_DIAGNOSIS
  message TEXT NOT NULL,
  metadata JSONB
);
```

### 6. `logs` & `traces`
Stores structured log entries and distributed request trace spans.
```sql
CREATE TABLE logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  level VARCHAR(10) NOT NULL, -- INFO, WARN, ERROR, DEBUG
  service VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255),
  message TEXT NOT NULL,
  request_id VARCHAR(100),
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL
);

CREATE TABLE traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100) NOT NULL,
  span_id VARCHAR(100) NOT NULL,
  parent_span_id VARCHAR(100),
  service_name VARCHAR(100) NOT NULL,
  operation_name VARCHAR(100) NOT NULL,
  duration_ms FLOAT NOT NULL,
  status_code INT DEFAULT 200,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tags JSONB
);

CREATE INDEX idx_logs_timestamp ON logs (timestamp DESC);
CREATE INDEX idx_traces_trace_id ON traces (trace_id);
```
