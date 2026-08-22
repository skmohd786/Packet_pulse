/**
 * PacketPulse — Protocol Decoder
 *
 * Decodes network frames layer by layer following the TCP/IP model:
 *
 *  Layer 1 (Link):        Ethernet II, Linux SLL cooked capture, Null/Loopback
 *  Layer 2 (Internet):    IPv4, IPv6, ARP
 *  Layer 3 (Transport):   TCP (with flags), UDP
 *  Layer 4 (Application): DNS (port 53), HTTP (port 80), HTTPS (port 443 detection)
 *
 * Each decoder is wrapped in try/catch so a single malformed packet
 * doesn't crash the entire parse session.
 */

// ─── Port Service Lookup Table ────────────────────────────────────────────────
const PORT_SERVICES = {
  20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet',
  25: 'SMTP', 53: 'DNS', 67: 'DHCP', 68: 'DHCP',
  69: 'TFTP', 80: 'HTTP', 110: 'POP3', 143: 'IMAP',
  179: 'BGP', 194: 'IRC', 443: 'HTTPS', 445: 'SMB',
  465: 'SMTPS', 514: 'Syslog', 993: 'IMAPS', 995: 'POP3S',
  1194: 'OpenVPN', 1433: 'MSSQL', 1723: 'PPTP', 3306: 'MySQL',
  3389: 'RDP', 5060: 'SIP', 5432: 'PostgreSQL',
  5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt',
  27017: 'MongoDB', 123: 'NTP',
};

/**
 * Main entry point — given a raw frame buffer and link type, decode all layers.
 * @param {Buffer} buf  - Raw captured frame bytes
 * @param {number} linkType - PCAP link layer type (1=Ethernet, 113=SLL, 0=NULL)
 * @returns {Object} - Decoded packet fields
 */
function decodeProtocols(buf, linkType = 1) {
  const result = {
    protocol: 'Unknown',
    srcIP: null,
    dstIP: null,
    srcPort: null,
    dstPort: null,
    srcMac: null,
    dstMac: null,
    ttl: null,
    ipVersion: null,
    ipProtocol: null,
    tcpFlags: null,
    tcpSeq: null,
    tcpAck: null,
    tcpWindowSize: null,
    udpLength: null,
    payloadSize: 0,
    payloadText: null,
    dns: null,
    http: null,
    service: null,
    etherType: null,
    linkType,
  };

  try {
    let networkLayerOffset = 0;
    let etherType = null;

    // ── Link Layer ────────────────────────────────────────────────────────────
    if (linkType === 1) {
      // Ethernet II: 6 bytes dst MAC + 6 bytes src MAC + 2 bytes EtherType
      if (buf.length < 14) return result;
      result.dstMac = bufToMac(buf, 0);
      result.srcMac = bufToMac(buf, 6);
      etherType = buf.readUInt16BE(12);
      result.etherType = `0x${etherType.toString(16).padStart(4, '0')}`;
      networkLayerOffset = 14;

      // Handle 802.1Q VLAN tagging (EtherType 0x8100)
      if (etherType === 0x8100) {
        if (buf.length < 18) return result;
        etherType = buf.readUInt16BE(16);
        networkLayerOffset = 18;
      }

    } else if (linkType === 113) {
      // Linux Cooked Capture (SLL) — 16 byte pseudo-header
      if (buf.length < 16) return result;
      etherType = buf.readUInt16BE(14);
      networkLayerOffset = 16;

    } else if (linkType === 0 || linkType === 24) {
      // BSD Null/Loopback — 4 byte AF family
      if (buf.length < 4) return result;
      const family = buf.readUInt32LE(0);
      etherType = (family === 2) ? 0x0800 : (family === 30 || family === 24) ? 0x86DD : null;
      networkLayerOffset = 4;

    } else if (linkType === 101) {
      // Raw IPv4
      etherType = 0x0800;
      networkLayerOffset = 0;

    } else if (linkType === 228) {
      etherType = 0x0800;
      networkLayerOffset = 0;

    } else if (linkType === 229) {
      etherType = 0x86DD;
      networkLayerOffset = 0;

    } else {
      // Unknown link type — try to detect by first byte
      const firstByte = buf.length > 0 ? buf[0] : 0;
      const ipVersion = (firstByte >> 4) & 0xf;
      if (ipVersion === 4) { etherType = 0x0800; networkLayerOffset = 0; }
      else if (ipVersion === 6) { etherType = 0x86DD; networkLayerOffset = 0; }
    }

    if (etherType === null || buf.length <= networkLayerOffset) return result;

    // ── Network Layer ─────────────────────────────────────────────────────────
    if (etherType === 0x0800) {
      // IPv4
      decodeIPv4(buf, networkLayerOffset, result);
    } else if (etherType === 0x86DD) {
      // IPv6
      decodeIPv6(buf, networkLayerOffset, result);
    } else if (etherType === 0x0806) {
      // ARP
      result.protocol = 'ARP';
      decodeARP(buf, networkLayerOffset, result);
    } else {
      result.protocol = `EtherType(0x${etherType.toString(16)})`;
    }

  } catch (err) {
    result.decodeError = err.message;
  }

  return result;
}

// ─── IPv4 Decoder ─────────────────────────────────────────────────────────────
function decodeIPv4(buf, offset, result) {
  if (buf.length < offset + 20) return;

  const versionIHL = buf[offset];
  const ihl = (versionIHL & 0x0f) * 4; // IP Header Length in bytes
  result.ipVersion = 4;
  result.ttl = buf[offset + 8];
  result.ipProtocol = buf[offset + 9];

  result.srcIP = `${buf[offset+12]}.${buf[offset+13]}.${buf[offset+14]}.${buf[offset+15]}`;
  result.dstIP = `${buf[offset+16]}.${buf[offset+17]}.${buf[offset+18]}.${buf[offset+19]}`;

  const transportOffset = offset + ihl;

  decodeTransport(buf, transportOffset, result);
}

// ─── IPv6 Decoder ─────────────────────────────────────────────────────────────
function decodeIPv6(buf, offset, result) {
  if (buf.length < offset + 40) return;

  result.ipVersion = 6;
  result.ttl = buf[offset + 7]; // Hop Limit

  const nextHeader = buf[offset + 6];
  result.ipProtocol = nextHeader;

  // Source/Destination IPv6 addresses (16 bytes each, hex groups)
  result.srcIP = formatIPv6(buf, offset + 8);
  result.dstIP = formatIPv6(buf, offset + 24);

  const transportOffset = offset + 40; // Fixed 40-byte IPv6 header (no extension hdrs for now)
  decodeTransport(buf, transportOffset, result);
}

function formatIPv6(buf, offset) {
  const groups = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(buf.readUInt16BE(offset + i).toString(16));
  }
  return groups.join(':');
}

// ─── ARP Decoder ─────────────────────────────────────────────────────────────
function decodeARP(buf, offset, result) {
  if (buf.length < offset + 28) return;
  // HW type (2), Proto type (2), HW len (1), Proto len (1), Operation (2)
  const operation = buf.readUInt16BE(offset + 6);
  result.arpOperation = operation === 1 ? 'Request' : operation === 2 ? 'Reply' : `Op(${operation})`;
  // Sender IP at offset + 14, Target IP at offset + 24
  result.srcIP = `${buf[offset+14]}.${buf[offset+15]}.${buf[offset+16]}.${buf[offset+17]}`;
  result.dstIP = `${buf[offset+24]}.${buf[offset+25]}.${buf[offset+26]}.${buf[offset+27]}`;
}

// ─── Transport Layer Dispatcher ───────────────────────────────────────────────
function decodeTransport(buf, offset, result) {
  switch (result.ipProtocol) {
    case 6:  decodeTCP(buf, offset, result); break;
    case 17: decodeUDP(buf, offset, result); break;
    case 1:  decodeICMP(buf, offset, result); break;
    case 58: decodeICMPv6(buf, offset, result); break;
    default:
      result.protocol = `IP(proto=${result.ipProtocol})`;
  }
}

// ─── TCP Decoder ──────────────────────────────────────────────────────────────
function decodeTCP(buf, offset, result) {
  if (buf.length < offset + 20) {
    result.protocol = 'TCP';
    return;
  }

  result.srcPort = buf.readUInt16BE(offset);
  result.dstPort = buf.readUInt16BE(offset + 2);
  result.tcpSeq  = buf.readUInt32BE(offset + 4);
  result.tcpAck  = buf.readUInt32BE(offset + 8);

  const dataOffset = ((buf[offset + 12] >> 4) & 0xf) * 4; // TCP header length
  const flagsByte  = buf[offset + 13];

  result.tcpFlags = {
    FIN: !!(flagsByte & 0x01),
    SYN: !!(flagsByte & 0x02),
    RST: !!(flagsByte & 0x04),
    PSH: !!(flagsByte & 0x08),
    ACK: !!(flagsByte & 0x10),
    URG: !!(flagsByte & 0x20),
    ECE: !!(flagsByte & 0x40),
    CWR: !!(flagsByte & 0x80),
  };
  result.tcpFlagString = Object.entries(result.tcpFlags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(' | ') || 'none';

  result.tcpWindowSize = buf.readUInt16BE(offset + 14);

  const payloadOffset = offset + dataOffset;
  const payload = buf.slice(payloadOffset);
  result.payloadSize = Math.max(0, payload.length);

  // Determine application-layer protocol
  result.service = PORT_SERVICES[result.srcPort] || PORT_SERVICES[result.dstPort] || null;

  if (result.dstPort === 80 || result.srcPort === 80 || result.dstPort === 8080 || result.srcPort === 8080) {
    result.protocol = 'HTTP';
    decodeHTTP(payload, result);
  } else if (result.dstPort === 443 || result.srcPort === 443 || result.dstPort === 8443 || result.srcPort === 8443) {
    result.protocol = 'HTTPS';
    decodeTLS(payload, result);
  } else if (result.dstPort === 53 || result.srcPort === 53) {
    // DNS-over-TCP (rare but valid — has 2-byte length prefix)
    result.protocol = 'DNS';
    const dnsPayload = payload.length > 2 ? payload.slice(2) : payload;
    decodeDNS(dnsPayload, result);
  } else {
    // Try to sniff HTTP from payload regardless of port
    if (payload.length > 4) {
      const sniff = payload.slice(0, Math.min(8, payload.length)).toString('ascii');
      if (/^(GET |POST|PUT |DELE|HEAD|OPTI|PATC|HTTP)/.test(sniff)) {
        result.protocol = 'HTTP';
        decodeHTTP(payload, result);
      } else {
        result.protocol = 'TCP';
      }
    } else {
      result.protocol = 'TCP';
    }
  }
}

// ─── UDP Decoder ──────────────────────────────────────────────────────────────
function decodeUDP(buf, offset, result) {
  if (buf.length < offset + 8) {
    result.protocol = 'UDP';
    return;
  }

  result.srcPort  = buf.readUInt16BE(offset);
  result.dstPort  = buf.readUInt16BE(offset + 2);
  result.udpLength = buf.readUInt16BE(offset + 4);
  result.service  = PORT_SERVICES[result.srcPort] || PORT_SERVICES[result.dstPort] || null;

  const payload = buf.slice(offset + 8);
  result.payloadSize = Math.max(0, payload.length);

  if (result.srcPort === 53 || result.dstPort === 53) {
    result.protocol = 'DNS';
    decodeDNS(payload, result);
  } else if (result.srcPort === 67 || result.dstPort === 67 ||
             result.srcPort === 68 || result.dstPort === 68) {
    result.protocol = 'DHCP';
  } else if (result.srcPort === 123 || result.dstPort === 123) {
    result.protocol = 'NTP';
  } else {
    result.protocol = 'UDP';
  }
}

// ─── ICMP Decoder ─────────────────────────────────────────────────────────────
function decodeICMP(buf, offset, result) {
  if (buf.length < offset + 4) {
    result.protocol = 'ICMP';
    return;
  }
  const type = buf[offset];
  const code = buf[offset + 1];
  const icmpTypes = {
    0: 'Echo Reply', 3: 'Dest Unreachable', 5: 'Redirect',
    8: 'Echo Request', 11: 'Time Exceeded', 12: 'Parameter Problem',
  };
  result.protocol = 'ICMP';
  result.icmpType = type;
  result.icmpCode = code;
  result.icmpTypeName = icmpTypes[type] || `Type ${type}`;
}

function decodeICMPv6(buf, offset, result) {
  result.protocol = 'ICMPv6';
  if (buf.length >= offset + 2) {
    result.icmpType = buf[offset];
    result.icmpCode = buf[offset + 1];
  }
}

// ─── DNS Decoder ──────────────────────────────────────────────────────────────
function decodeDNS(payload, result) {
  if (payload.length < 12) return;

  const id        = payload.readUInt16BE(0);
  const flags     = payload.readUInt16BE(2);
  const qr        = (flags >> 15) & 1;  // 0=Query, 1=Response
  const opcode    = (flags >> 11) & 0xf;
  const rcode     = flags & 0xf;
  const qdCount   = payload.readUInt16BE(4);
  const anCount   = payload.readUInt16BE(6);
  const nsCount   = payload.readUInt16BE(8);
  const arCount   = payload.readUInt16BE(10);

  const dns = {
    id,
    isQuery: qr === 0,
    isResponse: qr === 1,
    opcode,
    rcode,
    rcodeText: dnsRcodeText(rcode),
    questions: [],
    answers: [],
    qdCount,
    anCount,
    nsCount,
    arCount,
  };

  let offset = 12;

  // Parse Questions
  for (let i = 0; i < qdCount && offset < payload.length; i++) {
    try {
      const { name, bytesRead } = parseDNSName(payload, offset);
      offset += bytesRead;
      if (offset + 4 > payload.length) break;
      const qtype  = payload.readUInt16BE(offset);
      const qclass = payload.readUInt16BE(offset + 2);
      offset += 4;
      dns.questions.push({ name, type: dnsTypeText(qtype), qtype, qclass });
    } catch { break; }
  }

  // Parse Answers
  for (let i = 0; i < anCount && offset < payload.length; i++) {
    try {
      const { name, bytesRead } = parseDNSName(payload, offset);
      offset += bytesRead;
      if (offset + 10 > payload.length) break;
      const rtype  = payload.readUInt16BE(offset);
      const rclass = payload.readUInt16BE(offset + 2);
      const ttl    = payload.readUInt32BE(offset + 4);
      const rdlen  = payload.readUInt16BE(offset + 8);
      offset += 10;

      let rdata = null;
      if (rtype === 1 && rdlen === 4 && offset + 4 <= payload.length) {
        // A record — IPv4
        rdata = `${payload[offset]}.${payload[offset+1]}.${payload[offset+2]}.${payload[offset+3]}`;
      } else if (rtype === 28 && rdlen === 16 && offset + 16 <= payload.length) {
        // AAAA record — IPv6
        const groups = [];
        for (let j = 0; j < 16; j += 2) groups.push(payload.readUInt16BE(offset + j).toString(16));
        rdata = groups.join(':');
      } else if ((rtype === 5 || rtype === 2) && offset + rdlen <= payload.length) {
        // CNAME or NS — domain name
        try { rdata = parseDNSName(payload, offset).name; } catch { rdata = null; }
      }

      dns.answers.push({ name, type: dnsTypeText(rtype), rtype, ttl, rdata });
      offset += rdlen;
    } catch { break; }
  }

  result.dns = dns;

  // Build human-readable summary
  if (dns.questions.length > 0) {
    const q = dns.questions[0];
    result.dnsQueryName  = q.name;
    result.dnsQueryType  = q.type;
    result.dnsIsResponse = dns.isResponse;
    result.dnsAnswerIPs  = dns.answers
      .filter(a => a.rtype === 1 || a.rtype === 28)
      .map(a => a.rdata)
      .filter(Boolean);
  }
}

function parseDNSName(buf, offset) {
  const labels = [];
  let jumped = false;
  let bytesRead = 0;
  let safetyCounter = 0;

  while (offset < buf.length && safetyCounter < 128) {
    safetyCounter++;
    const len = buf[offset];

    if (len === 0) {
      if (!jumped) bytesRead += 1;
      break;
    }

    if ((len & 0xc0) === 0xc0) {
      // Pointer compression
      if (offset + 1 >= buf.length) break;
      const ptr = ((len & 0x3f) << 8) | buf[offset + 1];
      if (!jumped) bytesRead += 2;
      jumped = true;
      offset = ptr;
      continue;
    }

    // Normal label
    offset += 1;
    if (!jumped) bytesRead += 1;
    const labelEnd = Math.min(offset + len, buf.length);
    labels.push(buf.slice(offset, labelEnd).toString('ascii'));
    offset += len;
    if (!jumped) bytesRead += len;
  }

  return { name: labels.join('.') || '.', bytesRead: jumped ? bytesRead : bytesRead };
}

function dnsTypeText(type) {
  const types = {
    1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR',
    15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 255: 'ANY',
  };
  return types[type] || `Type(${type})`;
}

function dnsRcodeText(rcode) {
  const codes = { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 5: 'REFUSED' };
  return codes[rcode] || `RCODE(${rcode})`;
}

// ─── HTTP Decoder ─────────────────────────────────────────────────────────────
function decodeHTTP(payload, result) {
  if (!payload || payload.length === 0) return;

  try {
    const text = payload.slice(0, Math.min(4096, payload.length)).toString('utf8', 0, Math.min(4096, payload.length));
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return;

    const firstLine = lines[0].trim();
    const http = { raw: firstLine, headers: {} };

    // HTTP Request: e.g. "GET /index.html HTTP/1.1"
    const reqMatch = firstLine.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s+(\S+)\s+(HTTP\/[\d.]+)/i);
    if (reqMatch) {
      http.type    = 'request';
      http.method  = reqMatch[1].toUpperCase();
      http.path    = reqMatch[2];
      http.version = reqMatch[3];
    }

    // HTTP Response: e.g. "HTTP/1.1 200 OK"
    const resMatch = firstLine.match(/^(HTTP\/[\d.]+)\s+(\d{3})\s*(.*)/i);
    if (resMatch) {
      http.type       = 'response';
      http.version    = resMatch[1];
      http.statusCode = parseInt(resMatch[2], 10);
      http.statusText = resMatch[3].trim();
      http.statusCategory = getHttpStatusCategory(http.statusCode);
    }

    // Parse headers
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') break;
      const colonIdx = lines[i].indexOf(':');
      if (colonIdx > 0) {
        const key = lines[i].slice(0, colonIdx).trim().toLowerCase();
        const val = lines[i].slice(colonIdx + 1).trim();
        http.headers[key] = val;
      }
    }

    if (http.type) {
      result.http = http;
      result.httpMethod     = http.method || null;
      result.httpPath       = http.path || null;
      result.httpStatusCode = http.statusCode || null;
      result.httpStatusText = http.statusText || null;
      result.httpVersion    = http.version || null;
      result.httpHost       = http.headers['host'] || null;
    }
  } catch { /* ignore decode errors */ }
}

function getHttpStatusCategory(code) {
  if (code < 200) return '1xx Informational';
  if (code < 300) return '2xx Success';
  if (code < 400) return '3xx Redirect';
  if (code < 500) return '4xx Client Error';
  return '5xx Server Error';
}

// ─── TLS / HTTPS Sniffer ─────────────────────────────────────────────────────
function decodeTLS(payload, result) {
  if (!payload || payload.length < 6) return;

  // TLS record type: 22 = Handshake, 23 = Application Data, 21 = Alert
  const recordType = payload[0];
  const tlsVersion = payload.readUInt16BE(1);

  const tlsVersionMap = {
    0x0301: 'TLS 1.0', 0x0302: 'TLS 1.1',
    0x0303: 'TLS 1.2', 0x0304: 'TLS 1.3',
  };

  const tls = {
    recordType,
    recordTypeName: { 20: 'ChangeCipherSpec', 21: 'Alert', 22: 'Handshake', 23: 'ApplicationData' }[recordType] || `Type(${recordType})`,
    version: tlsVersionMap[tlsVersion] || `0x${tlsVersion.toString(16)}`,
  };

  // If it's a Handshake, read the handshake type
  if (recordType === 22 && payload.length > 5) {
    const handshakeType = payload[5];
    tls.handshakeType = handshakeType;
    tls.handshakeTypeName = {
      1: 'ClientHello', 2: 'ServerHello', 11: 'Certificate',
      12: 'ServerKeyExchange', 14: 'ServerHelloDone',
      16: 'ClientKeyExchange', 20: 'Finished',
    }[handshakeType] || `Type(${handshakeType})`;
  }

  result.tls = tls;
}

function bufToMac(buf, offset) {
  const bytes = [];
  for (let i = 0; i < 6; i++) {
    bytes.push(buf[offset + i].toString(16).padStart(2, '0'));
  }
  return bytes.join(':');
}

module.exports = { decodeProtocols };
