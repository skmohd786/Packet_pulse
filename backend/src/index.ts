import express from 'express';
import http from 'http';
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
    res.json({ status: 'ok', service: 'PacketPulse Website Monitoring Engine', timestamp: new Date() });
});

// Serve frontend static build if available
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const server = http.createServer(app);

async function startServer() {
    await initDb();
    initMonitorEngine();

    server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`  PacketPulse Backend REST Server Running on Port ${PORT}`);
        console.log(`====================================================`);
    });
}

startServer();
