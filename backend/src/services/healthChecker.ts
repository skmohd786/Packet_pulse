import dns from 'dns';
import { CheckResult, HealthStatus } from '../types';

export async function performHealthCheck(urlStr: string): Promise<CheckResult> {
    const formattedUrl = urlStr.startsWith('http://') || urlStr.startsWith('https://')
        ? urlStr
        : `https://${urlStr}`;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(formattedUrl);
    } catch {
        return {
            statusCode: null,
            responseTimeMs: 0,
            dnsTimeMs: 0,
            isUp: false,
            errorMessage: 'Invalid URL format',
            status: 'CRITICAL',
        };
    }

    // DNS lookup timing
    const dnsStart = performance.now();
    let dnsTimeMs = 0;
    try {
        await dns.promises.resolve4(parsedUrl.hostname);
        dnsTimeMs = Math.round(performance.now() - dnsStart);
    } catch (dnsErr: any) {
        dnsTimeMs = Math.round(performance.now() - dnsStart);
    }

    // Perform real HTTP Health Check
    const httpStart = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout limit

    try {
        const response = await fetch(formattedUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'PacketPulse-HealthChecker/1.0',
                'Accept': '*/*',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTimeMs = Math.round(performance.now() - httpStart);
        const statusCode = response.status;
        const isUp = statusCode >= 200 && statusCode < 500; // 500+ considered server failure

        // Checkpoint 4 Incident Threshold Rules Evaluation:
        // Rule 1: HTTP Request Fails -> CRITICAL
        // Rule 2: HTTP Status >= 500 -> CRITICAL
        // Rule 3: Response Time >= 2000ms -> CRITICAL
        // Rule 4: Response Time >= 500ms -> WARNING
        let status: HealthStatus = 'HEALTHY';
        let errorMessage: string | undefined = undefined;

        if (statusCode >= 500) {
            status = 'CRITICAL';
            errorMessage = `HTTP ${statusCode} Server Error`;
        } else if (responseTimeMs >= 2000) {
            status = 'CRITICAL';
            errorMessage = `High Latency: ${responseTimeMs}ms >= 2000ms threshold`;
        } else if (responseTimeMs >= 500) {
            status = 'WARNING';
            errorMessage = `Elevated Latency: ${responseTimeMs}ms >= 500ms threshold`;
        }

        return {
            statusCode,
            responseTimeMs,
            dnsTimeMs,
            isUp,
            errorMessage,
            status,
        };
    } catch (err: any) {
        clearTimeout(timeoutId);
        const responseTimeMs = Math.round(performance.now() - httpStart);
        const isTimeout = err.name === 'AbortError';
        
        return {
            statusCode: isTimeout ? 504 : null,
            responseTimeMs: isTimeout ? 10000 : responseTimeMs,
            dnsTimeMs,
            isUp: false,
            errorMessage: isTimeout ? 'HTTP Request Timeout (10s limit)' : (err.message || 'HTTP Request Connection Failed'),
            status: 'CRITICAL', // Rule 1: HTTP request fails -> CRITICAL
        };
    }
}
