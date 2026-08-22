import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MonitorModel } from './models/Monitor';
import { MetricModel } from './models/Metric';
import { IncidentModel } from './models/Incident';
import { Monitor, Metric, Incident } from './types';

dotenv.config();

let useMongo = false;

// Fallback In-Memory Document Store (used if MongoDB connection is unavailable)
const memoryStore = {
    monitors: [] as any[],
    metrics: [] as any[],
    incidents: [] as any[],
    counter: 1,
};

export async function initDb() {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoUri.trim()) {
        try {
            await mongoose.connect(mongoUri.trim(), {
                serverSelectionTimeoutMS: 4000,
            });
            useMongo = true;
            console.log('PacketPulse successfully connected to MongoDB Atlas database');
        } catch (err: any) {
            console.warn('MongoDB Atlas connection warning:', err.message);
            console.warn('Using in-memory MongoDB document store fallback for operations.');
            useMongo = false;
        }
    } else {
        console.warn('MONGODB_URI not provided in environment; using in-memory store.');
        useMongo = false;
    }

    if (!useMongo && memoryStore.monitors.length === 0) {
        await dbInsertMonitor('Example Website', 'example.com', 'https://example.com', 5);
        await dbInsertMonitor('Google', 'google.com', 'https://google.com', 5);
        await dbInsertMonitor('HTTPStat Test 500', 'httpstat.us/500', 'https://httpstat.us/500', 5);
    }
}

function mapMonitorDoc(doc: any): Monitor {
    const obj = doc.toObject ? doc.toObject() : doc;
    const id = obj._id ? obj._id.toString() : String(obj.id || obj._id);
    return {
        id,
        _id: id,
        name: obj.name,
        domain: obj.domain,
        url: obj.url,
        check_interval_seconds: obj.interval || 5,
        interval: obj.interval || 5,
        status: obj.status || 'HEALTHY',
        last_status_code: obj.lastStatusCode ?? null,
        lastStatusCode: obj.lastStatusCode ?? null,
        last_response_time_ms: obj.lastResponseTime ?? null,
        lastResponseTime: obj.lastResponseTime ?? null,
        uptime_percentage: obj.uptime ?? 100,
        uptime: obj.uptime ?? 100,
        created_at: obj.createdAt || obj.created_at,
        updated_at: obj.updatedAt || obj.updated_at,
    };
}

function mapMetricDoc(doc: any): Metric {
    const obj = doc.toObject ? doc.toObject() : doc;
    const id = obj._id ? obj._id.toString() : String(obj.id || obj._id);
    const monitorId = obj.monitorId ? obj.monitorId.toString() : String(obj.monitor_id || obj.monitorId);
    return {
        id,
        _id: id,
        monitor_id: monitorId,
        monitorId: monitorId,
        domain: obj.domain,
        status_code: obj.httpStatus ?? null,
        httpStatus: obj.httpStatus ?? null,
        response_time_ms: obj.responseTime || 0,
        responseTime: obj.responseTime || 0,
        dns_time_ms: obj.dnsTime || 0,
        dnsTime: obj.dnsTime || 0,
        is_up: obj.isUp ?? true,
        isUp: obj.isUp ?? true,
        uptime: obj.uptime ?? 100,
        status: obj.status || 'HEALTHY',
        error_message: obj.errorMessage || null,
        errorMessage: obj.errorMessage || null,
        created_at: obj.timestamp || obj.created_at,
        timestamp: obj.timestamp || obj.created_at,
    };
}

function mapIncidentDoc(doc: any): Incident {
    const obj = doc.toObject ? doc.toObject() : doc;
    const id = obj._id ? obj._id.toString() : String(obj.id || obj._id);
    const monitorId = obj.monitorId ? obj.monitorId.toString() : String(obj.monitor_id || obj.monitorId);
    return {
        id,
        _id: id,
        monitor_id: monitorId,
        monitorId: monitorId,
        domain: obj.domain,
        title: obj.message || obj.title || `Incident on ${obj.domain}`,
        message: obj.message || obj.title || `Incident on ${obj.domain}`,
        severity: obj.severity || 'CRITICAL',
        status: obj.resolvedStatus || obj.status || 'OPEN',
        resolvedStatus: obj.resolvedStatus || obj.status || 'OPEN',
        details: obj.details || '',
        relevantMetricValues: obj.relevantMetricValues || {},
        started_at: obj.timestamp || obj.started_at,
        timestamp: obj.timestamp || obj.started_at,
        resolved_at: obj.resolvedAt || obj.resolved_at,
        resolvedAt: obj.resolvedAt || obj.resolved_at,
    };
}

export async function dbGetMonitors(): Promise<Monitor[]> {
    if (useMongo) {
        const docs = await MonitorModel.find().sort({ createdAt: -1 });
        return docs.map(mapMonitorDoc);
    }
    return memoryStore.monitors.map(mapMonitorDoc);
}

export async function dbGetMonitorById(id: string | number): Promise<Monitor | null> {
    if (useMongo) {
        if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
        const doc = await MonitorModel.findById(id);
        return doc ? mapMonitorDoc(doc) : null;
    }
    const found = memoryStore.monitors.find(m => String(m._id || m.id) === String(id));
    return found ? mapMonitorDoc(found) : null;
}

export async function dbInsertMonitor(name: string, domain: string, url: string, intervalSeconds: number): Promise<Monitor> {
    if (useMongo) {
        const existing = await MonitorModel.findOne({ domain });
        if (existing) return mapMonitorDoc(existing);

        const doc = await MonitorModel.create({
            name,
            domain,
            url,
            interval: intervalSeconds,
            status: 'HEALTHY',
            uptime: 100,
        });
        return mapMonitorDoc(doc);
    }

    const existing = memoryStore.monitors.find(m => m.domain === domain);
    if (existing) return mapMonitorDoc(existing);

    const newMon = {
        _id: String(memoryStore.counter++),
        id: String(memoryStore.counter),
        name,
        domain,
        url,
        interval: intervalSeconds,
        status: 'HEALTHY',
        lastStatusCode: null,
        lastResponseTime: null,
        uptime: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    memoryStore.monitors.unshift(newMon);
    return mapMonitorDoc(newMon);
}

export async function dbUpdateMonitorStatus(
    id: string | number,
    status: Monitor['status'],
    statusCode: number | null,
    responseTimeMs: number,
    uptimePercentage: number
): Promise<void> {
    if (useMongo) {
        if (mongoose.Types.ObjectId.isValid(String(id))) {
            await MonitorModel.findByIdAndUpdate(id, {
                status,
                lastStatusCode: statusCode,
                lastResponseTime: responseTimeMs,
                uptime: uptimePercentage,
            });
        }
        return;
    }

    const mon = memoryStore.monitors.find(m => String(m._id || m.id) === String(id));
    if (mon) {
        mon.status = status;
        mon.lastStatusCode = statusCode;
        mon.lastResponseTime = responseTimeMs;
        mon.uptime = uptimePercentage;
        mon.updatedAt = new Date().toISOString();
    }
}

export async function dbDeleteMonitor(id: string | number): Promise<boolean> {
    if (useMongo) {
        if (!mongoose.Types.ObjectId.isValid(String(id))) return false;
        const res = await MonitorModel.findByIdAndDelete(id);
        if (res) {
            await MetricModel.deleteMany({ monitorId: id });
            await IncidentModel.deleteMany({ monitorId: id });
            return true;
        }
        return false;
    }

    const idx = memoryStore.monitors.findIndex(m => String(m._id || m.id) === String(id));
    if (idx !== -1) {
        const monId = String(memoryStore.monitors[idx]._id || memoryStore.monitors[idx].id);
        memoryStore.monitors.splice(idx, 1);
        memoryStore.metrics = memoryStore.metrics.filter(m => String(m.monitorId) !== monId);
        memoryStore.incidents = memoryStore.incidents.filter(i => String(i.monitorId) !== monId);
        return true;
    }
    return false;
}

export async function dbInsertMetric(metricData: {
    monitor_id: string | number;
    domain?: string;
    status_code: number | null;
    response_time_ms: number;
    status: Metric['status'];
    dns_time_ms: number;
    is_up: boolean;
    error_message?: string | null;
}): Promise<Metric> {
    let domainStr = metricData.domain || '';
    if (!domainStr) {
        const mon = await dbGetMonitorById(metricData.monitor_id);
        if (mon) domainStr = mon.domain;
    }

    if (useMongo) {
        const doc = await MetricModel.create({
            monitorId: metricData.monitor_id,
            domain: domainStr,
            httpStatus: metricData.status_code,
            responseTime: metricData.response_time_ms,
            dnsTime: metricData.dns_time_ms,
            isUp: metricData.is_up,
            status: metricData.status,
            errorMessage: metricData.error_message || null,
            timestamp: new Date(),
        });
        return mapMetricDoc(doc);
    }

    const newMetric = {
        _id: String(memoryStore.counter++),
        id: String(memoryStore.counter),
        monitorId: String(metricData.monitor_id),
        domain: domainStr,
        httpStatus: metricData.status_code,
        responseTime: metricData.response_time_ms,
        dnsTime: metricData.dns_time_ms,
        isUp: metricData.is_up,
        status: metricData.status,
        errorMessage: metricData.error_message || null,
        timestamp: new Date().toISOString(),
    };
    memoryStore.metrics.push(newMetric);
    if (memoryStore.metrics.length > 500) memoryStore.metrics.shift();
    return mapMetricDoc(newMetric);
}

export async function dbGetMetricsByMonitorId(monitorId: string | number, limit = 100, range?: string): Promise<Metric[]> {
    let cutoffDate: Date | null = null;
    if (range === '15m') cutoffDate = new Date(Date.now() - 15 * 60 * 1000);
    else if (range === '1h') cutoffDate = new Date(Date.now() - 60 * 60 * 1000);
    else if (range === '6h') cutoffDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
    else if (range === '24h') cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (useMongo) {
        const query: any = { monitorId: String(monitorId) };
        if (cutoffDate) {
            query.timestamp = { $gte: cutoffDate };
        }
        const docs = await MetricModel.find(query).sort({ timestamp: cutoffDate ? 1 : -1 }).limit(limit);
        const mapped = docs.map(mapMetricDoc);
        return cutoffDate ? mapped : mapped.reverse();
    }

    let filtered = memoryStore.metrics.filter(m => String(m.monitorId) === String(monitorId));
    if (cutoffDate) {
        filtered = filtered.filter(m => new Date(m.timestamp).getTime() >= cutoffDate.getTime());
    }
    return filtered.slice(-limit).map(mapMetricDoc);
}

export async function dbCalculateUptime(monitorId: string | number): Promise<number> {
    if (useMongo) {
        const total = await MetricModel.countDocuments({ monitorId: String(monitorId) });
        if (total === 0) return 100.0;
        const upCount = await MetricModel.countDocuments({ monitorId: String(monitorId), isUp: true });
        return parseFloat(((upCount / total) * 100).toFixed(2));
    }

    const monMetrics = memoryStore.metrics.filter(m => String(m.monitorId) === String(monitorId));
    if (monMetrics.length === 0) return 100.0;
    const upCount = monMetrics.filter(m => m.isUp).length;
    return parseFloat(((upCount / monMetrics.length) * 100).toFixed(2));
}

export async function dbInsertIncident(incidentData: {
    monitor_id: string | number;
    domain?: string;
    title: string;
    severity: 'CRITICAL' | 'WARNING';
    details: string;
    status?: 'OPEN' | 'RESOLVED';
}): Promise<Incident> {
    let domainStr = incidentData.domain || '';
    if (!domainStr) {
        const mon = await dbGetMonitorById(incidentData.monitor_id);
        if (mon) domainStr = mon.domain;
    }

    if (useMongo) {
        const doc = await IncidentModel.create({
            monitorId: incidentData.monitor_id,
            domain: domainStr,
            severity: incidentData.severity,
            message: incidentData.title,
            details: incidentData.details,
            relevantMetricValues: { domain: domainStr, severity: incidentData.severity },
            resolvedStatus: incidentData.status || 'OPEN',
            timestamp: new Date(),
        });
        return mapIncidentDoc(doc);
    }

    const newInc = {
        _id: String(memoryStore.counter++),
        id: String(memoryStore.counter),
        monitorId: String(incidentData.monitor_id),
        domain: domainStr,
        severity: incidentData.severity,
        message: incidentData.title,
        details: incidentData.details,
        relevantMetricValues: { domain: domainStr, severity: incidentData.severity },
        resolvedStatus: incidentData.status || 'OPEN',
        timestamp: new Date().toISOString(),
    };
    memoryStore.incidents.unshift(newInc);
    return mapIncidentDoc(newInc);
}

export async function dbGetOpenIncidentForMonitor(monitorId: string | number): Promise<Incident | null> {
    if (useMongo) {
        const doc = await IncidentModel.findOne({ monitorId: String(monitorId), resolvedStatus: 'OPEN' }).sort({ timestamp: -1 });
        return doc ? mapIncidentDoc(doc) : null;
    }
    const found = memoryStore.incidents.find(i => String(i.monitorId) === String(monitorId) && i.resolvedStatus === 'OPEN');
    return found ? mapIncidentDoc(found) : null;
}

export async function dbResolveIncident(incidentId: string | number): Promise<Incident | null> {
    if (useMongo) {
        if (!mongoose.Types.ObjectId.isValid(String(incidentId))) return null;
        const doc = await IncidentModel.findByIdAndUpdate(
            incidentId,
            { resolvedStatus: 'RESOLVED', resolvedAt: new Date() },
            { new: true }
        );
        return doc ? mapIncidentDoc(doc) : null;
    }

    const inc = memoryStore.incidents.find(i => String(i._id || i.id) === String(incidentId));
    if (inc) {
        inc.resolvedStatus = 'RESOLVED';
        inc.resolvedAt = new Date().toISOString();
        return mapIncidentDoc(inc);
    }
    return null;
}

export async function dbGetIncidents(limit = 50): Promise<Incident[]> {
    if (useMongo) {
        const docs = await IncidentModel.find().sort({ timestamp: -1 }).limit(limit);
        return docs.map(mapIncidentDoc);
    }
    return memoryStore.incidents.slice(0, limit).map(mapIncidentDoc);
}
