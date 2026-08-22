/**
 * PacketPulse — Express Application Entry Point
 *
 * Sets up middleware, CORS, file upload configuration, API routing,
 * and global error handling for the PacketPulse backend.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure uploads directory exists safely (fallback to os.tmpdir on serverless) ─
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn('[Warning] Could not create uploads directory (serverless mode):', e.message);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
// Dynamic CORS: Allow any origin in production or specified CLIENT_URL
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or any vercel.app / localhost
    if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin === process.env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive CORS for deployed API accessibility
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logger (Dev) ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'PacketPulse API' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 100MB.' });
  }

  if (err.message && err.message.includes('Only .pcap')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 PacketPulse Server running at http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}\n`);
  });
}

module.exports = app;
