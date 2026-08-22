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

    // Perform DNS lookup timing
    const dnsStart = performance.now();
    let dnsTimeMs = 0;
    try {
        await dns.promises.resolve4(parsedUrl.hostname);
        dnsTimeMs = Math.round(performance.now() - dnsStart);
    } catch (dnsErr: any) {
        dnsTimeMs = Math.round(performance.now() - dnsStart);
        // DNS failure might occur for local/test URLs, so we log but continue to attempt fetch if possible
    }

    // Perform real HTTP Health Check
    const httpStart = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
        const isUp = statusCode >= 200 && statusCode < 400;

        let status: HealthStatus = 'HEALTHY';
        if (!isUp) {
            status = 'CRITICAL';
        } else if (responseTimeMs > 1000) {
            status = 'WARNING';
        } else if (responseTimeMs > 2500) {
            status = 'CRITICAL';
        }

        return {
            statusCode,
            responseTimeMs,
            dnsTimeMs,
            isUp,
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
            errorMessage: isTimeout ? 'Request timed out (10s limit)' : (err.message || 'Network connection error'),
            status: 'CRITICAL',
        };
    }
}
