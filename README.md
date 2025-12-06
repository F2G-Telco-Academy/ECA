# Extended Cellular Analyzer (ECA) - Backend

A professional cellular network analyzer that captures UE baseband logs, converts them to PCAP, analyzes network parameters, and visualizes KPIs. Built with Spring Boot WebFlux for reactive, non-blocking performance.

## Features

### Core Capabilities
- **Auto Device Detection**: Automatically detects connected phones via ADB
- **Auto Capture**: Starts capture on device connect, stops on disconnect
- **SCAT Integration**: Converts baseband logs (.sdm, .qmdl2) to PCAP using SCAT
- **KPI Calculation**: Comprehensive KPI analysis (RSRP, RSRQ, SINR, RRC Success Rate, etc.)
- **Real-time Streaming**: Live log streaming via Server-Sent Events (SSE)
- **Reactive Architecture**: Non-blocking I/O with Spring WebFlux and R2DBC

### Supported Technologies
- **RATs**: LTE, NR (5G), WCDMA, GSM
- **Chipsets**: Qualcomm, Samsung, HiSilicon, Unisoc
- **Protocols**: RRC, NAS, PDCP, RLC, MAC, IP

## Architecture

### Technology Stack
- **Backend**: Spring Boot 4.0.0 + WebFlux (Reactive)
- **Database**: SQLite with R2DBC (Reactive)
- **External Tools**: 
  - SCAT (Python) - Baseband log conversion
  - TShark - PCAP analysis
  - ADB - Device communication
- **Observability**: Prometheus metrics, Sentry error tracking

### Project Structure
```
src/main/java/com/nathan/p2/
├── config/              # Configuration classes
│   ├── DatabaseConfig.java
│   ├── SecurityConfig.java
│   └── ToolsConfig.java
├── controller/          # REST API endpoints
│   ├── SessionController.java
│   ├── KpiController.java
│   ├── AnomalyController.java
│   └── ArtifactController.java
├── domain/              # Entity models
│   ├── Session.java
│   ├── Artifact.java
│   ├── KpiAggregate.java
│   └── Anomaly.java
├── repository/          # R2DBC repositories
│   ├── SessionRepository.java
│   ├── ArtifactRepository.java
│   ├── KpiAggregateRepository.java
│   └── AnomalyRepository.java
├── service/             # Business logic
│   ├── SessionService.java
│   ├── DeviceDetectorService.java
│   ├── CaptureOrchestrationService.java
│   ├── AutoCaptureService.java
│   └── process/
│       ├── ExternalToolService.java
│       └── ProcessSpec.java
└── P2Application.java   # Main application
```

## Prerequisites

### System Requirements
- Java 21+
- Python 3.8+
- ADB (Android Debug Bridge)
- TShark (Wireshark CLI)

### Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Tool Setup
1. **SCAT**: Already included in `backend/src/scat/`
2. **ADB**: Install via system package manager
   ```bash
   # Ubuntu/Debian
   sudo apt-get install adb
   
   # macOS
   brew install android-platform-tools
   ```
3. **TShark**: Install Wireshark
   ```bash
   # Ubuntu/Debian
   sudo apt-get install tshark
   
   # macOS
   brew install wireshark
   ```

## Configuration

### application.yml
```yaml
eca:
  tools:
    scat:
      path: ./backend/src/scat
    adb:
      path: adb
    tshark:
      path: tshark
  storage:
    base-dir: ./data/sessions
  device:
    detection-interval: 3s
```

### Environment Variables
- `ECA_SCAT_PATH`: Path to SCAT installation
- `ECA_ADB_PATH`: Path to ADB executable
- `ECA_TSHARK_PATH`: Path to TShark executable
- `ECA_STORAGE_DIR`: Base directory for session data
- `SENTRY_DSN`: Sentry error tracking DSN (optional)

## Running the Application

### Development Mode
```bash
./mvnw spring-boot:run
```

### Production Build
```bash
./mvnw clean package
java -jar target/p2-0.0.1-SNAPSHOT.jar
```

### With Custom Configuration
```bash
java -jar target/p2-0.0.1-SNAPSHOT.jar \
  --eca.tools.scat.path=/path/to/scat \
  --eca.storage.base-dir=/data/eca
```

## API Endpoints

### Session Management
- `POST /api/sessions/start?deviceId={id}` - Start capture session
- `POST /api/sessions/{id}/stop` - Stop capture session
- `GET /api/sessions/{id}` - Get session details
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/recent?limit=10` - Get recent sessions
- `GET /api/sessions/{id}/logs` - Stream live logs (SSE)

### KPI Data
- `GET /api/kpis/session/{sessionId}` - Get all KPIs for session
- `GET /api/kpis/session/{sessionId}/metric/{metric}` - Get specific metric

### Anomalies
- `GET /api/anomalies/session/{sessionId}` - Get anomalies for session

### Artifacts
- `GET /api/artifacts/session/{sessionId}` - List session artifacts
- `GET /api/artifacts/{id}/download` - Download artifact

### Monitoring
- `GET /actuator/health` - Health check
- `GET /actuator/prometheus` - Prometheus metrics

## Usage Examples

### 1. Auto-Capture (Default)
Simply connect a phone via USB. The system will:
1. Detect the device automatically
2. Create a new session
3. Start SCAT capture
4. Stream logs in real-time
5. Stop capture when device disconnects
6. Calculate KPIs automatically

### 2. Manual Capture
```bash
# Start capture
curl -X POST "http://localhost:8080/api/sessions/start?deviceId=ABC123"

# Stream logs
curl -N "http://localhost:8080/api/sessions/1/logs"

# Stop capture
curl -X POST "http://localhost:8080/api/sessions/1/stop"

# Get KPIs
curl "http://localhost:8080/api/kpis/session/1"
```

### 3. View Session Data
```bash
# Get session details
curl "http://localhost:8080/api/sessions/1" | jq

# List artifacts
curl "http://localhost:8080/api/artifacts/session/1" | jq

# Download PCAP
curl "http://localhost:8080/api/artifacts/1/download" -o capture.pcap
```

## Data Flow

```
Device (USB) 
    ↓
ADB Detection (every 3s)
    ↓
Auto-Capture Triggered
    ↓
SCAT Capture → PCAP File
    ↓
KPI Calculator → KPI JSON
    ↓
Database (SQLite)
    ↓
REST API → Frontend
```

## Database Schema

### sessions
- id, device_id, device_model, firmware
- start_time, end_time, status, session_dir

### artifacts
- id, session_id, type (PCAP, JSON, PDF, etc.)
- path, size, created_at

### kpi_aggregates
- id, session_id, metric (RSRP, RSRQ, etc.)
- window_start, window_end
- min_value, avg_value, max_value, rat

### anomalies
- id, session_id, category, severity
- timestamp, latitude, longitude, details_json

## KPIs Calculated

### Signal Quality
- RSRP (Reference Signal Received Power)
- RSRQ (Reference Signal Received Quality)
- SINR (Signal-to-Interference-plus-Noise Ratio)

### Connection Success Rates
- RRC Connection Success Rate
- RACH Success Rate
- Handover Success Rate
- E-RAB Setup Success Rate
- Attach Success Rate
- TAU Success Rate

### Performance
- Downlink/Uplink Throughput
- Latency (min/avg/max)
- Packet Loss Rate

## Troubleshooting

### Device Not Detected
```bash
# Check ADB connection
adb devices

# Enable USB debugging on phone
# Settings → Developer Options → USB Debugging
```

### SCAT Not Starting
```bash
# Verify Python environment
python3 -m scat.main --version

# Check SCAT path in config
cat src/main/resources/application.yml | grep scat
```

### Database Errors
```bash
# Check database file
ls -lh data/eca.db

# View logs
tail -f logs/spring.log
```

### Port Already in Use
```bash
# Change port in application.yml
server:
  port: 8081
```

## Development

### Build
```bash
./mvnw clean install
```

### Run Tests
```bash
./mvnw test
```

### Code Style
- Follow Spring Boot best practices
- Use Lombok for boilerplate reduction
- Reactive programming with Reactor
- Comprehensive logging

## Deployment

### Docker (Future)
```dockerfile
FROM eclipse-temurin:21-jre
COPY target/p2-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### Systemd Service
```ini
[Unit]
Description=Extended Cellular Analyzer
After=network.target

[Service]
Type=simple
User=eca
WorkingDirectory=/opt/eca
ExecStart=/usr/bin/java -jar /opt/eca/p2-0.0.1-SNAPSHOT.jar
Restart=always

[Install]
WantedBy=multi-user.target
```

## Roadmap

### Sprint 1 (MVP) ✅
- [x] Auto device detection
- [x] Auto capture on connect
- [x] SCAT integration
- [x] Real-time log streaming
- [x] SQLite persistence
- [x] Basic KPI calculation

### Sprint 2 (Planned)
- [ ] Advanced KPI aggregation
- [ ] Anomaly detection rules
- [ ] GPS tracking integration
- [ ] Map visualization data
- [ ] PDF/HTML report generation

### Sprint 3 (Future)
- [ ] AI-powered insights
- [ ] Multi-device support
- [ ] Redis caching
- [ ] Elasticsearch search
- [ ] Advanced security

## License

Proprietary - Extended Cellular Analyzer

## Support

For issues and questions:
- GitHub Issues: [Project Repository]
- Email: support@eca.com
- Documentation: [Wiki Link]

---

**Version**: 0.0.1-SNAPSHOT  
**Last Updated**: 2025-12-06  
**Author**: Nathan Boutchouang
