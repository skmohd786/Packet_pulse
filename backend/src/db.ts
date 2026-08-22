import { Pool } from 'pg';
import dotenv from 'dotenv';
import { Monitor, Metric, Incident } from './types';

dotenv.config();

let usePg = false;

export const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'packetpulse',
    connectionTimeoutMillis: 2000,
});

// In-Memory Fallback State (used seamlessly if PostgreSQL server is not running locally)
const memoryStore = {
    monitors: [] as Monitor[],
    metrics: [] as Metric[],
    incidents: [] as Incident[],
    monitorIdCounter: 1,
    metricIdCounter: 1,
    incidentIdCounter: 1,
};

export async function initDb() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL database!');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS monitors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                domain VARCHAR(255) NOT NULL UNIQUE,
                url VARCHAR(500) NOT NULL,
                check_interval_seconds INT NOT NULL DEFAULT 5,
                status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
                last_status_code INT,
                last_response_time_ms INT,
                uptime_percentage NUMERIC(5, 2) DEFAULT 100.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS metrics (
                id SERIAL PRIMARY KEY,
                monitor_id INT REFERENCES monitors(id) ON DELETE CASCADE,
                status_code INT,
                response_time_ms INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                dns_time_ms INT DEFAULT 0,
                is_up BOOLEAN NOT NULL DEFAULT true,
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS incidents (
                id SERIAL PRIMARY KEY,
                monitor_id INT REFERENCES monitors(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                severity VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
                details TEXT,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE
            );
        `);
        
        client.release();
        usePg = true;
        console.log('PostgreSQL schema initialized.');
    } catch (err: any) {
        console.warn('PostgreSQL connection warning:', err.message);
        console.warn('Using in-memory SQL state fallback for PacketPulse MVP database operations.');
        usePg = false;

        // Populate initial default monitors in memory for out-of-the-box demo
        if (memoryStore.monitors.length === 0) {
            dbInsertMonitor('Example Website', 'example.com', 'https://example.com', 5);
            dbInsertMonitor('Google', 'google.com', 'https://google.com', 5);
            dbInsertMonitor('HTTPStat Test 500', 'httpstat.us/500', 'https://httpstat.us/500', 5);
        }
    }
}

export async function dbGetMonitors(): Promise<Monitor[]> {
    if (usePg) {
        const res = await pool.query('SELECT * FROM monitors ORDER BY id DESC');
        return res.rows.map(r => ({
            ...r,
            uptime_percentage: parseFloat(r.uptime_percentage || '100')
        }));
    }
    return memoryStore.monitors;
}

export async function dbGetMonitorById(id: number): Promise<Monitor | null> {
    if (usePg) {
        const res = await pool.query('SELECT * FROM monitors WHERE id = $1', [id]);
        if (res.rows.length === 0) return null;
        return {
            ...res.rows[0],
            uptime_percentage: parseFloat(res.rows[0].uptime_percentage || '100')
        };
    }
    return memoryStore.monitors.find(m => m.id === id) || null;
}

export async function dbInsertMonitor(name: string, domain: string, url: string, intervalSeconds: number): Promise<Monitor> {
    if (usePg) {
        const res = await pool.query(
            `INSERT INTO monitors (name, domain, url, check_interval_seconds, status, uptime_percentage)
             VALUES ($1, $2, $3, $4, 'HEALTHY', 100.00)
             RETURNING *`,
            [name, domain, url, intervalSeconds]
        );
        return {
            ...res.rows[0],
            uptime_percentage: parseFloat(res.rows[0].uptime_percentage || '100')
        };
    }

    const existing = memoryStore.monitors.find(m => m.domain === domain);
    if (existing) return existing;

    const newMon: Monitor = {
        id: memoryStore.monitorIdCounter++,
        name,
        domain,
        url,
        check_interval_seconds: intervalSeconds,
        status: 'HEALTHY',
        last_status_code: null,
        last_response_time_ms: null,
        uptime_percentage: 100.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    memoryStore.monitors.unshift(newMon);
    return newMon;
}

export async function dbUpdateMonitorStatus(
    id: number,
    status: Monitor['status'],
    statusCode: number | null,
    responseTimeMs: number,
    uptimePercentage: number
): Promise<void> {
    if (usePg) {
        await pool.query(
            `UPDATE monitors
             SET status = $1, last_status_code = $2, last_response_time_ms = $3, uptime_percentage = $4, updated_at = NOW()
             WHERE id = $5`,
            [status, statusCode, responseTimeMs, uptimePercentage, id]
        );
        return;
    }

    const mon = memoryStore.monitors.find(m => m.id === id);
    if (mon) {
        mon.status = status;
        mon.last_status_code = statusCode;
        mon.last_response_time_ms = responseTimeMs;
        mon.uptime_percentage = uptimePercentage;
        mon.updated_at = new Date().toISOString();
    }
}

export async function dbDeleteMonitor(id: number): Promise<boolean> {
    if (usePg) {
        const res = await pool.query('DELETE FROM monitors WHERE id = $1', [id]);
        return (res.rowCount || 0) > 0;
    }

    const idx = memoryStore.monitors.findIndex(m => m.id === id);
    if (idx !== -1) {
        memoryStore.monitors.splice(idx, 1);
        memoryStore.metrics = memoryStore.metrics.filter(m => m.monitor_id !== id);
        memoryStore.incidents = memoryStore.incidents.filter(i => i.monitor_id !== id);
        return true;
    }
    return false;
}

export async function dbInsertMetric(metric: Omit<Metric, 'id' | 'created_at'>): Promise<Metric> {
    if (usePg) {
        const res = await pool.query(
            `INSERT INTO metrics (monitor_id, status_code, response_time_ms, status, dns_time_ms, is_up, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                metric.monitor_id,
                metric.status_code,
                metric.response_time_ms,
                metric.status,
                metric.dns_time_ms,
                metric.is_up,
                metric.error_message || null
            ]
        );
        return res.rows[0];
    }

    const newMetric: Metric = {
        id: memoryStore.metricIdCounter++,
        ...metric,
        created_at: new Date().toISOString()
    };
    memoryStore.metrics.push(newMetric);
    // Keep max 500 metrics in memory store
    if (memoryStore.metrics.length > 500) {
        memoryStore.metrics.shift();
    }
    return newMetric;
}

export async function dbGetMetricsByMonitorId(monitorId: number, limit = 50): Promise<Metric[]> {
    if (usePg) {
        const res = await pool.query(
            'SELECT * FROM metrics WHERE monitor_id = $1 ORDER BY id DESC LIMIT $2',
            [monitorId, limit]
        );
        return res.rows.reverse();
    }

    return memoryStore.metrics
        .filter(m => m.monitor_id === monitorId)
        .slice(-limit);
}

export async function dbCalculateUptime(monitorId: number): Promise<number> {
    if (usePg) {
        const res = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN is_up = true THEN 1 ELSE 0 END) as up_count
             FROM metrics WHERE monitor_id = $1`,
            [monitorId]
        );
        const total = parseInt(res.rows[0]?.total || '0');
        const upCount = parseInt(res.rows[0]?.up_count || '0');
        if (total === 0) return 100.0;
        return parseFloat(((upCount / total) * 100).toFixed(2));
    }

    const monMetrics = memoryStore.metrics.filter(m => m.monitor_id === monitorId);
    if (monMetrics.length === 0) return 100.0;
    const upCount = monMetrics.filter(m => m.is_up).length;
    return parseFloat(((upCount / monMetrics.length) * 100).toFixed(2));
}

export async function dbInsertIncident(incident: Omit<Incident, 'id' | 'started_at' | 'status'> & { status?: Incident['status'] }): Promise<Incident> {
    const status = incident.status || 'OPEN';
    if (usePg) {
        const res = await pool.query(
            `INSERT INTO incidents (monitor_id, title, severity, status, details)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [incident.monitor_id, incident.title, incident.severity, status, incident.details]
        );
        return res.rows[0];
    }

    const newInc: Incident = {
        id: memoryStore.incidentIdCounter++,
        ...incident,
        status,
        started_at: new Date().toISOString()
    };
    memoryStore.incidents.unshift(newInc);
    return newInc;
}

export async function dbGetOpenIncidentForMonitor(monitorId: number): Promise<Incident | null> {
    if (usePg) {
        const res = await pool.query(
            `SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'OPEN' ORDER BY id DESC LIMIT 1`,
            [monitorId]
        );
        return res.rows[0] || null;
    }
    return memoryStore.incidents.find(i => i.monitor_id === monitorId && i.status === 'OPEN') || null;
}

export async function dbResolveIncident(incidentId: number): Promise<Incident | null> {
    if (usePg) {
        const res = await pool.query(
            `UPDATE incidents SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1 RETURNING *`,
            [incidentId]
        );
        return res.rows[0] || null;
    }

    const inc = memoryStore.incidents.find(i => i.id === incidentId);
    if (inc) {
        inc.status = 'RESOLVED';
        inc.resolved_at = new Date().toISOString();
        return inc;
    }
    return null;
}

export async function dbGetIncidents(limit = 20): Promise<Incident[]> {
    if (usePg) {
        const res = await pool.query('SELECT * FROM incidents ORDER BY id DESC LIMIT $1', [limit]);
        return res.rows;
    }
    return memoryStore.incidents.slice(0, limit);
}
