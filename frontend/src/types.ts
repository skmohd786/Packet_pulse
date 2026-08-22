export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';

export interface Monitor {
    id: number;
    name: string;
    domain: string;
    url: string;
    check_interval_seconds: number;
    status: HealthStatus;
    last_status_code: number | null;
    last_response_time_ms: number | null;
    uptime_percentage: number;
    created_at?: string;
    updated_at?: string;
}

export interface Metric {
    id: number;
    monitor_id: number;
    status_code: number | null;
    response_time_ms: number;
    status: HealthStatus;
    dns_time_ms: number;
    is_up: boolean;
    error_message?: string | null;
    created_at: string;
}

export interface Incident {
    id: number;
    monitor_id: number;
    title: string;
    severity: 'WARNING' | 'CRITICAL';
    status: 'OPEN' | 'RESOLVED';
    details: string;
    started_at: string;
    resolved_at?: string | null;
}
