-- PacketPulse PostgreSQL Schema

CREATE TABLE IF NOT EXISTS monitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,
    url VARCHAR(500) NOT NULL,
    check_interval_seconds INT NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, WARNING, CRITICAL
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
    status VARCHAR(50) NOT NULL, -- HEALTHY, WARNING, CRITICAL
    dns_time_ms INT DEFAULT 0,
    is_up BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    monitor_id INT REFERENCES monitors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL, -- WARNING, CRITICAL
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, RESOLVED
    details TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_metrics_monitor_id ON metrics(monitor_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id ON incidents(monitor_id);
