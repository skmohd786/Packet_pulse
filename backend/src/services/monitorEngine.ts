import { Server as SocketIOServer } from 'socket.io';
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

let ioInstance: SocketIOServer | null = null;
let isRunning = false;
const checkIntervalMs = 4000; // 4-second monitoring loop

export function initMonitorEngine(io?: SocketIOServer) {
    if (io) {
        ioInstance = io;
    }
    if (!isRunning) {
        isRunning = true;
        console.log(`PacketPulse Real-Time Monitoring Engine started (Interval: ${checkIntervalMs}ms)`);
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
            const metric = await dbInsertMetric({
                monitor_id: monitor.id,
                status_code: check.statusCode,
                response_time_ms: check.responseTimeMs,
                status: check.status,
                dns_time_ms: check.dnsTimeMs,
                is_up: check.isUp,
                error_message: check.errorMessage
            });

            // Calculate aggregate uptime percentage
            const uptime = await dbCalculateUptime(monitor.id);

            // Update monitor status and metrics in PostgreSQL
            await dbUpdateMonitorStatus(
                monitor.id,
                check.status,
                check.statusCode,
                check.responseTimeMs,
                uptime
            );

            const updatedMonitor = {
                ...monitor,
                status: check.status,
                last_status_code: check.statusCode,
                last_response_time_ms: check.responseTimeMs,
                uptime_percentage: uptime,
                updated_at: new Date().toISOString()
            };

            // Incident Detection & Handling
            const openIncident = await dbGetOpenIncidentForMonitor(monitor.id);

            if (check.status === 'CRITICAL' && !openIncident) {
                const title = !check.isUp
                    ? `Outage Detected: ${monitor.name} is UNREACHABLE`
                    : `High Latency / Error: ${monitor.name} returned HTTP ${check.statusCode || 'N/A'}`;
                const details = check.errorMessage
                    ? `Health check failed: ${check.errorMessage}`
                    : `Monitor ${monitor.domain} returned status code ${check.statusCode} with latency ${check.responseTimeMs}ms`;

                const incident = await dbInsertIncident({
                    monitor_id: monitor.id,
                    title,
                    severity: 'CRITICAL',
                    details
                });

                if (ioInstance) {
                    ioInstance.emit('incident:new', incident);
                }
            } else if (check.status === 'HEALTHY' && openIncident) {
                const resolved = await dbResolveIncident(openIncident.id);
                if (resolved && ioInstance) {
                    ioInstance.emit('incident:resolved', resolved);
                }
            }

            // Real-Time Socket.IO Telemetry Stream
            // Flow: Monitoring Engine -> New Metric -> Node.js -> Socket.IO -> React Dashboard
            if (ioInstance) {
                ioInstance.emit('metric:new', {
                    monitorId: monitor.id,
                    metric,
                    monitor: updatedMonitor
                });
            }
        }
    } catch (err: any) {
        console.error('Error during real-time website monitoring cycle:', err.message);
    }
}
