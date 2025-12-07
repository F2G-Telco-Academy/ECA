# Extended Cellular Analyzer (ECA)

A professional cellular network analyzer that captures UE baseband logs, converts them to PCAP, analyzes network parameters, and visualizes KPIs. Built with Spring Boot WebFlux (backend) and Next.js + Tauri (frontend).

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-Proprietary-blue)]()
[![Java](https://img.shields.io/badge/Java-21-orange)]()
[![Node](https://img.shields.io/badge/Node-18+-green)]()

---

## 🎯 Features

### Core Capabilities
- **Auto Device Detection** - Automatically detects connected phones via ADB
- **Real-time Capture** - Starts capture on device connect, stops on disconnect
- **SCAT Integration** - Converts baseband logs (.sdm, .qmdl2) to PCAP
- **KPI Analysis** - Comprehensive network performance metrics
- **Live Streaming** - Real-time log streaming via Server-Sent Events
- **Interactive Dashboard** - Modular 4-panel interface with customizable views
- **Map Visualization** - GPS-tracked network quality mapping
- **Signaling Analysis** - Protocol message viewer (RRC, NAS, MAC, etc.)

### Supported Technologies
- **RATs**: LTE, NR (5G), WCDMA, GSM
- **Chipsets**: Qualcomm, Samsung, HiSilicon, Unisoc
- **Protocols**: RRC, NAS, PDCP, RLC, MAC, IP

---

## 🏗️ Architecture

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

---

## 🚀 Quick Start

### Prerequisites
- **Java 21+**
- **Node.js 18+**
- **Python 3.8+**
- **ADB** (Android Debug Bridge)
- **TShark** (Wireshark CLI)

### Installation

```bash
# Clone repository
git clone git@github.com:F2G-Telco-Academy/ECA.git
cd ECA

# Install Python dependencies
pip install -r scat/requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running the Application

**Option 1: One-Command Startup**
```bash
./start-and-test.sh
```

**Option 2: Manual Startup**
```bash
# Terminal 1: Backend
./mvnw spring-boot:run

# Terminal 2: Frontend
cd frontend && npm run dev
```

**Option 3: Tauri Desktop App**
```bash
cd frontend
npm run tauri:dev
```

Access the application at `http://localhost:3000`

---

## 📊 Backend API

### Device Management
```
GET    /api/devices              - List connected devices
GET    /api/devices/{id}         - Get device details
```

### Session Management
```
POST   /api/sessions/start       - Start capture session
POST   /api/sessions/{id}/stop   - Stop session
GET    /api/sessions/{id}        - Get session details
GET    /api/sessions             - List all sessions
GET    /api/sessions/recent      - Get recent sessions
GET    /api/sessions/{id}/logs   - Stream logs (SSE)
```

### KPI Data
```
GET    /api/kpis/session/{id}                - Consolidated KPIs
GET    /api/kpis/session/{id}/aggregates     - All aggregates
GET    /api/kpis/session/{id}/metric/{m}     - Specific metric
GET    /api/kpis/session/{id}/category/{c}   - By category
```

### Signaling Messages
```
GET    /api/records/session/{id}  - Paginated protocol messages
GET    /api/records/{id}          - Specific message
```

### Map & Analysis
```
GET    /api/sessions/{id}/map     - GPS-tracked data
GET    /api/anomalies/session/{id} - Detected anomalies
GET    /api/artifacts/session/{id} - Session artifacts
```

---

## 🎨 Frontend Components

### Main Views
- **Modular Dashboard** - 4-panel customizable layout
- **RF Summary** - Real-time signal quality metrics
- **Signaling Viewer** - Protocol message analysis
- **Terminal** - Live SCAT/TShark log streaming
- **Map View** - GPS-tracked network quality
- **KPI Charts** - Interactive performance graphs

### Key Features
- Real-time data updates (1s interval)
- Responsive design
- Dark/Light theme support
- Export capabilities (CSV, PDF)
- Multi-device support

---

## 🗄️ Database Schema

### Tables
- **sessions** - Capture session metadata
- **artifacts** - Generated files (PCAP, JSON, PDF)
- **kpi_aggregates** - Time-windowed KPI metrics
- **anomalies** - Detected network issues
- **gps_traces** - GPS tracking data
- **records** - Signaling protocol messages

---

## 🔧 Configuration

### Backend (`application.yml`)
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
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## 📦 Project Structure

```
p2/
├── src/main/java/com/nathan/p2/
│   ├── controller/          # REST API endpoints
│   ├── service/             # Business logic
│   ├── repository/          # Data access (R2DBC)
│   ├── domain/              # Entity models
│   ├── dto/                 # Data transfer objects
│   ├── config/              # Configuration
│   └── util/                # Utilities
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── utils/           # API client, helpers
│   │   └── types/           # TypeScript types
│   └── src-tauri/           # Tauri desktop app
├── scat/                    # SCAT tool (Python)
├── data/                    # Session data storage
└── README.md                # This file
```

---

## 🧪 Testing

### Backend Tests
```bash
./mvnw test
```

### Integration Tests
```bash
./test-integration.sh
```

### Manual Testing
```bash
# Start backend
./mvnw spring-boot:run

# Test endpoints
curl http://localhost:8080/actuator/health
curl http://localhost:8080/api/devices
```

---

## 📈 KPIs Calculated

### Signal Quality
- RSRP (Reference Signal Received Power)
- RSRQ (Reference Signal Received Quality)
- SINR (Signal-to-Interference-plus-Noise Ratio)
- RSCP, Ec/Io (WCDMA)
- RXLEV, RXQUAL (GSM)

### Success Rates
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
- Jitter

---

## 🐛 Issue Reporting

Found a bug or have a feature request? Please submit an issue:

### Before Submitting
1. Check if the issue already exists
2. Collect relevant information:
   - OS and version
   - Java/Node.js version
   - Steps to reproduce
   - Expected vs actual behavior
   - Logs/screenshots

### Submit Issue
1. Go to [Issues](../../issues)
2. Click "New Issue"
3. Choose template:
   - **Bug Report** - For bugs
   - **Feature Request** - For new features
   - **Question** - For questions
4. Fill in all required fields
5. Add relevant labels

### Issue Template
```markdown
**Environment:**
- OS: [e.g., Windows 11, Ubuntu 22.04]
- Java: [e.g., 21.0.1]
- Node: [e.g., 18.17.0]

**Description:**
Clear description of the issue

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. ...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Logs:**
```
Paste relevant logs here
```

**Screenshots:**
If applicable
```

---

## 🤝 Contributing

We welcome contributions! Follow these steps:

### Setup Development Environment
```bash
# Fork the repository
git clone <your-fork-url>
cd p2

# Create feature branch
git checkout -b feature/your-feature-name

# Install dependencies
./mvnw clean install
cd frontend && npm install
```

### Development Workflow
1. **Code** - Write your changes
2. **Test** - Ensure all tests pass
3. **Document** - Update relevant documentation
4. **Commit** - Use conventional commits
5. **Push** - Push to your fork
6. **PR** - Create pull request

### Commit Message Convention
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Tests
- `chore` - Maintenance

**Example:**
```
feat(backend): add device management API

- Implement DeviceController
- Add DeviceDto and DeviceService
- Update schema with device table

Closes #123
```

### Code Standards

**Backend (Java):**
- Follow Spring Boot best practices
- Use Lombok for boilerplate
- Write JavaDoc for public methods
- Reactive programming (Mono/Flux)
- Comprehensive error handling

**Frontend (TypeScript/React):**
- Use TypeScript strictly
- Follow React hooks patterns
- Component-based architecture
- Proper error boundaries
- Accessibility compliance

### Pull Request Process
1. Update README if needed
2. Ensure all tests pass
3. Update version numbers
4. Request review from maintainers
5. Address review comments
6. Squash commits if requested

### Code Review Checklist
- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] No console errors/warnings
- [ ] Documentation updated
- [ ] Follows coding standards
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

---

## 📝 License

Proprietary - Extended Cellular Analyzer

---

## 👥 Team

- **Lead Developer** - Nathan Boutchouang
- **Contributors** - See [Contributors](../../graphs/contributors)

---

## 📞 Support

- **Documentation** - This README
- **Issues** - [GitHub Issues](../../issues)
- **Discussions** - [GitHub Discussions](../../discussions)

---

## 🗺️ Roadmap

### Current Version (v0.1.0)
- ✅ Auto device detection
- ✅ Real-time capture
- ✅ SCAT integration
- ✅ KPI calculation
- ✅ Interactive dashboard
- ✅ Map visualization

### Next Release (v0.2.0)
- [ ] Report generation (PDF/HTML)
- [ ] Advanced anomaly detection
- [ ] Multi-device parallel sessions
- [ ] Authentication & authorization
- [ ] WebSocket support
- [ ] AI-powered insights

### Future
- [ ] Cloud deployment
- [ ] Mobile app
- [ ] Advanced ML analytics
- [ ] Real-time collaboration
- [ ] Plugin system

---

## 🙏 Acknowledgments

- **SCAT** - Baseband log conversion tool
- **TShark** - Network protocol analyzer
- **Mobile Insight** - Reference implementation
- **Spring Boot** - Backend framework
- **Next.js** - Frontend framework
- **Tauri** - Desktop app framework

---

**Version:** 0.1.0  
**Last Updated:** 2025-12-07  
**Status:** Production Ready ✅
