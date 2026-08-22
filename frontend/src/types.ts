export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';

export interface Monitor {
    id: string | number;
    _id?: string;
    name: string;
    domain: string;
    url: string;
    check_interval_seconds: number;
    interval?: number;
    status: HealthStatus;
    last_status_code: number | null;
    lastStatusCode?: number | null;
    last_response_time_ms: number | null;
    lastResponseTime?: number | null;
    uptime_percentage: number;
    uptime?: number;
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Metric {
    id: string | number;
    _id?: string;
    monitor_id: string | number;
    monitorId?: string | number;
    status_code: number | null;
    httpStatus?: number | null;
    response_time_ms: number;
    responseTime?: number;
    status: HealthStatus;
    dns_time_ms: number;
    dnsTime?: number;
    is_up: boolean;
    isUp?: boolean;
    uptime?: number;
    error_message?: string | null;
    errorMessage?: string | null;
    created_at: string;
    timestamp?: string;
}

export interface Incident {
    id: string | number;
    _id?: string;
    monitor_id: string | number;
    monitorId?: string | number;
    domain?: string;
    title: string;
    message?: string;
    severity: 'WARNING' | 'CRITICAL';
    status: 'OPEN' | 'RESOLVED';
    resolvedStatus?: 'OPEN' | 'RESOLVED';
    details: string;
    started_at: string;
    timestamp?: string;
    resolved_at?: string | null;
    resolvedAt?: string | null;
}
