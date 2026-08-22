/**
 * PacketPulse — Sample PCAP Generator
 *
 * Synthesizes a valid libpcap binary file (.pcap) containing a realistic
 * mix of network traffic for testing and demonstration purposes:
 *
 *  - DNS query: A record lookup for "example.com"
 *  - DNS response: A record answer "93.184.216.34"
 *  - TCP 3-way handshake (SYN → SYN-ACK → ACK) to port 80
 *  - HTTP GET request: "GET /index.html HTTP/1.1"
 *  - HTTP 200 OK response with small HTML body
 *  - TCP 3-way handshake to port 443
 *  - TLS 1.3 ClientHello to example.com:443
 *  - UDP NTP packet
 *  - ARP who-has request
 *  - Multiple TCP ACK data segments
 *
 * Reference: https://wiki.wireshark.org/Development/LibpcapFileFormat
 */

/**
 * Write a 32-bit little-endian value into a buffer at offset.
 */
function writeUInt32LE(buf, value, offset) {
  buf.writeUInt32LE(value >>> 0, offset);
}

function writeUInt16BE(buf, value, offset) {
  buf.writeUInt16BE(value & 0xffff, offset);
}

/**
 * Build the 24-byte PCAP global header.
 * Magic 0xa1b2c3d4 = little-endian microsecond pcap.
 */
function buildGlobalHeader() {
  const hdr = Buffer.alloc(24, 0);
  writeUInt32LE(hdr, 0xa1b2c3d4, 0);  // magic number
  hdr.writeUInt16LE(2, 4);             // major version
  hdr.writeUInt16LE(4, 6);             // minor version
  hdr.writeInt32LE(0, 8);              // timezone offset (UTC)
  writeUInt32LE(hdr, 0, 12);           // timestamp accuracy
  writeUInt32LE(hdr, 65535, 16);       // snaplen
  writeUInt32LE(hdr, 1, 20);           // link type 1 = Ethernet
  return hdr;
}

/**
 * Wrap raw Ethernet frame data in a 16-byte pcap packet record header.
 * @param {Buffer} frameData - Ethernet frame bytes
 * @param {number} tsSec     - epoch seconds
 * @param {number} tsUsec    - microseconds part
 */
function buildPacketRecord(frameData, tsSec, tsUsec) {
  const recHdr = Buffer.alloc(16, 0);
  writeUInt32LE(recHdr, tsSec, 0);
  writeUInt32LE(recHdr, tsUsec, 4);
  writeUInt32LE(recHdr, frameData.length, 8);   // incl_len
  writeUInt32LE(recHdr, frameData.length, 12);  // orig_len
  return Buffer.concat([recHdr, frameData]);
}

// ─── MAC / IP Helpers ─────────────────────────────────────────────────────────
const MAC_CLIENT = Buffer.from([0xaa, 0xbb, 0xcc, 0x11, 0x22, 0x33]);
const MAC_GATEWAY = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
const MAC_BROADCAST = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

const IP_CLIENT  = [192, 168, 1, 100];
const IP_SERVER  = [93, 184, 216, 34];   // example.com
const IP_DNS     = [8, 8, 8, 8];          // Google DNS
const IP_GATEWAY = [192, 168, 1, 1];
const IP_NTP     = [216, 239, 35, 4];     // Google NTP
const IP_CLIENT2 = [192, 168, 1, 101];   // second client for variety

function buildEthernetHeader(srcMac, dstMac, etherType) {
  const hdr = Buffer.alloc(14);
  dstMac.copy(hdr, 0);
  srcMac.copy(hdr, 6);
  writeUInt16BE(hdr, etherType, 12);
  return hdr;
}

let ipIdCounter = 1;
function buildIPv4Header(srcIP, dstIP, protocol, totalLength) {
  const hdr = Buffer.alloc(20, 0);
  hdr[0] = 0x45;              // version=4, IHL=5 (20 bytes)
  hdr[1] = 0;                 // DSCP/ECN
  writeUInt16BE(hdr, totalLength, 2);
  writeUInt16BE(hdr, ipIdCounter++ & 0xffff, 4);
  hdr[6] = 0x40; hdr[7] = 0;  // DF flag, no fragment offset
  hdr[8] = 64;                 // TTL = 64
  hdr[9] = protocol;
  // Skip checksum (leave as 0 — valid for our test purposes)
  hdr.writeUInt8(srcIP[0], 12); hdr.writeUInt8(srcIP[1], 13);
  hdr.writeUInt8(srcIP[2], 14); hdr.writeUInt8(srcIP[3], 15);
  hdr.writeUInt8(dstIP[0], 16); hdr.writeUInt8(dstIP[1], 17);
  hdr.writeUInt8(dstIP[2], 18); hdr.writeUInt8(dstIP[3], 19);
  return hdr;
}

function buildUDPHeader(srcPort, dstPort, payloadLength) {
  const hdr = Buffer.alloc(8, 0);
  writeUInt16BE(hdr, srcPort, 0);
  writeUInt16BE(hdr, dstPort, 2);
  writeUInt16BE(hdr, 8 + payloadLength, 4);
  // checksum = 0 (valid in IPv4)
  return hdr;
}

let tcpSeqCounter = 0x10000000;
function buildTCPHeader(srcPort, dstPort, seq, ack, flags, payloadLength = 0, windowSize = 65535) {
  const hdr = Buffer.alloc(20, 0);
  writeUInt16BE(hdr, srcPort, 0);
  writeUInt16BE(hdr, dstPort, 2);
  hdr.writeUInt32BE(seq >>> 0, 4);
  hdr.writeUInt32BE(ack >>> 0, 8);
  hdr[12] = 0x50;  // Data offset = 5 (20 bytes), reserved = 0
  hdr[13] = flags;
  writeUInt16BE(hdr, windowSize, 14);
  return hdr;
}

// TCP Flags
const TCP_SYN     = 0x02;
const TCP_ACK     = 0x10;
const TCP_FIN     = 0x01;
const TCP_PSH     = 0x08;
const TCP_RST     = 0x04;
const TCP_SYN_ACK = TCP_SYN | TCP_ACK;
const TCP_PSH_ACK = TCP_PSH | TCP_ACK;
const TCP_FIN_ACK = TCP_FIN | TCP_ACK;

// ─── DNS Packet Builder ───────────────────────────────────────────────────────
function buildDNSName(name) {
  const parts = name.split('.');
  const buf = Buffer.alloc(parts.reduce((acc, p) => acc + 1 + p.length, 0) + 1);
  let offset = 0;
  for (const part of parts) {
    buf[offset++] = part.length;
    Buffer.from(part).copy(buf, offset);
    offset += part.length;
  }
  buf[offset] = 0; // terminator
  return buf;
}

function buildDNSQuery(txId, name) {
  const hdr = Buffer.alloc(12, 0);
  writeUInt16BE(hdr, txId, 0);   // Transaction ID
  writeUInt16BE(hdr, 0x0100, 2); // Flags: QR=0 (query), RD=1
  writeUInt16BE(hdr, 1, 4);      // QDCOUNT = 1
  // rest zeroed

  const qname = buildDNSName(name);
  const tail = Buffer.alloc(4);
  writeUInt16BE(tail, 1, 0);  // QTYPE = A
  writeUInt16BE(tail, 1, 2);  // QCLASS = IN

  return Buffer.concat([hdr, qname, tail]);
}

function buildDNSResponse(txId, name, answerIP) {
  const hdr = Buffer.alloc(12, 0);
  writeUInt16BE(hdr, txId, 0);   // Transaction ID
  writeUInt16BE(hdr, 0x8180, 2); // Flags: QR=1 (response), AA=0, RD=1, RA=1
  writeUInt16BE(hdr, 1, 4);      // QDCOUNT = 1
  writeUInt16BE(hdr, 1, 6);      // ANCOUNT = 1

  const qname = buildDNSName(name);
  const qtail = Buffer.alloc(4);
  writeUInt16BE(qtail, 1, 0);  // QTYPE = A
  writeUInt16BE(qtail, 1, 2);  // QCLASS = IN

  // Answer RR
  const ans = Buffer.alloc(16);
  writeUInt16BE(ans, 0xc00c, 0);  // Pointer to question name at offset 12
  writeUInt16BE(ans, 1, 2);       // TYPE = A
  writeUInt16BE(ans, 1, 4);       // CLASS = IN
  ans.writeUInt32BE(300, 6);      // TTL = 300
  writeUInt16BE(ans, 4, 10);      // RDLENGTH = 4
  ans[12] = answerIP[0]; ans[13] = answerIP[1];
  ans[14] = answerIP[2]; ans[15] = answerIP[3];

  return Buffer.concat([hdr, qname, qtail, ans]);
}

// ─── HTTP Payloads ────────────────────────────────────────────────────────────
function buildHTTPRequest(host, path = '/') {
  return Buffer.from(
    `GET ${path} HTTP/1.1\r\n` +
    `Host: ${host}\r\n` +
    `User-Agent: PacketPulse/1.0 Mozilla/5.0\r\n` +
    `Accept: text/html,application/xhtml+xml\r\n` +
    `Accept-Language: en-US,en;q=0.5\r\n` +
    `Connection: keep-alive\r\n` +
    `\r\n`,
    'ascii'
  );
}

function buildHTTPResponse(statusCode, statusText, body = '') {
  const bodyBuf = Buffer.from(body, 'utf8');
  return Buffer.from(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n` +
    `Content-Length: ${bodyBuf.length}\r\n` +
    `Server: PacketPulse-Test/1.0\r\n` +
    `Date: Sun, 10 Aug 2026 07:00:00 GMT\r\n` +
    `Connection: keep-alive\r\n` +
    `\r\n` + body,
    'utf8'
  );
}

// ─── TLS ClientHello Skeleton ─────────────────────────────────────────────────
function buildTLSClientHello() {
  // Minimal TLS 1.3 ClientHello record (truncated but parseable)
  const hello = Buffer.from([
    0x16,             // Record type: Handshake (22)
    0x03, 0x01,       // TLS 1.0 for compatibility (record layer)
    0x00, 0xf1,       // Record length
    0x01,             // Handshake type: ClientHello (1)
    0x00, 0x00, 0xed, // Handshake length
    0x03, 0x03,       // Client Hello Version: TLS 1.2
    // 32 bytes random
    ...Array.from({ length: 32 }, (_, i) => (i * 7 + 0x42) & 0xff),
    0x20,             // Session ID length = 32
    ...Array.from({ length: 32 }, (_, i) => (i * 3 + 0x10) & 0xff),
    0x00, 0x08,       // Cipher Suites Length
    0x13, 0x01,       // TLS_AES_128_GCM_SHA256
    0x13, 0x02,       // TLS_AES_256_GCM_SHA384
    0x13, 0x03,       // TLS_CHACHA20_POLY1305_SHA256
    0xc0, 0x2c,       // ECDHE-ECDSA-AES256-GCM-SHA384
    0x01, 0x00,       // Compression Methods length=1, no compression
  ]);
  return hello;
}

// ─── ARP ─────────────────────────────────────────────────────────────────────
function buildARPRequest(senderMac, senderIP, targetIP) {
  const arp = Buffer.alloc(28, 0);
  writeUInt16BE(arp, 1, 0);    // Hardware type: Ethernet
  writeUInt16BE(arp, 0x0800, 2); // Protocol type: IPv4
  arp[4] = 6;                  // Hardware address length
  arp[5] = 4;                  // Protocol address length
  writeUInt16BE(arp, 1, 6);    // Operation: Request
  senderMac.copy(arp, 8);
  arp[14] = senderIP[0]; arp[15] = senderIP[1];
  arp[16] = senderIP[2]; arp[17] = senderIP[3];
  // Target MAC = 0 (unknown, it's a request)
  arp[24] = targetIP[0]; arp[25] = targetIP[1];
  arp[26] = targetIP[2]; arp[27] = targetIP[3];
  return arp;
}

// ─── Frame Assembly ───────────────────────────────────────────────────────────
function buildEthernetFrame(srcMac, dstMac, etherType, payload) {
  return Buffer.concat([buildEthernetHeader(srcMac, dstMac, etherType), payload]);
}

function buildIPv4UDPFrame(srcMac, dstMac, srcIP, dstIP, srcPort, dstPort, payload) {
  const udpHdr = buildUDPHeader(srcPort, dstPort, payload.length);
  const udpPacket = Buffer.concat([udpHdr, payload]);
  const ipHdr = buildIPv4Header(srcIP, dstIP, 17, 20 + udpPacket.length);
  return buildEthernetFrame(srcMac, dstMac, 0x0800, Buffer.concat([ipHdr, udpPacket]));
}

function buildIPv4TCPFrame(srcMac, dstMac, srcIP, dstIP, srcPort, dstPort, seq, ack, flags, payload = Buffer.alloc(0)) {
  const tcpHdr = buildTCPHeader(srcPort, dstPort, seq, ack, flags, payload.length);
  const tcpSegment = Buffer.concat([tcpHdr, payload]);
  const ipHdr = buildIPv4Header(srcIP, dstIP, 6, 20 + tcpSegment.length);
  return buildEthernetFrame(srcMac, dstMac, 0x0800, Buffer.concat([ipHdr, tcpSegment]));
}

// ─── Main Generator ───────────────────────────────────────────────────────────
/**
 * Generate a full synthetic .pcap Buffer with diverse network traffic.
 * @returns {Buffer}
 */
function generateSamplePcap() {
  const parts = [buildGlobalHeader()];

  // Base timestamp: 2026-08-10 07:30:00 UTC
  const baseTs = Math.floor(new Date('2026-08-10T07:30:00.000Z').getTime() / 1000);
  let t = baseTs;

  function addPacket(frameData, deltaSec = 0, deltaUsec = 0) {
    t += deltaSec;
    if (Buffer.isBuffer(frameData)) {
      parts.push(buildPacketRecord(frameData, t, deltaUsec));
    }
  }

  // ── 1. ARP Who-has for gateway ──────────────────────────────────────────────
  addPacket(buildEthernetFrame(
    MAC_CLIENT, MAC_BROADCAST, 0x0806,
    buildARPRequest(MAC_CLIENT, IP_CLIENT, IP_GATEWAY)
  ), 0, 0);

  // ── 2. ARP Who-has for DNS server ──────────────────────────────────────────
  addPacket(buildEthernetFrame(
    MAC_CLIENT, MAC_BROADCAST, 0x0806,
    buildARPRequest(MAC_CLIENT, IP_CLIENT, IP_DNS)
  ), 0, 1200);

  // ── 3. DNS Query: example.com A record ────────────────────────────────────
  const dnsQuery1 = buildDNSQuery(0xaaaa, 'example.com');
  addPacket(buildIPv4UDPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_DNS, 54321, 53, dnsQuery1
  ), 0, 5000);

  // ── 4. DNS Response: example.com → 93.184.216.34 ─────────────────────────
  const dnsResp1 = buildDNSResponse(0xaaaa, 'example.com', IP_SERVER);
  addPacket(buildIPv4UDPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_DNS, IP_CLIENT, 53, 54321, dnsResp1
  ), 0, 28000);

  // ── 5. DNS Query: www.google.com ─────────────────────────────────────────
  const dnsQuery2 = buildDNSQuery(0xbbbb, 'www.google.com');
  addPacket(buildIPv4UDPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_DNS, 54322, 53, dnsQuery2
  ), 0, 50000);

  // ── 6. DNS Response: www.google.com → 142.250.195.68 ─────────────────────
  const dnsResp2 = buildDNSResponse(0xbbbb, 'www.google.com', [142, 250, 195, 68]);
  addPacket(buildIPv4UDPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_DNS, IP_CLIENT, 53, 54322, dnsResp2
  ), 0, 80000);

  // ── 7-9. TCP 3-way handshake → port 80 (HTTP) ────────────────────────────
  const clientPort80 = 49152;
  const clientSeq80  = 0x10000000;
  const serverSeq80  = 0x20000000;

  // SYN
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort80, 80, clientSeq80, 0, TCP_SYN
  ), 0, 100000);

  // SYN-ACK
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    80, clientPort80, serverSeq80, clientSeq80 + 1, TCP_SYN_ACK
  ), 0, 125000);

  // ACK
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort80, 80, clientSeq80 + 1, serverSeq80 + 1, TCP_ACK
  ), 0, 130000);

  // ── 10. HTTP GET Request ──────────────────────────────────────────────────
  const httpReq = buildHTTPRequest('example.com', '/index.html');
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort80, 80, clientSeq80 + 1, serverSeq80 + 1, TCP_PSH_ACK, httpReq
  ), 0, 150000);

  // ── 11. TCP ACK from server ───────────────────────────────────────────────
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    80, clientPort80, serverSeq80 + 1, clientSeq80 + 1 + httpReq.length, TCP_ACK
  ), 0, 180000);

  // ── 12. HTTP 200 OK Response ──────────────────────────────────────────────
  const httpRes = buildHTTPResponse(200, 'OK',
    '<!DOCTYPE html><html><head><title>Example Domain</title></head>' +
    '<body><h1>Example Domain</h1><p>This domain is for illustrative examples.</p></body></html>'
  );
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    80, clientPort80, serverSeq80 + 1, clientSeq80 + 1 + httpReq.length, TCP_PSH_ACK, httpRes
  ), 0, 200000);

  // ── 13. Client ACK of HTTP response ──────────────────────────────────────
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort80, 80,
    clientSeq80 + 1 + httpReq.length,
    serverSeq80 + 1 + httpRes.length,
    TCP_ACK
  ), 0, 215000);

  // ── 14. HTTP POST to a different server ──────────────────────────────────
  const clientPort80b = 49153;
  const serverPost = [10, 0, 0, 1];
  const httpPost = Buffer.from(
    'POST /api/login HTTP/1.1\r\n' +
    'Host: api.example.com\r\n' +
    'Content-Type: application/json\r\n' +
    'Content-Length: 37\r\n' +
    'Connection: keep-alive\r\n\r\n' +
    '{"username":"user","password":"pass"}',
    'ascii'
  );
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, serverPost,
    clientPort80b, 80, 0x30000000, 0, TCP_SYN
  ), 0, 230000);
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, serverPost, IP_CLIENT,
    80, clientPort80b, 0x40000000, 0x30000001, TCP_SYN_ACK
  ), 0, 240000);
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, serverPost,
    clientPort80b, 80, 0x30000001, 0x40000001, TCP_PSH_ACK, httpPost
  ), 0, 250000);

  // HTTP 401 Unauthorized
  const http401 = buildHTTPResponse(401, 'Unauthorized', '{"error":"Invalid credentials"}');
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, serverPost, IP_CLIENT,
    80, clientPort80b, 0x40000001, 0x30000001 + httpPost.length, TCP_PSH_ACK, http401
  ), 0, 280000);

  // ── 15-17. TCP handshake to port 443 (HTTPS) ─────────────────────────────
  const clientPort443 = 49154;
  const clientSeq443  = 0x50000000;
  const serverSeq443  = 0x60000000;

  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort443, 443, clientSeq443, 0, TCP_SYN
  ), 0, 300000);
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    443, clientPort443, serverSeq443, clientSeq443 + 1, TCP_SYN_ACK
  ), 0, 325000);
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort443, 443, clientSeq443 + 1, serverSeq443 + 1, TCP_ACK
  ), 0, 330000);

  // ── 18. TLS ClientHello ───────────────────────────────────────────────────
  const tlsHello = buildTLSClientHello();
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort443, 443, clientSeq443 + 1, serverSeq443 + 1, TCP_PSH_ACK, tlsHello
  ), 0, 350000);

  // ── 19. UDP NTP Request ───────────────────────────────────────────────────
  const ntpPayload = Buffer.alloc(48, 0);
  ntpPayload[0] = 0x1b; // LI=0, VN=3, Mode=3 (client)
  addPacket(buildIPv4UDPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_NTP, 123, 123, ntpPayload
  ), 0, 400000);

  // ── 20. More DNS queries (port scan simulation) ──────────────────────────
  const domains = ['github.com', 'stackoverflow.com', 'npmjs.com'];
  domains.forEach((domain, i) => {
    const txId = 0xcc00 + i;
    const query = buildDNSQuery(txId, domain);
    addPacket(buildIPv4UDPFrame(
      MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_DNS, 54330 + i, 53, query
    ), 0, 500000 + i * 50000);

    const resp = buildDNSResponse(txId, domain, [140, 82, 121, i + 3]);
    addPacket(buildIPv4UDPFrame(
      MAC_GATEWAY, MAC_CLIENT, IP_DNS, IP_CLIENT, 53, 54330 + i, resp
    ), 0, 520000 + i * 50000);
  });

  // ── Second client traffic (variety of source IPs) ─────────────────────────
  addPacket(0, 1, 0);  // advance time by 1 second

  const http2Req = buildHTTPRequest('httpbin.org', '/get');
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_CLIENT2, [54, 204, 11, 184],
    49160, 80, 0x70000000, 0, TCP_SYN
  ), 0, 10000);

  // HTTP 404 from another server
  const http404 = buildHTTPResponse(404, 'Not Found', '{"error":"Not Found"}');
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, [54, 204, 11, 184], IP_CLIENT2,
    80, 49160, 0x80000000, 0x70000001, TCP_PSH_ACK, http404
  ), 0, 50000);

  // FIN-ACK to close connection
  addPacket(buildIPv4TCPFrame(
    MAC_CLIENT, MAC_GATEWAY, IP_CLIENT, IP_SERVER,
    clientPort80, 80,
    clientSeq80 + 1 + httpReq.length,
    serverSeq80 + 1 + httpRes.length,
    TCP_FIN_ACK
  ), 1, 0);

  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    80, clientPort80,
    serverSeq80 + 1 + httpRes.length,
    clientSeq80 + 2 + httpReq.length,
    TCP_FIN_ACK
  ), 0, 25000);

  // HTTP 500 error
  const http500 = buildHTTPResponse(500, 'Internal Server Error', '{"error":"Server Error"}');
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, [172, 217, 14, 100], IP_CLIENT2,
    80, 49161, 0x90000001, 0xa0000001, TCP_PSH_ACK, http500
  ), 0, 100000);

  // HTTP 301 redirect
  const http301 = Buffer.from(
    'HTTP/1.1 301 Moved Permanently\r\n' +
    'Location: https://www.example.com/\r\n' +
    'Content-Length: 0\r\n\r\n',
    'ascii'
  );
  addPacket(buildIPv4TCPFrame(
    MAC_GATEWAY, MAC_CLIENT, IP_SERVER, IP_CLIENT,
    80, 49162, 0xb0000001, 0xc0000001, TCP_PSH_ACK, http301
  ), 0, 200000);

  return Buffer.concat(parts);
}

module.exports = { generateSamplePcap };
