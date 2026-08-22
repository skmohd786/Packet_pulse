import {
    dbGetMonitors,
    dbInsertMetric,
    dbUpdateMonitorStatus,
    dbCalculateUptime,
    dbGetOpenIncidentForMonitor,
    dbInsertIncident,
    dbResolveIncident
} from '../db';
import { performHealthCheck } from './healthChecker';

let isRunning = false;
const checkIntervalMs = 4000; // 4-second monitoring loop

export function initMonitorEngine() {
    if (!isRunning) {
        isRunning = true;
        console.log(`PacketPulse Monitoring Engine started (Interval: ${checkIntervalMs}ms)`);
        runMonitoringCycle();
        setInterval(runMonitoringCycle, checkIntervalMs);
    }
}

export async function runMonitoringCycle() {
    try {
        const monitors = await dbGetMonitors();
        if (monitors.length === 0) return;

        for (const monitor of monitors) {
            // Perform real HTTP health check
            const check = await performHealthCheck(monitor.url);

            // Store metric in PostgreSQL database
            await dbInsertMetric({
                monitor_id: monitor.id,
                status_code: check.statusCode,
                response_time_ms: check.responseTimeMs,
                status: check.status,
                dns_time_ms: check.dnsTimeMs,
                is_up: check.isUp,
                error_message: check.errorMessage
            });

            // Calculate overall availability and uptime percentage
            const uptime = await dbCalculateUptime(monitor.id);

            // Update monitor status and metrics in PostgreSQL
            await dbUpdateMonitorStatus(
                monitor.id,
                check.status,
                check.statusCode,
                check.responseTimeMs,
                uptime
            );

            // Incident Detection & Handling
            const openIncident = await dbGetOpenIncidentForMonitor(monitor.id);

            if (check.status === 'CRITICAL' && !openIncident) {
                const title = !check.isUp
                    ? `Outage Detected: ${monitor.name} is UNREACHABLE`
                    : `High Latency / Error: ${monitor.name} returned HTTP ${check.statusCode || 'N/A'}`;
                const details = check.errorMessage
                    ? `Health check failed: ${check.errorMessage}`
                    : `Monitor ${monitor.domain} returned status code ${check.statusCode} with latency ${check.responseTimeMs}ms`;

                await dbInsertIncident({
                    monitor_id: monitor.id,
                    title,
                    severity: 'CRITICAL',
                    details
                });
            } else if (check.status === 'HEALTHY' && openIncident) {
                await dbResolveIncident(openIncident.id);
            }
        }
    } catch (err: any) {
        console.error('Error during website monitoring cycle:', err.message);
    }
}
