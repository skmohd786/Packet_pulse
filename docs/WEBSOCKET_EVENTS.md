# PacketPulse — WebSocket / Socket.IO Event Specification

PacketPulse streams real-time telemetry metrics, agent heartbeats, log events, and incident alerts over WebSockets (Socket.IO).

---

## Connection Setup

- **URL**: `ws://localhost:5000` (or `wss://...` in production)
- **Namespaces**: `/` (Default system namespace)
- **Rooms**:
  - `monitors:<id>` (Subscribes to specific monitor events)
  - `overview` (Subscribes to global metrics stream)

---

## Server -> Client Events (Dispatched by Backend)

### 1. `monitor:metrics`
Emitted every monitoring check interval (e.g. 2-5 seconds).
```json
{
  "monitorId": "c8f2b7a0-...",
  "timestamp": "2026-08-22T11:50:00Z",
  "availability": true,
  "statusCode": 200,
  "responseTimeMs": 142.5,
  "dnsTimeMs": 12.3,
  "tlsTimeMs": 28.1,
  "requestsPerSec": 4200,
  "p95LatencyMs": 185.0,
  "p99LatencyMs": 320.0,
  "errorRatePct": 0.2,
  "packetsPerSec": 52000,
  "bandwidthMbps": 145.2,
  "packetLossPct": 0.0
}
```

### 2. `monitor:status`
Emitted when monitor health status toggles (`HEALTHY`, `DEGRADED`, `CRITICAL`).
```json
{
  "monitorId": "c8f2b7a0-...",
  "status": "CRITICAL",
  "reason": "P95 latency exceeded 500ms and 5xx error rate reached 16%",
  "timestamp": "2026-08-22T11:52:15Z"
}
```

### 3. `server:metrics`
Emitted when Python Server Agent submits new telemetry.
```json
{
  "serverId": "s101",
  "hostname": "prod-web-01",
  "status": "ONLINE",
  "cpuUsagePct": 94.2,
  "ramUsagePct": 88.5,
  "diskUsagePct": 62.0,
  "networkInMbps": 412.0,
  "networkOutMbps": 680.0,
  "activeConnections": 4820,
  "timestamp": "2026-08-22T11:52:16Z"
}
```

### 4. `incident:created` & `incident:updated`
Emitted when an incident is created or updated by the Correlation Engine / AI Service.
```json
{
  "incident": {
    "id": "inc-9921",
    "title": "Application Overload & Latency Breach",
    "severity": "CRITICAL",
    "status": "OPEN",
    "startedAt": "2026-08-22T11:52:15Z",
    "evidence": {
      "requestsPerSec": { "before": 4000, "during": 30000 },
      "cpuUsagePct": { "before": 55, "during": 98 },
      "p95LatencyMs": { "before": 180, "during": 4200 },
      "errorRatePct": { "before": 0.2, "during": 18.0 }
    }
  }
}
```

### 5. `log:new`
Emitted when a high-priority warning or error log entry is ingested.
```json
{
  "id": 10421,
  "timestamp": "2026-08-22T11:52:18Z",
  "level": "ERROR",
  "service": "demo-app",
  "endpoint": "/api/orders",
  "message": "Database connection pool exhausted",
  "requestId": "req-88129"
}
```

---

## Client -> Server Events (Dispatched by Dashboard)

### 1. `subscribe:overview`
Client subscribes to aggregate real-time metrics feed.

### 2. `subscribe:monitor`
Client subscribes to detailed events for a single monitor. Payload: `{ "monitorId": "..." }`.

### 3. `unsubscribe:monitor`
Client unsubscribes from a monitor room. Payload: `{ "monitorId": "..." }`.
