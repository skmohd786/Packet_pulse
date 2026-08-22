# PacketPulse — Detailed Development Plan

This document outlines the step-by-step 20-phase roadmap for building **PacketPulse — Real-Time AI-Powered Application & Network Observability Platform**.

---

## Phase Overview & Quality Checklist

For each phase, the implementation follows strict quality criteria:
1. **Inspection**: Verify codebase state and dependencies.
2. **Implementation**: Build strictly within the phase scope.
3. **Execution**: Run application components locally.
4. **Testing & Verification**: Run type checks, linting, and unit/integration tests.
5. **Git Commit**: Commit with Conventional Commit standard (e.g. `feat(phase): description`).
6. **Documentation**: Update phase progress log.

---

### PHASE 1: Project Foundation + Monorepo + Tooling
- Initialize root workspace scripts, TypeScript configs, ESLint/Prettier setups.
- Structure `client/`, `server/`, `services/server-agent/`, `services/ai-service/`, `demo-app/`.
- Establish basic server bootstrap and React Vite shell.
- **Git Commit**: `chore: initialize PacketPulse monorepo foundation`

### PHASE 2: Professional UI Shell & Navigation System
- Build dark/light cybersecurity/observability theme design system using Tailwind CSS.
- Implement sidebar, top navigation, monitor/workspace dropdown, keyboard shortcuts, active connection pill badge.
- Build view routing for Overview, Monitors, Endpoints, Network, Servers, Incidents, Logs, Traces, Alerts, Settings.
- **Git Commit**: `feat(frontend): implement professional observability UI shell`

### PHASE 3: PostgreSQL Database & Authentication System
- Set up PostgreSQL schema with tables: `users`, `monitors`, `domains`, `servers`, `agents`, `monitoring_rules`, `metrics`, `incidents`, `incident_events`, `alerts`, `logs`, `traces`, `reports`.
- Implement JWT authentication API (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
- Connect React frontend to auth endpoints with persistence & context provider.
- **Git Commit**: `feat(auth): add PostgreSQL database and JWT authentication`

### PHASE 4: Domain & Monitor Management API
- Build CRUD REST endpoints for monitor configurations (`POST /api/monitors`, `GET /api/monitors`, `GET /api/monitors/:id`, `DELETE /api/monitors/:id`).
- Add domain validation, custom headers, check frequency interval config, threshold rules per monitor.
- Build Monitor Management UI.
- **Git Commit**: `feat(monitors): add domain and monitor management`

### PHASE 5: Real Website Monitoring Engine
- Implement real HTTP/HTTPS health checker module (DNS lookup time, TLS certificate expiration/validity, TCP handshake time, HTTP response status, total roundtrip time).
- Build robust error handling (DNS failures, connection timeouts, TLS validation errors, HTTP 4xx/5xx handling).
- Store website metrics in PostgreSQL database.
- **Git Commit**: `feat(monitoring): implement real HTTP, DNS, and TLS probe engine`

### PHASE 6: Real-Time WebSocket Streaming System
- Integrate Socket.IO server on Node.js backend.
- Define strongly-typed event interfaces (`monitor:status`, `monitor:metrics`, `network:metrics`, `server:metrics`, `incident:created`, `agent:status`).
- Implement Socket.IO client context in React with auto-reconnect handling, connection state pills (`LIVE`, `RECONNECTING`, `OFFLINE`), and stale data detection.
- **Git Commit**: `feat(realtime): add Socket.IO real-time event streaming`

### PHASE 7: Live Metrics & Dynamic Charts
- Connect Recharts interactive components to live WebSocket metrics stream (no hardcoded metrics).
- Build Live Request Throughput Chart, Live Latency Percentiles (P95/P99) Chart, Live Error Rate Chart, Network Traffic Chart, CPU & RAM Utilization Charts.
- Add time range controls (Last 15m, 1h, 6h, 24h, 7d).
- **Git Commit**: `feat(charts): add dynamic live metrics charts with Recharts`

### PHASE 8: PacketPulse Demo Application & Application Monitoring
- Build standalone `demo-app` with endpoints (`GET /api/products`, `POST /api/login`, `GET /api/orders`, `POST /api/payment`).
- Add Chaos Mode control panel (`/api/chaos/latency`, `/api/chaos/errors`, `/api/chaos/spike`, `/api/chaos/clear`).
- Build application metric ingestion & Endpoint Performance Table with detailed breakdown.
- **Git Commit**: `feat(demo-app): build demo application with chaos injection and application monitoring`

### PHASE 9: Redis & BullMQ Distributed Background Workers
- Integrate Redis and BullMQ job queues (`health-check`, `metric-processing`, `alert-evaluation`, `incident-generation`, `ai-analysis`).
- Offload long-running HTTP checks, metric aggregation, and alert evaluation from Express event loop.
- Add worker retries, failure handling, graceful shutdown hooks, job logging.
- **Git Commit**: `feat(workers): implement Redis and BullMQ background task processing`

### PHASE 10: Network Telemetry & Traffic Monitoring
- Collect network metrics (packets/sec, incoming/outgoing bandwidth, latency, packet loss, active socket connections).
- Clearly distinguish between zero value, available metrics, and unsupported hardware metrics.
- Build Network Telemetry View with packet graphs, bandwidth meters, and connection details.
- **Git Commit**: `feat(network): add real network packet and bandwidth monitoring`

### PHASE 11: Python Server Agent
- Implement standalone Python daemon using `psutil` and `requests`.
- Implement agent registration, secure token authentication, heartbeat polling, system metrics capture (CPU per core, RAM, Disk I/O, Network interfaces, top processes).
- Build Server Agent Management page in React UI showing agent online/offline status, last seen, hardware specs.
- **Git Commit**: `feat(server-agent): build Python server agent daemon and management UI`

### PHASE 12: Correlation Engine & Incident Detection System
- Build deterministic threshold monitoring engine (CPU > 90%, Error rate > 5%, P95 > 500ms, Agent offline).
- Build correlation engine (Requests ↑ + CPU ↑ + Latency ↑ + 5xx ↑ -> Server Overload Incident).
- Automatically generate incidents in database, create event timeline, broadcast `incident:created` via WebSocket.
- **Git Commit**: `feat(incidents): add metric correlation engine and incident detection`

### PHASE 13: Incident Investigation Deep-Dive UI
- Build dedicated Incident Investigation Page (`/incidents/:id`).
- Display Incident Title, Severity Badge, Status, Duration, Affected Service/Endpoint.
- Render evidence comparison cards (Before vs During Incident), metric timelines, related logs, related traces, AI diagnosis block, and action checklist.
- **Git Commit**: `feat(incidents): build comprehensive incident investigation page`

### PHASE 14: Log Aggregation & Analysis System
- Implement centralized log collector and parser API (`POST /api/logs/ingest`, `GET /api/logs`).
- Support log levels (INFO, WARN, ERROR, DEBUG), service tag, request ID, incident ID linkage.
- Build Logs UI page with search bar, multi-level filters, log stream view, syntax highlighting, incident association links.
- **Git Commit**: `feat(logs): implement structured log collection and log explorer UI`

### PHASE 15: Distributed Tracing & OpenTelemetry Integration
- Instrument `demo-app` with OpenTelemetry JS SDK (tracing HTTP requests down through services to database calls).
- Support trace propagation with `traceparent` headers, span durations, error status.
- Build Traces Page UI showing waterfall trace timelines and database query durations linked to incidents.
- **Git Commit**: `feat(tracing): add OpenTelemetry request tracing and waterfall UI`

### PHASE 16: Python AI Anomaly Detection Service
- Build Python FastAPI service (`services/ai-service`).
- Train / run `Scikit-learn` IsolationForest model on sliding-window metrics (CPU, RAM, requests/sec, latency, error rates).
- Expose `/api/v1/anomaly/detect` returning anomaly boolean, anomaly score, affected metric feature importance.
- **Git Commit**: `feat(ai-service): implement Python FastAPI anomaly detection service`

### PHASE 17: LLM Root Cause Diagnosis & Recommendation Engine
- Integrate LLM client (OpenAI/Gemini/Anthropic API or local model interface) in Python AI service.
- Construct structured prompts feeding telemetry evidence (metrics changes, logs, trace errors, anomaly scores).
- Generate structured response: Problem Summary, Probable Root Cause, Telemetry Evidence, Actionable Remediation Checklist.
- Implement graceful fallback when LLM API is unavailable.
- **Git Commit**: `feat(ai-service): implement LLM root cause analysis and diagnosis`

### PHASE 18: Service Level Objectives (SLO) & Alert Management
- Implement SLO tracking engine (Availability target e.g. 99.9%, Latency target e.g. P95 < 500ms, Error budget calculation).
- Build Alert Rule Manager UI & alert notification engine.
- Render Reliability / SLO Dashboard with live budget burn rates.
- **Git Commit**: `feat(slo): add SLO reliability tracking and alert rules engine`

### PHASE 19: Comprehensive Testing & Load Testing Suite
- Write backend unit and integration tests (Jest/Supertest for API endpoints, monitor engines, worker tasks).
- Write AI service unit tests (`pytest` for anomaly detection & LLM parser).
- Build reproducible k6 / autocannon load testing scripts (`load-tests/scenario.js`) demonstrating baseline traffic -> chaos spike -> incident generation -> AI diagnosis -> recovery.
- **Git Commit**: `test: add automated test suite and k6 load testing scenario`

### PHASE 20: Production Packaging: Docker Compose & CI/CD
- Write Dockerfiles for `client`, `server`, `services/server-agent`, `services/ai-service`, `demo-app`.
- Create `docker-compose.yml` linking all services, PostgreSQL, Redis.
- Create GitHub Actions workflow (`.github/workflows/ci.yml`) for linting, type-checking, automated testing.
- Write interview documentation (`INTERVIEW_EXPLANATION.md`).
- **Git Commit**: `feat(devops): add Docker Compose setup, GitHub Actions CI workflow, and interview documentation`
