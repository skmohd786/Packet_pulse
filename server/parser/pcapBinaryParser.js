/**
 * PacketPulse — PCAP Binary Parser
 *
 * Parses the libpcap file format (.pcap) directly from binary buffers.
 * This is a pure JavaScript implementation that avoids native C/C++ bindings,
 * ensuring compatibility across all platforms without compilation steps.
 *
 * PCAP File Format (libpcap):
 * ┌──────────────────────────────────┐
 * │ Global Header (24 bytes)         │
 * │  - Magic Number  (4 bytes)       │  0xa1b2c3d4 (LE) or 0xd4c3b2a1 (BE)
 * │  - Major Version (2 bytes)       │  = 2
 * │  - Minor Version (2 bytes)       │  = 4
 * │  - Timezone offset (4 bytes)     │  usually 0
 * │  - Timestamp accuracy (4 bytes)  │  usually 0
 * │  - Snaplen (4 bytes)             │  max bytes captured per packet
 * │  - Link-layer type (4 bytes)     │  1 = Ethernet
 * ├──────────────────────────────────┤
 * │ Packet Record Header (16 bytes)  │  × N packets
 * │  - ts_sec  (4 bytes)             │  epoch seconds
 * │  - ts_usec (4 bytes)             │  microseconds (or nanoseconds for 0xa1b23c4d)
 * │  - incl_len (4 bytes)            │  bytes captured in file
 * │  - orig_len (4 bytes)            │  original bytes on wire
 * ├──────────────────────────────────┤
 * │ Packet Data (incl_len bytes)     │
 * └──────────────────────────────────┘
 */

const { decodeProtocols } = require('./protocolDecoder');

// Known magic numbers
const MAGIC_LE_MICRO  = 0xa1b2c3d4; // Little-endian, microsecond timestamps
const MAGIC_BE_MICRO  = 0xd4c3b2a1; // Big-endian, microsecond timestamps
const MAGIC_LE_NANO   = 0xa1b23c4d; // Little-endian, nanosecond timestamps
const MAGIC_BE_NANO   = 0x4d3cb2a1; // Big-endian, nanosecond timestamps

/**
 * Parse a .pcap file buffer and return an array of decoded packet objects.
 *
 * @param {Buffer} buffer - Complete file buffer of the pcap file
 * @returns {{ packets: Array, linkType: number, fileInfo: Object }}
 */
function parsePcap(buffer) {
  if (!buffer || buffer.length < 24) {
    throw new Error('File is too small to be a valid PCAP file (< 24 bytes)');
  }

  // ── Read Global Header ──────────────────────────────────────────────────────
  const magic = buffer.readUInt32LE(0);

  let isLE, isNano;
  if (magic === MAGIC_LE_MICRO) {
    isLE = true;  isNano = false;
  } else if (magic === MAGIC_BE_MICRO) {
    isLE = false; isNano = false;
  } else if (magic === MAGIC_LE_NANO) {
    isLE = true;  isNano = true;
  } else if (magic === MAGIC_BE_NANO) {
    isLE = false; isNano = true;
  } else {
    // Try reading as big-endian to produce a helpful message
    const magicHex = magic.toString(16).padStart(8, '0');
    throw new Error(
      `Invalid PCAP magic number: 0x${magicHex}. ` +
      `This may be a .pcapng file or a corrupt/unsupported format. ` +
      `Please export as legacy .pcap from Wireshark.`
    );
  }

  const read32 = (offset) => isLE ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  const read16 = (offset) => isLE ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);

  const versionMajor = read16(4);
  const versionMinor = read16(6);
  const snaplen      = read32(16);
  const linkType     = read32(20);

  const fileInfo = {
    magic: `0x${magic.toString(16)}`,
    version: `${versionMajor}.${versionMinor}`,
    snaplen,
    linkType,
    linkTypeName: getLinkTypeName(linkType),
    timestampResolution: isNano ? 'nanoseconds' : 'microseconds',
    byteOrder: isLE ? 'little-endian' : 'big-endian',
  };

  console.log('[PCAP] Global header parsed:', fileInfo);

  // ── Iterate Packet Records ──────────────────────────────────────────────────
  const packets = [];
  let offset = 24; // Global header is 24 bytes
  let packetNumber = 1;

  while (offset < buffer.length) {
    // Need at least 16 bytes for a packet record header
    if (offset + 16 > buffer.length) {
      console.warn(`[PCAP] Truncated record header at offset ${offset}, stopping.`);
      break;
    }

    const ts_sec  = read32(offset);
    const ts_sub  = read32(offset + 4); // microseconds or nanoseconds
    const inclLen = read32(offset + 8);  // bytes in file
    const origLen = read32(offset + 12); // original length on wire

    offset += 16;

    // Sanity check captured length
    if (inclLen > snaplen + 100 || inclLen > 65535) {
      console.warn(`[PCAP] Suspicious incl_len=${inclLen} at packet ${packetNumber}, skipping record.`);
      // Attempt to skip if we can still trust origLen bounding
      if (origLen > 0 && origLen <= 65535) {
        offset += Math.min(origLen, buffer.length - offset);
      }
      packetNumber++;
      continue;
    }

    if (offset + inclLen > buffer.length) {
      console.warn(`[PCAP] Packet ${packetNumber}: incl_len=${inclLen} exceeds buffer, truncating.`);
      // Try to parse whatever is left
    }

    // Extract raw packet data bytes
    const packetEnd = Math.min(offset + inclLen, buffer.length);
    const rawBuffer = buffer.slice(offset, packetEnd);

    // Compute timestamp as ISO string
    const tsMs = isNano
      ? ts_sec * 1000 + Math.floor(ts_sub / 1_000_000)
      : ts_sec * 1000 + Math.floor(ts_sub / 1000);
    const timestamp = new Date(tsMs).toISOString();
    const timestampRaw = isNano
      ? ts_sec + ts_sub / 1_000_000_000
      : ts_sec + ts_sub / 1_000_000;

    // Decode protocols from raw frame bytes
    let decoded = {};
    try {
      decoded = decodeProtocols(rawBuffer, linkType);
    } catch (err) {
      console.warn(`[PCAP] Packet ${packetNumber} decode error: ${err.message}`);
      decoded = { protocol: 'Unknown', error: err.message };
    }

    packets.push({
      packetNumber,
      timestamp,
      timestampRaw,
      packetLength: origLen,
      capturedLength: inclLen,
      rawHex: rawBuffer.toString('hex'),
      ...decoded,
    });

    offset += inclLen;
    packetNumber++;

    // Safety cap: don't parse more than 100k packets into memory
    if (packetNumber > 100_000) {
      console.warn('[PCAP] Reached 100,000 packet limit, stopping early.');
      break;
    }
  }

  console.log(`[PCAP] Parsed ${packets.length} packets.`);
  return { packets, linkType, fileInfo };
}

/**
 * Return a human-readable name for the link-layer type.
 * Reference: https://www.tcpdump.org/linktypes.html
 */
function getLinkTypeName(linkType) {
  const types = {
    0:   'NULL (BSD loopback)',
    1:   'Ethernet',
    6:   'IEEE 802.5 Token Ring',
    10:  'FDDI',
    23:  'PPP',
    24:  'SLIP',
    101: 'Raw IP',
    105: 'IEEE 802.11 (Wi-Fi)',
    113: 'Linux cooked capture (SLL)',
    127: 'IEEE 802.11 with Radiotap',
    228: 'IPv4 raw',
    229: 'IPv6 raw',
  };
  return types[linkType] || `Unknown (${linkType})`;
}

module.exports = { parsePcap };
