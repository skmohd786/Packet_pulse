# PacketPulse MVP — Real-Time Website Health Monitoring Platform

PacketPulse is a real-time observability platform that continuously monitors website availability, HTTP status, response time, uptime, and incident detection with live telemetry streamed directly to a dynamic React dashboard via WebSockets.

---

## Key Features

- **Domain Monitoring**: Input any domain/URL (e.g. `google.com`, `example.com`, `httpstat.us/500`) for continuous active health monitoring.
- **Real HTTP Health Checks**: Executes actual HTTP requests with latency timing, HTTP status code checks, and DNS lookup.
- **Dynamic Health Status**: Categorizes target health into **HEALTHY**, **WARNING**, or **CRITICAL** based on response latency, status codes, and reachability.
- **Uptime Calculation**: Computes live percentage uptime per domain based on historical check metrics stored in MongoDB.
- **MongoDB Metric Storage**: Persists monitor configurations, real-time metrics, and incident records using Mongoose models.
- **Real-Time WebSockets**: Pushes live metric pings, status transitions, and incident alerts directly to the frontend without browser reloads via Socket.IO.
- **Live Response Time Chart**: Interactive latency stream graph built with Recharts with historical time range selectors (15m, 1h, 6h, 24h).
- **Automated Incident Detection**: Automatically generates incidents when monitors experience failures or status degradation, with timeline logging and resolution controls.

---

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts + Socket.IO Client
- **Backend**: Node.js + Express + TypeScript + Socket.IO Server + Node Fetch
- **Database**: MongoDB with Mongoose (`MONGODB_URI=mongodb://localhost:27017/packetpulse`)

---

## Mongoose Data Models

- **Monitor**: `domain`, `interval`, `status`, `lastStatusCode`, `lastResponseTime`, `uptime`, `createdAt`, `updatedAt` (Index: `domain`)
- **Metric**: `monitorId`, `domain`, `httpStatus`, `responseTime`, `dnsTime`, `isUp`, `uptime`, `status`, `errorMessage`, `timestamp` (Indexes: `monitorId`, `timestamp`, `domain`)
- **Incident**: `monitorId`, `domain`, `severity`, `message`, `details`, `relevantMetricValues`, `resolvedStatus`, `timestamp`, `resolvedAt` (Indexes: `monitorId`, `timestamp`, `domain`)

---

## Setup & Running the Application

### 1. Prerequisites
- Node.js v18+ and npm installed.
- MongoDB instance running locally on port 27017 (`mongodb://localhost:27017/packetpulse`).

### 2. Backend Installation & Startup
```bash
cd backend
npm install
npm run dev
```
The backend server runs on `http://localhost:5000` with WebSocket server attached.

### 3. Frontend Installation & Startup
```bash
cd frontend
npm install
npm run dev
```
The frontend Vite server runs on `http://localhost:5173`.

---

## API Endpoints

- `POST /api/monitors` — Add a new domain/URL to monitor
- `GET /api/monitors` — Fetch all monitored domains and current statuses
- `GET /api/monitors/:id/metrics?range=15m|1h|6h|24h` — Fetch historical metric pings for charts
- `DELETE /api/monitors/:id` — Stop monitoring a domain
- `GET /api/incidents` — List active and historical incidents
- `POST /api/incidents/:id/resolve` — Resolve an active incident
