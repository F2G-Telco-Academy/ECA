CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    device_model VARCHAR(255),
    firmware VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    session_dir VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    path VARCHAR(500) NOT NULL,
    size BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kpi_aggregates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    metric VARCHAR(100) NOT NULL,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    min_value DOUBLE,
    avg_value DOUBLE,
    max_value DOUBLE,
    rat VARCHAR(20),
    latitude DOUBLE,
    longitude DOUBLE,
    cell_id VARCHAR(50),
    pci INTEGER
);

CREATE TABLE IF NOT EXISTS anomalies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude DOUBLE,
    longitude DOUBLE,
    details_json TEXT
);

CREATE TABLE IF NOT EXISTS gps_traces (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    altitude DOUBLE,
    speed DOUBLE
);

CREATE TABLE IF NOT EXISTS records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    direction VARCHAR(2) NOT NULL,
    message_type VARCHAR(100),
    layer VARCHAR(10),
    frame_number INTEGER,
    hex_data TEXT,
    decoded_data TEXT,
    length INTEGER
);

CREATE INDEX IF NOT EXISTS idx_kpi_session ON kpi_aggregates(session_id);
CREATE INDEX IF NOT EXISTS idx_gps_session ON gps_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_records_session ON records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_protocol ON records(session_id, protocol);
