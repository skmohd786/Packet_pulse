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
        console.log(`PacketPulse Incident Engine started (Cycle: ${checkIntervalMs}ms)`);
        runMonitoringCycle();
        setInterval(runMonitoringCycle, checkIntervalMs);
    }
}

export async function runMonitoringCycle() {
    try {
        const monitors = await dbGetMonitors();
        if (monitors.length === 0) return;

        for (const monitor of monitors) {
            // Perform real HTTP health check against domain
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

            // Calculate aggregate availability and uptime percentage
            const uptime = await dbCalculateUptime(monitor.id);

            // Update monitor status in PostgreSQL
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

            // CHECKPOINT 4: INCIDENT DETECTION & DEDUPLICATION LOGIC
            const openIncident = await dbGetOpenIncidentForMonitor(monitor.id);

            if (check.status === 'CRITICAL' || check.status === 'WARNING') {
                const severity = check.status;
                let title = `${severity} Incident: ${monitor.domain}`;
                if (!check.isUp) {
                    title = `CRITICAL Failure: ${monitor.domain} Request Failed`;
                } else if (check.statusCode && check.statusCode >= 500) {
                    title = `CRITICAL Error: ${monitor.domain} returned HTTP ${check.statusCode}`;
                } else if (check.responseTimeMs >= 2000) {
                    title = `CRITICAL Latency: ${monitor.domain} (${check.responseTimeMs}ms >= 2000ms)`;
                } else if (check.responseTimeMs >= 500) {
                    title = `WARNING Latency: ${monitor.domain} (${check.responseTimeMs}ms >= 500ms)`;
                }

                const details = check.errorMessage
                    ? `Domain: ${monitor.domain} | Severity: ${severity} | Telemetry: ${check.errorMessage} | HTTP: ${check.statusCode ?? 'N/A'} | Ping: ${check.responseTimeMs}ms`
                    : `Domain: ${monitor.domain} | Severity: ${severity} | HTTP: ${check.statusCode ?? 'N/A'} | Ping: ${check.responseTimeMs}ms`;

                if (!openIncident) {
                    // Create new Incident record in PostgreSQL
                    const incident = await dbInsertIncident({
                        monitor_id: monitor.id,
                        title,
                        severity,
                        details,
                        status: 'OPEN'
                    });

                    // Emit real-time WebSocket incident alert
                    if (ioInstance) {
                        ioInstance.emit('incident:new', incident);
                    }
                } else {
                    // Prevent duplicate incidents during continuous failure.
                    // If severity escalated from WARNING to CRITICAL, update existing open incident.
                    if (openIncident.severity === 'WARNING' && severity === 'CRITICAL') {
                        openIncident.severity = 'CRITICAL';
                        openIncident.title = title;
                        openIncident.details = details;

                        if (ioInstance) {
                            ioInstance.emit('incident:update', openIncident);
                        }
                    }
                }
            } else if (check.status === 'HEALTHY' && openIncident) {
                // Auto-resolve incident when health condition recovers
                const resolved = await dbResolveIncident(openIncident.id);
                if (resolved && ioInstance) {
                    ioInstance.emit('incident:resolved', resolved);
                }
            }

            // Real-Time Socket.IO Telemetry Emission
            if (ioInstance) {
                ioInstance.emit('metric:new', {
                    monitorId: monitor.id,
                    metric,
                    monitor: updatedMonitor
                });
            }
        }
    } catch (err: any) {
        console.error('Error during incident monitoring cycle:', err.message);
    }
}
