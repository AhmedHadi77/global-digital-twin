CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(120),
    device_type VARCHAR(120),
    location VARCHAR(80),
    status VARCHAR(20) DEFAULT 'Offline',
    health_status VARCHAR(20) DEFAULT 'OPERATIONAL',
    anomaly_state VARCHAR(20) DEFAULT 'STABLE',
    anomaly_reason TEXT,
    anomaly_score NUMERIC(6,2) DEFAULT 0,
    battery_level NUMERIC(6,2) DEFAULT 100,
    last_temperature NUMERIC(6,2),
    last_vibration NUMERIC(6,2),
    active_alerts INTEGER DEFAULT 0,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id),
    temperature NUMERIC(6,2) NOT NULL,
    vibration NUMERIC(6,2) NOT NULL,
    battery_level NUMERIC(6,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    health_status VARCHAR(20) NOT NULL,
    anomaly_state VARCHAR(20) NOT NULL,
    anomaly_reason TEXT,
    anomaly_score NUMERIC(6,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_key VARCHAR(120) NOT NULL,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id),
    alert_type VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS device_readings_device_id_created_at_idx
ON device_readings (device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS alerts_device_id_triggered_at_idx
ON alerts (device_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS alerts_is_active_idx
ON alerts (is_active);
