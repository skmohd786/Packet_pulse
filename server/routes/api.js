/**
 * PacketPulse — API Routes
 *
 * Route definitions:
 *  POST   /api/upload                            - Upload .pcap file
 *  POST   /api/sample                            - Generate & parse sample PCAP
 *  GET    /api/packets/:fileId                   - Paginated packet list (with search/filter via query params)
 *  GET    /api/packets/:fileId/stats             - Statistics & chart data
 *  GET    /api/packets/:fileId/details/:packetNumber - Full packet detail + hex view
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const {
  uploadFile,
  generateSample,
  getPackets,
  getPacketDetail,
  getStats,
} = require('../controllers/packetController');

const router = express.Router();

const os = require('os');

// ─── Multer Storage Configuration ────────────────────────────────────────────
const getUploadDir = () => {
  const localDir = path.join(__dirname, '..', 'uploads');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (err) {
    return os.tmpdir();
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (req, file, cb) => {
    // Use UUID prefix to avoid filename collisions
    const uniqueName = `${uuidv4()}-${Date.now()}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pcap', '.pcapng', '.cap'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Only .pcap, .pcapng, and .cap files are allowed. Received: "${ext || 'no extension'}"`
    ), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Upload a .pcap file
router.post('/upload', (req, res, next) => {
  upload.single('pcapFile')(req, res, (err) => {
    if (err) {
      console.error('[Upload Middleware Error]', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum allowed size is 100MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadFile);

// Generate + parse a built-in sample PCAP
router.post('/sample', generateSample);

// Get paginated packet list (supports ?protocol=TCP&ip=192.168&query=google&page=1&limit=100)
router.get('/packets/:fileId', getPackets);

// Get aggregate statistics and chart data
router.get('/packets/:fileId/stats', getStats);

// Get full packet detail by packet number
router.get('/packets/:fileId/details/:packetNumber', getPacketDetail);

module.exports = router;
