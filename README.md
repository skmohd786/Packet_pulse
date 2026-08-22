# PacketPulse — Real-Time Website & Server Health Monitoring Platform

PacketPulse is a real-time observability platform that continuously monitors website availability, HTTP status, response time, uptime, and incident detection with live telemetry streamed directly to a dynamic React dashboard via WebSockets.

---

## Production Deployment Architecture

```
┌────────────────────────────────┐         REST & WebSockets         ┌────────────────────────────────┐
│   Vercel (React Frontend)      ├──────────────────────────────────►│    Render (Node.js Backend)    │
│  - VITE_API_URL                │                                   │   - PORT                       │
│  - VITE_WS_URL                 │                                   │   - MONGODB_URI                │
└────────────────────────────────┘                                   │   - CORS_ORIGIN                │
                                                                     └───────────────┬────────────────┘
                                                                                     │
                                                                            Mongoose Connection
                                                                                     │
                                                                     ┌───────────────▼────────────────┐
                                                                     │     MongoDB Atlas Database     │
                                                                     └────────────────────────────────┘
```

---

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts + Socket.IO Client
- **Backend**: Node.js + Express + TypeScript + Socket.IO Server + Mongoose
- **Database**: MongoDB Atlas (`MONGODB_URI`)

---

## 🚀 Production Deployment Instructions

### 1. Database Setup (MongoDB Atlas)
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a Cluster and Database named `packetpulse`.
3. Create a Database User with read/write permissions.
4. Copy your connection string (e.g. `mongodb+srv://<user>:<password>@cluster.mongodb.net/packetpulse?retryWrites=true&w=majority`).

---

### 2. Backend Deployment (Render)
1. Log in to [Render](https://render.com) and create a **Web Service**.
2. Connect your Git repository and set Root Directory to `backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Configure Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or Render default)
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `CORS_ORIGIN`: `https://your-frontend-app.vercel.app`

---

### 3. Frontend Deployment (Vercel)
1. Log in to [Vercel](https://vercel.com) and import your Git repository.
2. Set Root Directory to `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com`
   - `VITE_WS_URL`: `https://your-backend-app.onrender.com`

---

## Local Development

```bash
# Backend Setup
cd backend
npm install
npm run dev

# Frontend Setup
cd frontend
npm install
npm run dev
```
