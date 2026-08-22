import axios from 'axios';

// Determine API base URL (supports VITE_API_URL env var or fallback relative path)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Axios instance pointing to the backend
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 min for large file uploads
});

// ── Upload a .pcap file ──────────────────────────────────────────────────────
export const uploadPcap = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('pcapFile', file);

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(pct);
      }
    },
  });
  return response.data;
};

// ── Generate and use the built-in sample PCAP ────────────────────────────────
export const loadSamplePcap = async () => {
  const response = await api.post('/sample');
  return response.data;
};

// ── Get paginated packet list (with optional filters) ─────────────────────────
export const getPackets = async (fileId, params = {}) => {
  const response = await api.get(`/packets/${fileId}`, { params });
  return response.data;
};

// ── Get full packet detail + hex view ────────────────────────────────────────
export const getPacketDetail = async (fileId, packetNumber) => {
  const response = await api.get(`/packets/${fileId}/details/${packetNumber}`);
  return response.data;
};

// ── Get statistics and chart data ────────────────────────────────────────────
export const getStats = async (fileId) => {
  const response = await api.get(`/packets/${fileId}/stats`);
  return response.data;
};

export default api;
