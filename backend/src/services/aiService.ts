import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { Incident, Metric } from '../types';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface AIAnalysisResult {
    summary: string;
    evidence: string[];
    probableCause: string;
    recommendedActions: string[];
    confidence: number;
}

export async function analyzeIncidentTelemetry(
    incident: Incident,
    metrics: Metric[]
): Promise<AIAnalysisResult> {
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
        const error: any = new Error('GEMINI_API_KEY is not configured in environment variables');
        error.code = 'GEMINI_API_KEY_MISSING';
        throw error;
    }
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const domain = incident.domain || 'Target Domain';
    const severity = incident.severity || 'CRITICAL';
    const title = incident.title || incident.message || `Incident on ${domain}`;
    const details = incident.details || 'Telemetry error observed';
    const startedAt = incident.started_at || incident.timestamp || new Date().toISOString();

    // Format metrics telemetry context
    const metricTelemetry = metrics.slice(0, 10).map((m) => {
        const time = new Date(m.created_at || m.timestamp || Date.now()).toLocaleTimeString();
        const latency = m.response_time_ms ?? m.responseTime ?? 0;
        const status = m.status_code ?? m.httpStatus ?? 'ERR';
        return `[${time}] HTTP: ${status} | Latency: ${latency}ms | Status: ${m.status}`;
    }).join('\n');

    const prompt = `You are PacketPulse AI, an expert observability and site reliability engineering assistant powered by Google Gemini.
Analyze the following real monitoring incident data:

Target Domain: ${domain}
Incident Title: ${title}
Severity: ${severity}
Started At: ${startedAt}
Details: ${details}

Recent Telemetry Metrics:
${metricTelemetry || 'No recent telemetry pings captured.'}

Instructions:
Provide a developer-oriented root cause analysis. Strictly distinguish observed facts from possible causes.
Return ONLY valid JSON matching this exact structure:
{
  "summary": "Short developer summary of the incident (1-2 sentences)",
  "evidence": [
    "Observed fact 1 (e.g. Latency increased from X ms to Y ms)",
    "Observed fact 2 (e.g. HTTP status code detected)"
  ],
  "probableCause": "Likely root cause based on telemetry evidence",
  "recommendedActions": [
    "1. Practical step 1",
    "2. Practical step 2",
    "3. Practical step 3"
  ],
  "confidence": 85
}`;

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            },
        });

        const rawText = response.text || '';
        
        // Clean JSON formatting if model returns code fences
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || `${domain} experienced a ${severity} condition.`,
                evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [`Severity: ${severity}`, `Details: ${details}`],
                probableCause: parsed.probableCause || `Probable upstream latency or service degradation on ${domain}.`,
                recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : ['Check server health', 'Inspect logs', 'Check network connectivity'],
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 75,
            };
        }

        throw new Error('Failed to parse structured JSON response from Gemini');
    } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            throw new Error('Invalid GEMINI_API_KEY provided. Please check your Gemini API key in .env');
        }
        if (msg.includes('NOT_FOUND') || msg.includes('models/')) {
            throw new Error(`Gemini model '${modelName}' not found or unavailable. Please check GEMINI_MODEL.`);
        }
        throw new Error(msg || 'Gemini AI API request failed');
    }
}
