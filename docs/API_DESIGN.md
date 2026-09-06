# PacketPulse — REST API Specification

All REST API endpoints are prefixed with `/api/v1` (or `/api` alias for backwards compatibility). Authentication uses Bearer JWT tokens in the HTTP `Authorization` header.

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/register`
Creates a new user account.
- **Request Body**: `{ "email": "admin@example.com", "password": "securepassword", "name": "Admin User" }`
- **Response**: `{ "status": "success", "token": "JWT_TOKEN", "user": { "id": "...", "email": "...", "name": "..." } }`

### `POST /api/v1/auth/login`
Authenticates a user and returns a JWT token.
- **Request Body**: `{ "email": "admin@example.com", "password": "securepassword" }`
- **Response**: `{ "status": "success", "token": "JWT_TOKEN", "user": { "id": "...", "email": "...", "name": "..." } }`

### `GET /api/v1/auth/me`
Fetches authenticated user profile.
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**: `{ "status": "success", "user": { "id": "...", "email": "...", "name": "..." } }`

---

## 2. Monitor Management Endpoints

### `POST /api/v1/monitors`
Creates a new domain/application monitor.
- **Request Body**: `{ "name": "Demo App Monitor", "domain": "http://localhost:4000", "type": "HTTP", "check_interval_seconds": 10 }`
- **Response**: `{ "status": "success", "monitor": { "id": "...", "domain": "...", ... } }`

### `GET /api/v1/monitors`
Lists all monitors for the user.
- **Response**: `{ "status": "success", "monitors": [...] }`

### `GET /api/v1/monitors/:id`
Gets monitor detail, current health status, and current metrics.

### `DELETE /api/v1/monitors/:id`
Deletes a monitor target.

---

## 3. Metrics & Overview Endpoints

### `GET /api/v1/metrics/overview`
Retrieves system-wide real-time health score, uptime percentage, P95/P99 latency, error rates, and active incident counts.

### `GET /api/v1/metrics/timeseries`
Retrieves historical metric points for charts.
- **Query Params**: `monitorId`, `timeframe` (`15m`, `1h`, `6h`, `24h`, `7d`), `metrics` (`requests,latency,errors,network,cpu,ram`)

### `GET /api/v1/metrics/endpoints`
Retrieves list of application endpoints with throughput, P95, P99, error rates, and status.

---

## 4. Server Agent Telemetry Endpoints

### `POST /api/v1/agents/register`
Registers a new Python server agent node.

### `POST /api/v1/agents/telemetry`
Agent post endpoint for CPU, RAM, Disk, Network, and process telemetry payload.
- **Headers**: `X-Agent-Token: <SECRET_TOKEN>`

### `GET /api/v1/agents`
Returns list of registered server agents, online/offline status, and live resource usage.

---

## 5. Incident Management Endpoints

### `GET /api/v1/incidents`
Lists active and past incidents with severity, duration, and status filters.

### `GET /api/v1/incidents/:id`
Retrieves comprehensive incident evidence, metric snapshots, timeline events, and AI diagnosis.

### `POST /api/v1/incidents/:id/resolve`
Marks an incident as resolved.

---

## 6. Logs & Traces Endpoints

### `GET /api/v1/logs`
Filterable log entries search endpoint.
- **Query Params**: `level`, `service`, `endpoint`, `query`, `incidentId`, `limit`

### `POST /api/v1/logs/ingest`
Ingests log stream payloads from services.

### `GET /api/v1/traces`
Lists distributed request trace spans.

### `GET /api/v1/traces/:traceId`
Retrieves complete waterfall trace timeline for a given request trace ID.

---

## 7. Chaos & Demo Controls

### `POST /api/v1/chaos/trigger`
Triggers simulated failure mode in Demo Application (`latency`, `error_rate`, `traffic_spike`, `db_delay`, `server_overload`).

### `POST /api/v1/chaos/reset`
Resets Demo Application to baseline healthy operational state.
