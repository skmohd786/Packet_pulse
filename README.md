# 🚀 PacketPulse — Real-Time Website & Server Health Monitoring Platform

PacketPulse is a full-stack real-time observability and monitoring platform designed to track the health and performance of websites and servers.

It continuously monitors website availability, HTTP status codes, response times, uptime, and incidents, while streaming live monitoring data to a dynamic React dashboard using WebSockets.

The platform provides a centralized dashboard where users can monitor multiple endpoints, view real-time telemetry, identify failures, and analyze service health.

---

## 🌐 Live Architecture

```text
                    ┌──────────────────────────────┐
                    │        User / Browser        │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    Vercel - React Frontend   │
                    │                              │
                    │  React + TypeScript + Vite   │
                    │  Tailwind CSS + Recharts     │
                    │  Socket.IO Client            │
                    └──────────────┬───────────────┘
                                   │
                     REST API + WebSocket
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   Render - Node.js Backend   │
                    │                              │
                    │ Express + TypeScript         │
                    │ Socket.IO Server             │
                    │ Mongoose                     │
                    └──────────────┬───────────────┘
                                   │
                                   │ Mongoose
                                   ▼
                    ┌──────────────────────────────┐
                    │       MongoDB Atlas          │
                    │                              │
                    │   PacketPulse Database       │
                    └──────────────────────────────┘

✨ Features
📡 Real-Time Monitoring
Continuously monitor configured websites and endpoints.
Track endpoint availability in real time.
Receive live monitoring updates through WebSockets.
Automatically update the dashboard without requiring page refreshes.
🌐 Website Health Monitoring
HTTP status code monitoring.
Response-time tracking.
Availability checks.
Uptime monitoring.
Detection of failed or unhealthy endpoints.
🚨 Incident Detection
Detect website/server failures.
Identify unavailable endpoints.
Track HTTP errors.
Display service health and incident information on the dashboard.
📊 Monitoring Dashboard
Real-time service status.
Response-time metrics.
Uptime information.
Historical monitoring data.
Interactive charts using Recharts.
Dynamic dashboard updates through Socket.IO.
🔌 Real-Time Communication

PacketPulse uses Socket.IO to establish a persistent WebSocket connection between the frontend and backend.

This allows monitoring data to be pushed to connected clients immediately instead of repeatedly polling the server.

🗄️ Persistent Data

MongoDB Atlas is used to store monitoring information and application data.

Mongoose provides schema-based interaction between the Node.js backend and MongoDB.

🛠️ Tech Stack
Frontend
React
TypeScript
Vite
Tailwind CSS
Recharts
Socket.IO Client
Axios / Fetch API
Backend
Node.js
Express.js
TypeScript
Socket.IO
Mongoose
Database
MongoDB Atlas
Deployment
Vercel — Frontend
Render — Backend
MongoDB Atlas — Database
📁 Project Structure
PacketPulse/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── middleware/
│   │   └── server.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── README.md

The exact folder structure may vary depending on the implementation.

🔄 How PacketPulse Works
1. User opens PacketPulse dashboard
              │
              ▼
2. Frontend connects to backend
              │
              ▼
3. Backend loads monitoring configuration
              │
              ▼
4. Monitoring checks are performed
              │
              ▼
5. Website responds with status/latency
              │
              ▼
6. Backend processes monitoring result
              │
              ▼
7. Result is stored/processed
              │
              ▼
8. Socket.IO broadcasts updated telemetry
              │
              ▼
9. React dashboard updates in real time
📈 Monitoring Metrics

PacketPulse focuses on several important service-health metrics:

Metric	Description
Availability	Whether an endpoint is reachable
HTTP Status	HTTP response status code
Response Time	Time required for the endpoint to respond
Uptime	Percentage of successful availability checks
Incidents	Detected service failures or unhealthy states
Live Status	Current health of monitored services
🔐 Environment Variables

Environment variables are used to keep configuration and sensitive credentials outside the source code.

Backend

Create a .env file inside the backend directory:

NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173
Production Backend

Configure the following variables in Render:

NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=https://your-frontend-app.vercel.app

Never commit .env files or database credentials to GitHub.

💻 Local Development
Prerequisites

Make sure the following are installed:

Node.js
npm
Git
MongoDB Atlas account
1. Clone the Repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd PacketPulse
⚙️ Backend Setup

Navigate to the backend:

cd backend

Install dependencies:

npm install

Create the environment file:

.env

Add:

NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173

Start the backend in development mode:

npm run dev

The backend will run on:

http://localhost:5000
🎨 Frontend Setup

Open another terminal and navigate to the frontend:

cd frontend

Install dependencies:

npm install

Create the frontend environment file:

.env

Add:

VITE_API_URL=http://localhost:5000
VITE_WS_URL=http://localhost:5000

Start the development server:

npm run dev

The frontend will normally be available at:

http://localhost:5173
🗄️ MongoDB Atlas Setup
Create a MongoDB Atlas account.
Create a new cluster.
Create a database user.
Configure network access.
Create the packetpulse database.
Copy the MongoDB connection string.
Add the connection string to MONGODB_URI.

Example:

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>

Do not expose the real connection string publicly.

🚀 Production Deployment
Backend — Render
Create a new Web Service on Render.
Connect the GitHub repository.
Set the backend directory as the Root Directory.
Configure the build command:
npm install && npm run build
Configure the start command:
npm start
Add the required environment variables.
Deploy the service.

Example:

Backend
↓
Render
↓
https://your-backend.onrender.com
🌐 Frontend — Vercel
Import the frontend repository into Vercel.
Set the frontend directory as the Root Directory.
Configure:
Framework: Vite
Build Command: npm run build
Output Directory: dist
Add environment variables:
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=https://your-backend.onrender.com
Deploy the application.

Example:

Frontend
↓
Vercel
↓
https://your-frontend.vercel.app
🔗 Production Communication

The deployed application communicates using:

React Frontend
      │
      ├── REST API ──────────────► Express Backend
      │
      └── WebSocket ─────────────► Socket.IO Server
                                      │
                                      ▼
                                  MongoDB Atlas

The frontend does not directly connect to MongoDB.

All database operations are handled by the backend.

🔒 Security

PacketPulse follows basic production security practices:

Environment variables for sensitive configuration.
MongoDB credentials kept server-side.
CORS configuration between frontend and backend.
No database credentials in frontend code.
.env files excluded from Git.
WebSocket communication handled through the backend.

Example .gitignore:

node_modules/
.env
.env.local
dist/
🧪 Build & Production Testing

Before deployment, verify the frontend build:

npm run build

For the backend:

npm run build

Test the complete production flow:

Frontend
   ↓
Backend API
   ↓
MongoDB
   ↓
Monitoring Service
   ↓
Socket.IO
   ↓
Live Dashboard
🎯 Project Goals

PacketPulse was built to demonstrate practical full-stack engineering concepts including:

Real-time web applications
REST API development
WebSocket communication
Database integration
Server monitoring
Performance monitoring
Incident detection
TypeScript development
Cloud deployment
Frontend/backend architecture
🚀 Future Improvements

Potential future improvements include:

Email/SMS incident notifications
Configurable monitoring intervals
Authentication and user accounts
Multiple monitoring regions
Advanced uptime analytics
Incident history and timelines
Service-level agreements (SLA) tracking
Custom monitoring alerts
Detailed performance reports
Docker-based deployment
Automated health-check workers
👨‍💻 Author

Shaikh Mohammad

Full Stack Nodejs Developer
