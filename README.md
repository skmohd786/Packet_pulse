# PacketPulse — Web-Based Network Packet Analyzer

**PacketPulse** is a modern, high-performance web application inspired by Wireshark for parsing, decoding, analyzing, and visualizing network packet capture (`.pcap`) files.

---

## Features

- 📁 **PCAP File Upload**: Drag-and-drop or select `.pcap`, `.pcapng`, or `.cap` files (up to 100MB).
- ⚡ **Instant Sample Capture**: 1-click built-in test PCAP generator synthesizing ARP, DNS, TCP 3-way handshakes, HTTP GET/POST requests & responses, HTTPS/TLS ClientHello metadata, and UDP NTP packets.
- 🔬 **Layered Protocol Decoding**:
  - **Link Layer**: Ethernet II, IEEE 802.1Q VLAN, Linux Cooked (SLL), BSD Loopback.
  - **Network Layer**: IPv4, IPv6, ARP.
  - **Transport Layer**: TCP (with SYN, ACK, FIN, RST, PSH, URG flags, window size, sequence numbers), UDP, ICMP.
  - **Application Layer**: DNS (queries, responses, A/AAAA records, transaction IDs, domain name pointer compression decoding), HTTP (methods, status codes 200, 301, 401, 404, 500, headers), HTTPS/TLS (record & handshake types).
- 📊 **Interactive Dashboard & Visualizations**:
  - **Protocol Distribution**: Recharts Donut/Pie Chart.
  - **Traffic Over Time**: Recharts Area/Line Chart with time-bucketed volume.
  - **Top Source IPs**: Recharts Horizontal Bar Chart highlighting top traffic sources.
- 🔍 **Live Search & Protocol Filters**: Search by IP, port, protocol, packet number, domain name, or HTTP path; filter by TCP, UDP, DNS, HTTP, HTTPS, ARP, ICMP.
- 💻 **Hex & ASCII Payload Inspector**: Click any packet row to inspect full layer header breakdowns and an interactive hex/ASCII byte grid (`0000 45 00 00 3c ... |E..<|`).

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Custom Dark Cyber Theme), React Router DOM v6, Recharts, Lucide Icons, Axios.
- **Backend**: Node.js, Express.js, Multer (file upload validation), UUID, CORS, dotenv.
- **Parser**: Pure JavaScript binary PCAP parser (`server/parser/pcapBinaryParser.js`) reading `libpcap` global headers and packet records without native C/C++ dependencies.

---

## Architecture & Parsing Notes

PacketPulse implements a pure JavaScript binary parser for the standard `libpcap` file format (`0xa1b2c3d4` / `0xd4c3b2a1` magic numbers). This approach provides several key benefits:
1. **Zero Native C/C++ Dependencies**: Eliminates `pcap.h` / `wpcap.dll` compilation issues across Windows, Linux, and macOS.
2. **Defensive Parsing**: Each packet record decode step is wrapped in isolated try-catch blocks to ensure corrupted, malformed, or non-standard frames (e.g., truncated payloads or unknown EtherTypes) do not crash the parse stream.
3. **Optimized Payload Delivery**: Packet list API responses exclude raw hex buffers to keep list payloads lightweight, streaming raw hex data only when an individual packet is clicked for detail inspection.

---

## Project Structure

```
PacketPulse/
├── client/
│   ├── src/
│   │   ├── api/              (Axios client methods)
│   │   ├── charts/           (ProtocolPieChart, TrafficTimeChart, TopIPsBarChart)
│   │   ├── components/       (Header, StatCard, PacketTable, PacketDetailModal)
│   │   ├── pages/            (UploadPage, DashboardPage)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css         (Tailwind design system & theme tokens)
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/
│   ├── controllers/         (packetController.js - API & caching logic)
│   ├── parser/              (pcapBinaryParser.js, protocolDecoder.js, sampleGenerator.js)
│   ├── routes/              (api.js - Express endpoints)
│   ├── uploads/             (Runtime storage for uploaded captures)
│   ├── app.js               (Express server entry point)
│   └── package.json
│
├── README.md
└── package.json             (Root package managing dev scripts via concurrently)
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

Run the setup command from the project root to install dependencies across root, server, and client:

```bash
npm run setup
```

Alternatively, install individually:

```bash
# Root dependencies
npm install

# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../client && npm install
```

---

## Running the Application

To start both the Express backend (port `5000`) and the Vite frontend dev server (port `5173`) with a single command, run:

```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Upload `.pcap` / `.pcapng` / `.cap` file (multipart form data) |
| `POST` | `/api/sample` | Synthesize & parse built-in sample `.pcap` capture |
| `GET` | `/api/packets/:fileId` | Get paginated packet list (supports `?page=`, `?limit=`, `?protocol=`, `?query=`, `?ip=`, `?port=`) |
| `GET` | `/api/packets/:fileId/details/:packetNumber` | Get full packet details and formatted Hex/ASCII view |
| `GET` | `/api/packets/:fileId/stats` | Get aggregate traffic stats and chart datasets |
