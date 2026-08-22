# PacketPulse — Real-Time AI-Powered Application & Network Observability Platform
## Final Architecture Specification

### 1. System Overview & Core Principles

PacketPulse is a production-quality, real-time observability platform engineered for continuous application, network, website, and server health monitoring. Unlike static dashboards or simple CRUD applications, PacketPulse implements an active monitoring engine backed by distributed background workers, event-driven streaming over WebSockets, correlation logic, statistical anomaly detection, and LLM-assisted root-cause diagnosis.

#### Primary Operational Questions Answered
1. **Is my application healthy?** (Real-time aggregate health score, uptime percentage, SLO compliance, latency percentiles).
2. **What is happening right now?** (Sub-second live streaming of throughput, latency distributions, network packets, error rates, CPU/RAM/Disk metrics).
3. **Where is the problem?** (Targeted service/endpoint tracing, network layer degradation pinpointing, server agent metrics).
4. **Why is the problem happening?** (Multi-dimensional metric correlation: e.g. Requests ↑ + CPU ↑ + Latency ↑ + 5xx Errors ↑ -> Application Overload).
5. **What should I do?** (Deterministic rule triggers combined with LLM-powered root cause diagnosis, evidence synthesis, and step-by-step remediation strategies).

---

### 2. High-Level Data Flow Architecture

```
                                  +-------------------+
                                  |   User Browser    |
                                  | (React + TS + Vite|
                                  +---------+---------+
                                            ^
                                     WebSocket / REST
                                            v
                                  +---------+---------+
                                  |   Express API     |
                                  |   Gateway Node    |
                                  +----+--------+-----+
                                       |        |
                         +-------------+        +------------+
                         v                                   v
               +------------------+                +------------------+
               | PostgreSQL (DB)  |                |  Redis (Pub/Sub  |
               | Metrics & State  |                |   & Queue Broker)|
               +------------------+                +--------+---------+
                                                            |
                                                            v
                                                   +------------------+
                                                   | BullMQ Worker    |
                                                   | Processing Pool  |
                                                   +--------+---------+
                                                            |
        +-----------------------+-----------------------+---+-----------------------+
        |                       |                       |                           |
        v                       v                       v                           v
+---------------+       +---------------+       +---------------+           +---------------+
| Website       |       | Application   |       | Network       |           | Server Agent  |
| Monitor       |       | Monitor       |       | Monitor       |           | (Python       |
| (HTTP/DNS/TLS)|       | (HTTP/Traces) |       | (Sockets/Ping)|           |  Daemon)      |
+-------+-------+       +-------+-------+       +-------+-------+           +-------+-------+
        |                       |                       |                           |
        +-----------------------+-----------+-----------+---------------------------+
                                            v
                               +--------------------------+
                               |    Monitoring Engine     |
                               | (Validate/Normalize/Store|
                               +------------+-------------+
                                            |
                                            v
                               +--------------------------+
                               |   Correlation Engine     |
                               | & Rule-based Detector    |
                               +------------+-------------+
                                            |
                                            v
                               +--------------------------+
                               |   Python AI Service      |
                               | (FastAPI/Scikit-learn/LLM|
                               +------------+-------------+
                                            |
                                            v
                               +--------------------------+
                               |  Incident & Notification |
                               |      Event Bus           |
                               +--------------------------+
```

---

### 3. Component Breakdown & Responsibilities

#### 3.1. Frontend (`client/`)
- **Framework**: React 18 + TypeScript + Vite + Tailwind CSS.
- **Charts & UI**: Recharts, Lucide Icons, TanStack Query.
- **State & Real-Time**: Socket.IO Client context manager, connection status tracking (`LIVE`, `RECONNECTING`, `OFFLINE`), stale data detection, error boundary fallback.
- **Views**: Overview, Monitors, Endpoints, Network, Servers, Incidents, Incident Investigation, Logs, Traces, Alerts, Settings.

#### 3.2. Primary API Server (`server/`)
- **Engine**: Node.js + Express + TypeScript.
- **Database**: PostgreSQL (Prisma/Knex or raw client with migrations).
- **Authentication**: JWT token authorization, bcrypt password hashing, secure agent API tokens.
- **Responsibility**: Express endpoints handle user auth, CRUD configurations, agent handshakes, and query parameters. Long-running checks are delegated off main loop to BullMQ queues.

#### 3.3. Background Processing & Queue Infrastructure (`server/src/workers/`)
- **Broker**: Redis.
- **Queue System**: BullMQ.
- **Queues**:
  - `health-check`: Scheduled HTTP, DNS, TLS probes.
  - `metric-processing`: Metric rollup, percentile (P95, P99) sliding window computation.
  - `alert-evaluation`: Deterministic rule evaluations (e.g. CPU > 90%, Latency > 500ms).
  - `incident-generation`: Cross-layer correlation & incident state lifecycle.
  - `ai-analysis`: Asynchronous dispatch to Python AI service for LLM diagnosis.

#### 3.4. Server Monitoring Agent (`services/server-agent/`)
- **Language**: Python 3.10+.
- **Libraries**: `psutil`, `requests`, `socket`.
- **Metrics Collected**: CPU % (per core & avg), RAM (used, free, swap), Disk I/O (reads/writes/latency), Network interfaces (bytes in/out, packets dropped/errors), active TCP connection table, top processes by CPU/RAM.
- **Features**: Agent registration, token authentication, periodic heartbeat, auto-reconnect backoff.

#### 3.5. Python AI & Anomaly Service (`services/ai-service/`)
- **Framework**: Python 3.10+ FastAPI.
- **ML / Stats Engine**: `scikit-learn` (IsolationForest / OneClassSVM), `pandas`, `numpy`.
- **LLM Integration**: Structured OpenAI/Gemini/Anthropic API client with fallback to deterministic heuristic analysis if LLM API is unavailable.
- **Guarantees**: LLM only receives structured statistical metrics and telemetry evidence; it never invents raw metric data.

#### 3.6. PacketPulse Demo Application (`demo-app/`)
- **Stack**: Node.js Express app serving `/api/products`, `/api/login`, `/api/orders`, `/api/payment`.
- **Failure Injection Modes**:
  - `MODE_LATENCY`: Simulated database delay / CPU spin.
  - `MODE_ERRORS`: Simulated 500 internal server errors / connection timeout.
  - `MODE_TRAFFIC_SPIKE`: Concurrent load generation simulation.
  - `MODE_MEMORY_LEAK`: Gradual RAM allocation.

---

### 4. Target Project Directory Layout

```
PacketPulse/
├── client/                      # React + TypeScript Frontend
│   ├── src/
│   │   ├── api/                 # Axios HTTP clients & API functions
│   │   ├── components/          # Reusable UI components (Sidebar, Header, StatCards, etc.)
│   │   ├── context/             # SocketContext, AuthContext, ThemeContext
│   │   ├── hooks/               # Custom React hooks (useMetrics, useWebSocket, etc.)
│   │   ├── pages/               # Page views (Overview, Monitors, Incidents, Logs, etc.)
│   │   ├── types/               # TypeScript interfaces for API & WebSockets
│   │   └── utils/               # Formatters, status helpers
│   ├── package.json
│   └── vite.config.ts
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/              # DB, Redis, Environment configurations
│   │   ├── controllers/         # Express REST API controllers
│   │   ├── db/                  # PostgreSQL connection, schemas, migrations
│   │   ├── middleware/          # Auth, Validation, Error Handler middleware
│   │   ├── monitors/            # HTTP, DNS, TLS, Network probing engines
│   │   ├── queues/              # BullMQ queue definitions & job dispatchers
│   │   ├── routes/              # Express API route declarations
│   │   ├── services/            # Business logic (Correlation, Incident Manager, Socket Server)
│   │   ├── workers/             # BullMQ background worker processors
│   │   └── index.ts             # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── services/
│   ├── server-agent/            # Python Server Monitoring Daemon
│   │   ├── agent.py             # Main telemetry collection daemon
│   │   ├── config.py            # Agent settings & token auth
│   │   └── requirements.txt
│   └── ai-service/              # Python FastAPI Anomaly Detection & AI Diagnosis
│       ├── main.py              # FastAPI app entry point
│       ├── anomaly_detector.py  # Scikit-learn statistical anomaly models
│       ├── llm_diagnoser.py     # Prompt engineering & LLM integration logic
│       └── requirements.txt
├── demo-app/                    # Target application for live monitoring & chaos mode
│   ├── src/
│   │   ├── chaos.js             # Controlled fault injection controller
│   │   └── app.js               # Express REST app with OpenTelemetry instrumented traces
│   └── package.json
├── docs/                        # Complete architecture & design documentation
│   ├── API_DESIGN.md
│   ├── DATABASE_DESIGN.md
│   └── WEBSOCKET_EVENTS.md
├── docker-compose.yml           # Multi-container orchestrator
├── FINAL_ARCHITECTURE.md
├── DEVELOPMENT_PLAN.md
└── README.md
```
