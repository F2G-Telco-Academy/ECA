# Extended Cellular Analyzer - Technical Specifications

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Next.js + Tauri)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Modular Dashboard | Terminal | Charts | Map View    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│           Backend (Spring Boot WebFlux + R2DBC)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Session Mgmt | KPI Analysis | Device Detection      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ Process
┌─────────────────────────────────────────────────────────────┐
│              External Tools (Python/Native)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SCAT | TShark | ADB | Mobile Insight                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Backend Specifications

### Technology Stack
- **Framework:** Spring Boot 3.2.0 WebFlux
- **Language:** Java 21
- **Database:** SQLite with R2DBC
- **Build Tool:** Maven 3.9+
- **Reactive:** Project Reactor

### API Endpoints (19 Total)

#### Device Management
```
GET    /api/devices              - List connected devices
GET    /api/devices/{id}         - Get device details
```

**Response:**
```json
{
  "deviceId": "ABC123",
  "model": "Galaxy S21",
  "manufacturer": "Samsung",
  "firmware": "Android 13",
  "chipset": "Samsung Exynos",
  "status": "CONNECTED",
  "connected": true,
  "currentSessionId": 1
}
```

#### Session Management
```
POST   /api/sessions/start       - Start capture session
POST   /api/sessions/{id}/stop   - Stop session
GET    /api/sessions/{id}        - Get session details
GET    /api/sessions             - List all sessions
GET    /api/sessions/recent      - Get recent sessions
GET    /api/sessions/{id}/logs   - Stream logs (SSE)
```

#### KPI Data
```
GET    /api/kpis/session/{id}                - Consolidated KPIs
GET    /api/kpis/session/{id}/aggregates     - All aggregates
GET    /api/kpis/session/{id}/metric/{m}     - Specific metric
GET    /api/kpis/session/{id}/category/{c}   - By category
GET    /api/kpis/session/{id}/rf             - RF measurements
```

**Consolidated KPI Response:**
```json
{
  "rsrp": -85.5,
  "rsrq": -10.2,
  "sinr": 15.3,
  "throughput": {
    "dl": 150.5,
    "ul": 45.2
  },
  "ueState": "CONNECTED",
  "rat": "LTE",
  "rrcSuccessRate": 98.5,
  "servingCell": {
    "pci": 123,
    "earfcn": 1850,
    "band": 3
  }
}
```

#### Signaling Messages
```
GET    /api/records/session/{id}  - Paginated protocol messages
GET    /api/records/{id}          - Specific message
```

**Paginated Response:**
```json
{
  "content": [...],
  "page": 0,
  "size": 100,
  "totalElements": 5000,
  "totalPages": 50,
  "first": true,
  "last": false
}
```

#### Map & Analysis
```
GET    /api/sessions/{id}/map     - GPS-tracked data
GET    /api/anomalies/session/{id} - Detected anomalies
GET    /api/artifacts/session/{id} - Session artifacts
GET    /api/artifacts/{id}/download - Download file
```

### Database Schema

#### sessions
```sql
CREATE TABLE sessions (
    id BIGINT PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    device_model VARCHAR(255),
    firmware VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    session_dir VARCHAR(500) NOT NULL
);
```

#### kpi_aggregates
```sql
CREATE TABLE kpi_aggregates (
    id BIGINT PRIMARY KEY,
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
```

#### records
```sql
CREATE TABLE records (
    id BIGINT PRIMARY KEY,
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
```

#### anomalies
```sql
CREATE TABLE anomalies (
    id BIGINT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude DOUBLE,
    longitude DOUBLE,
    details_json TEXT
);
```

#### gps_traces
```sql
CREATE TABLE gps_traces (
    id BIGINT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    altitude DOUBLE,
    speed DOUBLE
);
```

#### artifacts
```sql
CREATE TABLE artifacts (
    id BIGINT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    path VARCHAR(500) NOT NULL,
    size BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### KPI Metrics

#### Signal Quality
- **RSRP** - Reference Signal Received Power (dBm)
- **RSRQ** - Reference Signal Received Quality (dB)
- **SINR** - Signal-to-Interference-plus-Noise Ratio (dB)
- **RSCP** - Received Signal Code Power (dBm) - WCDMA
- **Ec/Io** - Energy per chip / Interference (dB) - WCDMA
- **RXLEV** - RX Level (dBm) - GSM
- **RXQUAL** - RX Quality - GSM

#### Success Rates
- **RRC_SR** - RRC Connection Success Rate (%)
- **RACH_SR** - RACH Success Rate (%)
- **HO_SR** - Handover Success Rate (%)
- **ERAB_SR** - E-RAB Setup Success Rate (%)
- **ATTACH_SR** - Attach Success Rate (%)
- **TAU_SR** - TAU Success Rate (%)

#### Performance
- **THROUGHPUT_DL** - Downlink Throughput (Mbps)
- **THROUGHPUT_UL** - Uplink Throughput (Mbps)
- **LATENCY** - Round-trip latency (ms)
- **PACKET_LOSS** - Packet Loss Rate (%)
- **JITTER** - Jitter (ms)

### Configuration

#### application.yml
```yaml
eca:
  tools:
    scat:
      path: ./scat
    adb:
      path: adb
    tshark:
      path: tshark
  storage:
    base-dir: ./data/sessions
  device:
    detection-interval: 3s

spring:
  r2dbc:
    url: r2dbc:h2:file:///./data/eca
  application:
    name: extended-cellular-analyzer

server:
  port: 8080
```

## Frontend Specifications

### Technology Stack
- **Framework:** Next.js 14
- **Language:** TypeScript 5.x
- **Desktop:** Tauri 2.x
- **UI:** React 18
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Terminal:** xterm.js
- **Maps:** MapLibre GL

### Main Components

#### ModularDashboard
- 4-panel grid layout
- Customizable panel content
- Layout switcher (2×2, 1×4, 4×1, 1×1)
- Real-time data updates

#### XCALRFSummary
- UE state display
- Throughput metrics (DL/UL)
- LTE PCell/SCells (8 cells)
- NR PCell/SCells (8 cells)
- Signal quality (RSRP, RSRQ, SINR)
- Cell info (PCI, EARFCN, Band)

#### XCALSignalingViewer
- Protocol filter (RRC, NAS, MAC, RLC, PDCP, IP)
- Direction filter (UL/DL)
- Paginated message list
- Hex dump view
- Decoded message view
- Frame number tracking

#### EnhancedTerminal
- xterm.js integration
- Real-time log streaming (SSE)
- Color-coded logs
- Auto-scroll toggle
- Clear and export functions

#### MapView
- GPS-tracked network quality
- Heat map overlay
- Signal strength visualization
- Anomaly markers
- Route playback

#### KPI Charts
- Line charts
- Area charts
- Bar charts
- 8 metrics available
- Time-series data
- Statistics display

### API Client

```typescript
// frontend/src/utils/api.ts
export const api = {
  getDevices(): Promise<Device[]>
  getSessions(page, size): Promise<PaginatedResponse<Session>>
  getSession(id): Promise<Session>
  startSession(deviceId): Promise<Session>
  stopSession(sessionId): Promise<void>
  getKpis(sessionId): Promise<KpiData>
  getRecords(sessionId, page, size): Promise<PaginatedResponse<Record>>
  getMapData(sessionId): Promise<MapData>
  streamLogs(sessionId, onMessage, onError): Promise<EventSource>
}
```

## External Tools Integration

### SCAT (Python)
- **Purpose:** Convert baseband logs to PCAP
- **Location:** `./scat/`
- **Command:** `python3 -m scat.main -t qc -u --pcap output.pcap`
- **Supported:** Qualcomm, Samsung, HiSilicon, Unisoc

### TShark
- **Purpose:** PCAP analysis
- **Command:** `tshark -r input.pcap -T json`
- **Protocols:** RRC, NAS, MAC, RLC, PDCP, IP

### ADB
- **Purpose:** Device detection and communication
- **Commands:**
  - `adb devices` - List devices
  - `adb -s {id} shell getprop` - Get properties
  - `adb -s {id} logcat` - Capture logs

## Data Flow

### Capture Flow
```
1. User connects device via USB
2. ADB detects device
3. Backend creates session
4. SCAT starts capture
5. Logs stream to backend
6. Backend parses and stores
7. Frontend displays real-time
```

### KPI Calculation Flow
```
1. SCAT converts logs to PCAP
2. Backend parses PCAP
3. Extract protocol messages
4. Calculate KPIs
5. Store in database
6. Aggregate by time window
7. Serve via API
```

## Performance Requirements

### Response Times
- Device list: < 100ms
- KPI data: < 50ms
- Signaling messages (100): < 200ms
- Log streaming: Real-time (< 10ms latency)

### Scalability
- Concurrent sessions: 10+
- Messages per session: 100,000+
- Database size: 10GB+
- Memory usage: < 2GB

### Reliability
- Uptime: 99.9%
- Data integrity: 100%
- Error recovery: Automatic
- Crash recovery: Session resume

## Security Specifications

### Current (MVP)
- CORS enabled for frontend
- Input validation
- Error handling
- No authentication (local use)

### Planned (Sprint 2)
- JWT authentication
- Role-based access control
- API key management
- Audit logging
- Data encryption at rest

## Testing Specifications

### Unit Tests
- Controllers: 90% coverage
- Services: 95% coverage
- Repositories: 85% coverage

### Integration Tests
- API endpoints: 100%
- Database operations: 100%
- External tool integration: 80%

### E2E Tests
- User workflows: 100%
- Multi-device scenarios: 80%
- Error scenarios: 90%

## Deployment Specifications

### Development
```bash
# Backend
./mvnw spring-boot:run

# Frontend
cd frontend && npm run dev
```

### Production
```bash
# Backend JAR
./mvnw clean package
java -jar target/p2-0.0.1-SNAPSHOT.jar

# Frontend Desktop App
cd frontend
npm run tauri:build
# Output: frontend/src-tauri/target/release/
```

### Docker (Planned)
```dockerfile
FROM eclipse-temurin:21-jre
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

## Monitoring & Logging

### Logging Levels
- **ERROR** - Critical failures
- **WARN** - Potential issues
- **INFO** - Important events
- **DEBUG** - Detailed information

### Metrics (Actuator)
- `/actuator/health` - Health check
- `/actuator/metrics` - System metrics
- `/actuator/prometheus` - Prometheus export

## Version Control

### Branching Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Convention
```
<type>(<scope>): <subject>

feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code restructuring
test: Tests
chore: Maintenance
```

---

**Status:** Specifications Complete ✅  
**Last Updated:** 2025-12-07  
**Version:** 0.1.0
