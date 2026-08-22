import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRoutes from './routes/api';
import { initDb } from './db';
import { initMonitorEngine } from './services/monitorEngine';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'PacketPulse Real-Time Observability Engine', timestamp: new Date() });
});

// Serve frontend static build if available
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
    });
});

async function startServer() {
    await initDb();
    initMonitorEngine(io);

    server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`  PacketPulse Backend Server Running on Port ${PORT}`);
        console.log(`  Real-Time WebSockets Active (Socket.IO)`);
        console.log(`====================================================`);
    });
}

startServer();
