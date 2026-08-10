import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, AlertCircle, Loader2, Zap,
  Shield, Search, BarChart3, Activity, CheckCircle2
} from 'lucide-react';
import { uploadPcap, loadSamplePcap } from '../api';

const FEATURES = [
  { icon: Search,    title: 'Deep Packet Inspection',  desc: 'Decode TCP, UDP, DNS, HTTP headers & payloads' },
  { icon: BarChart3, title: 'Traffic Analytics',        desc: 'Protocol distribution, traffic flow, top IPs' },
  { icon: Shield,    title: 'Protocol Decoding',        desc: 'Ethernet → IP → Transport → Application layers' },
  { icon: Activity,  title: 'Live Search & Filter',     desc: 'Search by IP, port, protocol, or packet number' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pcap', 'pcapng', 'cap'].includes(ext)) {
      return `Invalid file type ".${ext}". Please upload a .pcap, .pcapng, or .cap file.`;
    }
    if (file.size > 100 * 1024 * 1024) {
      return 'File is too large. Maximum allowed size is 100MB.';
    }
    return null;
  };

  const handleFileSelect = (file) => {
    const err = validateFile(file);
    if (err) { setError(err); setSelectedFile(null); return; }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadPcap(selectedFile, setProgress);
      navigate(`/dashboard/${result.fileId}`, {
        state: { filename: selectedFile.name, packetCount: result.packetCount, fileInfo: result.fileInfo },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSample = async () => {
    setSampleLoading(true);
    setError(null);
    try {
      const result = await loadSamplePcap();
      navigate(`/dashboard/${result.fileId}`, {
        state: { filename: 'sample-capture.pcap', packetCount: result.packetCount, fileInfo: result.fileInfo },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load sample.');
      setSampleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-grid relative flex flex-col">
      {/* Header */}
      <header className="border-b border-bg-border bg-bg-secondary/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-gradient flex items-center justify-center shadow-glow-cyan">
            <Activity size={16} className="text-bg-primary" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-text-primary">Packet</span>
          <span className="text-base font-bold text-accent-cyan">Pulse</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl animate-slide-up">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-cyan/10 border border-accent-cyan/20 rounded-full text-xs text-accent-cyan font-medium mb-5">
              <Zap size={11} />
              Network Packet Analyzer
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary leading-tight mb-4">
              Inspect Network Traffic<br />
              <span className="text-transparent bg-clip-text bg-accent-gradient">
                Like a Pro
              </span>
            </h1>
            <p className="text-text-secondary max-w-lg mx-auto leading-relaxed">
              Upload a <code className="text-accent-cyan font-mono bg-bg-elevated px-1 rounded">.pcap</code> capture file to decode packets, visualize protocols, and explore traffic patterns in your browser.
            </p>
          </div>

          {/* Upload Card */}
          <div className="card p-6 sm:p-8 mb-4">
            {/* Drop Zone */}
            <div
              className={`drop-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragging
                  ? 'border-accent-cyan bg-accent-cyan/5 shadow-glow-cyan drag-over'
                  : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-bg-border hover:border-accent-cyan/40 hover:bg-bg-elevated/50'
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pcap,.pcapng,.cap"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{selectedFile.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">Click to change file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-accent-cyan/10 flex items-center justify-center transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
                    <Upload size={26} className="text-accent-cyan" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {isDragging ? 'Drop it!' : 'Drop your .pcap file here'}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">or click to browse</p>
                  </div>
                  <p className="text-xs text-text-muted">Supports .pcap, .pcapng, .cap · Max 100MB</p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-secondary mb-1.5">
                  <span>Uploading & parsing…</span>
                  <span className="font-mono text-accent-cyan">{progress}%</span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="progress-bar h-full rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {uploading
                  ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
                  : <><FileText size={16} /> Analyze Capture</>
                }
              </button>

              <button
                onClick={handleSample}
                disabled={uploading || sampleLoading}
                className="btn-secondary flex-1 justify-center"
              >
                {sampleLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                  : <><Zap size={16} /> Try Sample PCAP</>
                }
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-elevated p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-accent-cyan" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">{title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
