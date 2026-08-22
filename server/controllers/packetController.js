/**
 * PacketPulse — Packet Controller
 *
 * Handles all API business logic:
 *  - File upload & validation
 *  - PCAP parsing & in-memory caching
 *  - Pagination, search, filter
 *  - Packet detail retrieval
 *  - Statistics aggregation
 *  - Sample PCAP generation
 */

const path = require('path');
const fs = require('fs');
const { parsePcap } = require('../parser/pcapBinaryParser');
const { generateSamplePcap } = require('../parser/sampleGenerator');
const { v4: uuidv4 } = require('uuid');

// ─── In-Memory Cache: fileId → { packets, fileInfo, uploadedAt } ─────────────
const packetCache = new Map();

// Cache TTL: auto-expire sessions after 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000;

function cleanExpiredCache() {
  const now = Date.now();
  for (const [id, entry] of packetCache.entries()) {
    if (now - entry.uploadedAt > CACHE_TTL_MS) {
      packetCache.delete(id);
      console.log(`[Cache] Expired entry for fileId: ${id}`);
    }
  }
}
setInterval(cleanExpiredCache, 10 * 60 * 1000); // run every 10 minutes

// ─── Helper: Read and parse PCAP file into cache ─────────────────────────────
function loadPcapIntoCache(fileId, filePath) {
  const buffer = fs.readFileSync(filePath);
  const { packets, fileInfo } = parsePcap(buffer);

  packetCache.set(fileId, {
    packets,
    fileInfo,
    filePath,
    uploadedAt: Date.now(),
  });

  return { packets, fileInfo };
}

// ─── Helper: Paginate an array ────────────────────────────────────────────────
function paginate(arr, page = 1, limit = 100) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(1000, Math.max(1, parseInt(limit) || 100));
  const start = (p - 1) * l;
  return {
    data: arr.slice(start, start + l),
    total: arr.length,
    page: p,
    limit: l,
    totalPages: Math.ceil(arr.length / l),
  };
}

// ─── POST /api/upload ─────────────────────────────────────────────────────────
exports.uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileId = req.file.filename.replace(/\.[^.]+$/, ''); // strip extension for use as ID
    const filePath = req.file.path;

    console.log(`[Upload] Received: ${req.file.originalname} → ${fileId}`);

    // Parse immediately and cache
    const { packets, fileInfo } = loadPcapIntoCache(fileId, filePath);

    res.json({
      success: true,
      fileId,
      filename: req.file.originalname,
      size: req.file.size,
      packetCount: packets.length,
      fileInfo,
    });
  } catch (err) {
    console.error('[Upload Error]', err.message);
    res.status(500).json({ error: `Failed to parse PCAP file: ${err.message}` });
  }
};

// ─── POST /api/sample ─────────────────────────────────────────────────────────
exports.generateSample = (req, res) => {
  try {
    const fileId = `sample-${uuidv4().slice(0, 8)}`;
    console.log(`[Sample] Generating sample PCAP: ${fileId}`);
    
    const pcapBuffer = generateSamplePcap();
    const { packets, fileInfo } = parsePcap(pcapBuffer);

    // Save into in-memory cache
    packetCache.set(fileId, {
      packets,
      fileInfo,
      uploadedAt: Date.now(),
    });

    // Optional background write to tmp if possible
    try {
      const os = require('os');
      const tmpPath = path.join(os.tmpdir(), `${fileId}.pcap`);
      fs.writeFileSync(tmpPath, pcapBuffer);
    } catch (e) {
      // Ignore disk write errors in serverless
    }

    res.json({
      success: true,
      fileId,
      filename: 'sample-capture.pcap',
      size: pcapBuffer.length,
      packetCount: packets.length,
      fileInfo,
    });
  } catch (err) {
    console.error('[Sample Error]', err.message);
    res.status(500).json({ error: `Failed to generate sample PCAP: ${err.message}` });
  }
};

// ─── GET /api/packets/:fileId ─────────────────────────────────────────────────
exports.getPackets = (req, res) => {
  const { fileId } = req.params;
  const { page = 1, limit = 100, protocol, ip, srcIp, dstIp, port, srcPort, dstPort, query } = req.query;

  const entry = packetCache.get(fileId);
  if (!entry) {
    return res.status(404).json({ error: `No data found for fileId: ${fileId}. Please re-upload.` });
  }

  let packets = entry.packets;

  // ── Apply filters/search ──────────────────────────────────────────────────
  if (protocol && protocol !== 'All') {
    packets = packets.filter(p => p.protocol && p.protocol.toUpperCase() === protocol.toUpperCase());
  }
  if (ip) {
    packets = packets.filter(p =>
      (p.srcIP && p.srcIP.includes(ip)) || (p.dstIP && p.dstIP.includes(ip))
    );
  }
  if (srcIp) {
    packets = packets.filter(p => p.srcIP && p.srcIP.includes(srcIp));
  }
  if (dstIp) {
    packets = packets.filter(p => p.dstIP && p.dstIP.includes(dstIp));
  }
  if (port) {
    const portNum = parseInt(port, 10);
    packets = packets.filter(p => p.srcPort === portNum || p.dstPort === portNum);
  }
  if (srcPort) {
    const portNum = parseInt(srcPort, 10);
    packets = packets.filter(p => p.srcPort === portNum);
  }
  if (dstPort) {
    const portNum = parseInt(dstPort, 10);
    packets = packets.filter(p => p.dstPort === portNum);
  }
  if (query) {
    const q = query.toLowerCase().trim();
    const packetNum = parseInt(q, 10);
    packets = packets.filter(p => {
      // Match by IP, protocol, port, or packet number
      if (!isNaN(packetNum) && p.packetNumber === packetNum) return true;
      if (p.srcIP && p.srcIP.includes(q)) return true;
      if (p.dstIP && p.dstIP.includes(q)) return true;
      if (p.protocol && p.protocol.toLowerCase().includes(q)) return true;
      if (p.dnsQueryName && p.dnsQueryName.toLowerCase().includes(q)) return true;
      if (p.httpPath && p.httpPath.toLowerCase().includes(q)) return true;
      if (String(p.srcPort).includes(q) || String(p.dstPort).includes(q)) return true;
      return false;
    });
  }

  // ── Shape response (exclude rawHex from list) ─────────────────────────────
  const shaped = packets.map(p => ({
    packetNumber: p.packetNumber,
    timestamp: p.timestamp,
    srcIP: p.srcIP,
    dstIP: p.dstIP,
    srcMac: p.srcMac,
    dstMac: p.dstMac,
    protocol: p.protocol,
    srcPort: p.srcPort,
    dstPort: p.dstPort,
    packetLength: p.packetLength,
    capturedLength: p.capturedLength,
    ttl: p.ttl,
    tcpFlagString: p.tcpFlagString,
    dnsQueryName: p.dnsQueryName,
    dnsQueryType: p.dnsQueryType,
    dnsIsResponse: p.dnsIsResponse,
    dnsAnswerIPs: p.dnsAnswerIPs,
    httpMethod: p.httpMethod,
    httpPath: p.httpPath,
    httpStatusCode: p.httpStatusCode,
    service: p.service,
  }));

  const paged = paginate(shaped, page, limit);

  res.json({
    ...paged,
    fileInfo: entry.fileInfo,
    filtered: !!(protocol || ip || srcIp || dstIp || port || query),
  });
};

// ─── GET /api/packets/:fileId/details/:packetNumber ────────────────────────────
exports.getPacketDetail = (req, res) => {
  const { fileId, packetNumber } = req.params;
  const pNum = parseInt(packetNumber, 10);

  const entry = packetCache.get(fileId);
  if (!entry) {
    return res.status(404).json({ error: `No data found for fileId: ${fileId}` });
  }

  const packet = entry.packets.find(p => p.packetNumber === pNum);
  if (!packet) {
    return res.status(404).json({ error: `Packet #${pNum} not found.` });
  }

  // Format hex view
  const hexLines = [];
  if (packet.rawHex) {
    const bytes = Buffer.from(packet.rawHex, 'hex');
    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(chunk).map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.').join('');
      hexLines.push({
        offset: i.toString(16).padStart(4, '0'),
        hex: hex.padEnd(47, ' '),
        ascii,
      });
    }
  }

  res.json({
    ...packet,
    rawHex: packet.rawHex,
    hexView: hexLines,
    // Remove large raw buffer from response
  });
};

// ─── GET /api/packets/:fileId/stats ──────────────────────────────────────────
exports.getStats = (req, res) => {
  const { fileId } = req.params;
  const entry = packetCache.get(fileId);

  if (!entry) {
    return res.status(404).json({ error: `No data found for fileId: ${fileId}` });
  }

  const { packets, fileInfo } = entry;

  if (packets.length === 0) {
    return res.json({
      totalPackets: 0,
      fileInfo,
      protocolCounts: {},
      topSourceIPs: [],
      trafficOverTime: [],
      avgPacketSize: 0,
      largestPacket: null,
    });
  }

  // ── Protocol counts ───────────────────────────────────────────────────────
  const protocolCounts = {};
  for (const p of packets) {
    const proto = p.protocol || 'Unknown';
    protocolCounts[proto] = (protocolCounts[proto] || 0) + 1;
  }

  // ── Top source IPs ────────────────────────────────────────────────────────
  const ipCounts = {};
  for (const p of packets) {
    if (p.srcIP) ipCounts[p.srcIP] = (ipCounts[p.srcIP] || 0) + 1;
  }
  const topSourceIPs = Object.entries(ipCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  // ── Packet size stats ─────────────────────────────────────────────────────
  const sizes = packets.map(p => p.packetLength || p.capturedLength || 0);
  const totalBytes = sizes.reduce((a, b) => a + b, 0);
  const avgPacketSize = Math.round(totalBytes / packets.length);
  const maxSize = Math.max(...sizes);
  const largestPacket = packets.find(p => (p.packetLength || p.capturedLength || 0) === maxSize);

  // ── Traffic over time (bucket by second or by interval) ──────────────────
  const tsRaw = packets.map(p => p.timestampRaw || 0).filter(Boolean);
  let trafficOverTime = [];

  if (tsRaw.length > 0) {
    const minTs = Math.min(...tsRaw);
    const maxTs = Math.max(...tsRaw);
    const duration = maxTs - minTs;

    // Choose bucket size: 1s for short captures, larger for longer ones
    const targetBuckets = 60;
    const bucketSize = duration > 0
      ? Math.max(0.001, duration / targetBuckets)
      : 1;

    const buckets = {};
    for (const p of packets) {
      if (!p.timestampRaw) continue;
      const bucketKey = Math.floor((p.timestampRaw - minTs) / bucketSize);
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
          time: new Date((minTs + bucketKey * bucketSize) * 1000).toISOString(),
          count: 0,
          bytes: 0,
        };
      }
      buckets[bucketKey].count++;
      buckets[bucketKey].bytes += p.packetLength || 0;
    }

    trafficOverTime = Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time));
  }

  // ── Protocol distribution for pie chart ───────────────────────────────────
  const protocolDistribution = Object.entries(protocolCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([protocol, count]) => ({
      protocol,
      count,
      percentage: Math.round((count / packets.length) * 100 * 10) / 10,
    }));

  // ── Derived counts ────────────────────────────────────────────────────────
  const tcpPackets  = protocolCounts['TCP']   || 0;
  const udpPackets  = protocolCounts['UDP']   || 0;
  const dnsPackets  = protocolCounts['DNS']   || 0;
  const httpPackets = protocolCounts['HTTP']  || 0;
  const httpsPackets = protocolCounts['HTTPS'] || 0;

  res.json({
    totalPackets: packets.length,
    tcpPackets,
    udpPackets,
    dnsPackets,
    httpPackets,
    httpsPackets,
    totalBytes,
    avgPacketSize,
    largestPacket: largestPacket ? {
      packetNumber: largestPacket.packetNumber,
      size: maxSize,
    } : null,
    protocolCounts,
    protocolDistribution,
    topSourceIPs,
    trafficOverTime,
    fileInfo,
  });
};
