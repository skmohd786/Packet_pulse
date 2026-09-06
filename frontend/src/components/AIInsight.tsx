import React, { useState } from 'react';
import { Bot, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { Incident } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AIAnalysis {
  summary: string;
  evidence: string[];
  probableCause: string;
  recommendedActions: string[];
  confidence: number;
}

interface AIInsightProps {
  incident: Incident;
}

export const AIInsight: React.FC<AIInsightProps> = ({ incident }) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete' | 'unconfigured' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const incId = incident.id || incident._id;

  const handleAnalyze = async () => {
    if (!incId) return;

    try {
      setStatus('analyzing');
      setErrorMessage(null);

      const res = await fetch(`${API_BASE}/api/ai/analyze-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: incId }),
      }).then((r) => r.json());

      if (!res.success) {
        if (res.code === 'GEMINI_API_KEY_MISSING' || res.code === 'LLM_API_KEY_MISSING') {
          setStatus('unconfigured');
          setErrorMessage(res.message || 'Configure GEMINI_API_KEY in environment to enable AI analysis.');
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'Gemini AI analysis request failed.');
        }
        return;
      }

      setAnalysis(res.analysis);
      setStatus('complete');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Network error executing Gemini AI analysis.');
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800/80 font-mono text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI INCIDENT ANALYSIS (GEMINI)</span>
        </div>

        {status === 'idle' && (
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 rounded text-[11px] font-semibold transition"
          >
            <Bot className="w-3 h-3" />
            <span>[ Analyze Incident ]</span>
          </button>
        )}
      </div>

      {status === 'analyzing' && (
        <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-zinc-400 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>Analyzing incident telemetry with Google Gemini...</span>
        </div>
      )}

      {status === 'unconfigured' && (
        <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-zinc-400">
          <div className="flex items-center gap-2 text-amber-400 mb-1 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Gemini Intelligence Unconfigured</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Configure <code className="text-emerald-400">GEMINI_API_KEY</code> in environment variables to enable AI observability intelligence.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-3 bg-zinc-950 rounded border border-rose-900/60 text-rose-300">
          <div className="flex items-center justify-between mb-1 font-semibold">
            <span>Gemini Error: {errorMessage}</span>
            <button
              onClick={handleAnalyze}
              className="text-[10px] text-rose-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {status === 'complete' && analysis && (
        <div className="space-y-3 bg-zinc-950 p-3.5 rounded border border-zinc-800/80">
          {/* Header Summary & Confidence Pill */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
            <div className="text-zinc-200 font-bold">Summary</div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
              <span>Confidence: {analysis.confidence}%</span>
            </div>
          </div>
          <p className="text-zinc-300 leading-relaxed">{analysis.summary}</p>

          {/* Evidence (Observed Facts) */}
          <div>
            <div className="text-zinc-400 font-bold mb-1">Evidence (Observed Facts)</div>
            <ul className="space-y-1 text-zinc-400 pl-1">
              {analysis.evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Probable Cause */}
          <div>
            <div className="text-zinc-400 font-bold mb-1">Probable Cause</div>
            <p className="text-amber-300/90">{analysis.probableCause}</p>
          </div>

          {/* Recommended Actions */}
          <div>
            <div className="text-zinc-400 font-bold mb-1">Recommended Actions</div>
            <ol className="space-y-1 text-zinc-300 pl-1">
              {analysis.recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
