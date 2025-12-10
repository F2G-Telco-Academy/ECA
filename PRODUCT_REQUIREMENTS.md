# Extended Cellular Analyzer (ECA) - Product Requirements Document

<!-- Quick overview added for fast onboarding -->
## Quick Project Overview
- Purpose: Professional cellular network analysis with auto-capture, real-time analysis, and offline-first UX.
- Architecture: Next.js + Tauri frontend, Spring Boot WebFlux backend, SQLite (R2DBC), external tools (SCAT, TShark, ADB).
- Core Capabilities: Auto device detection, session lifecycle, log conversion to PCAP, TShark decoding, SSE log streaming, KPI calc, anomaly detection, maps, reporting.
- MVP Status: Backend APIs complete (19/19), terminal/log streaming operational, SQLite persistence, basic KPIs, core orchestration in place.

## Key Components & Flows
- Device Flow: ADB detects device → Session auto-start → CaptureOrchestrationService spawns SCAT/TShark/ADB processes → SSE logs → SQLite persistence.
- Data Flow: .sdm/.qmdl2 → SCAT → .pcap → TShark → JSON Records → KPI extractor → Aggregates, anomalies, GPS traces → UI (charts/map/terminal).
- Frontend Integration: REST for data, SSE for logs; Tauri for OS file ops only.
- Persistence Model: sessions, artifacts, kpi_aggregates, anomalies, records, gps_traces.

## Immediate Engineering Priorities (Concise)
- Analysis: Throughput + latency KPIs, configurable windows (1s/5s/30s/1m).
- Anomalies: Rule engine for coverage/quality/handover/drops with severity + GPS.
- Visualization: KPI heatmaps, anomaly markers, time playback, offline tiles.
- UI: Protocol message viewer (pagination, filters, search, detail).
- Quality: Unit/integration tests for core services, standardized error handling.

---

## Executive Summary

Extended Cellular Analyzer (ECA) is a professional cellular network analysis tool that captures UE baseband logs, converts them to industry-standard formats, analyzes network performance, and visualizes KPIs in real-time. The system provides feature parity with commercial tools (QCat, QXDM, XCAL) while offering superior user experience through automation, modularity, and AI-assisted insights.

**Key Differentiators:**
- Zero-configuration auto-capture on device connection
- Real-time streaming analysis with sub-second latency
- Offline-first architecture with no cloud dependencies
- AI-powered anomaly detection and insights
- Modern, intuitive UI requiring zero training
- Open architecture supporting custom plugins

---

## 1. Product Vision & Goals

### 1.1 Vision Statement
To democratize cellular network analysis by providing professional-grade tools that are accessible, intuitive, and extensible, enabling engineers to focus on insights rather than tool complexity.

### 1.2 Business Goals
- **Market Position:** Achieve feature parity with QCat/QXDM within 6 months
- **User Adoption:** 1000+ active users in first year
- **Performance:** Process 10GB+ capture files with <5s load time
- **Reliability:** 99.9% uptime for capture operations
- **Extensibility:** Support 3rd-party plugins by Q2 2026

### 1.3 Success Metrics
- Session success rate: >95%
- KPI calculation accuracy: >99% vs reference tools
- User satisfaction score: >4.5/5
- Time to first insight: <2 minutes from device connection
- Report generation time: <30 seconds for 1-hour session

---

## 2. Target Users & Personas

### 2.1 Primary Personas

**Persona 1: Field Test Engineer (Sarah)**
- **Role:** Conducts drive tests and network optimization
- **Goals:** Quick capture, real-time KPI monitoring, automated reporting
- **Pain Points:** Complex tool setup, manual log conversion, slow analysis
- **Technical Level:** Intermediate (understands protocols, not programming)

**Persona 2: Network Performance Analyst (Michael)**
- **Role:** Analyzes network quality and identifies issues
- **Goals:** Deep protocol analysis, anomaly detection, trend visualization
- **Pain Points:** Fragmented tools, manual correlation, limited automation
- **Technical Level:** Advanced (deep protocol knowledge)

**Persona 3: QA Test Engineer (Priya)**
- **Role:** Validates device/network compliance
- **Goals:** Repeatable tests, automated validation, compliance reporting
- **Pain Points:** Manual test execution, inconsistent results, poor traceability
- **Technical Level:** Intermediate (test procedures, basic protocols)

### 2.2 Secondary Personas
- **System Administrator:** Manages deployments, licenses, user access
- **Integration Developer:** Builds custom plugins and integrations
- **Executive Stakeholder:** Reviews reports and KPI dashboards

---

## 3. Functional Requirements

### 3.1 Device Management

#### FR-1.1: Automatic Device Detection
**Priority:** P0 (Critical)  
**User Story:** As a field engineer, I want devices to be automatically detected when connected so that I can start capturing immediately without configuration.

**Requirements:**
- System SHALL detect Android devices via ADB within 3 seconds of connection
- System SHALL retrieve device metadata (model, manufacturer, Android version, IMEI)
- System SHALL display connection status in real-time
- System SHALL support multiple simultaneous device connections
- System SHALL handle device disconnection gracefully

**Acceptance Criteria:**
- ✅ Device appears in UI within 3s of USB connection
- ✅ Device metadata displayed accurately
- ✅ Connection status updates in real-time
- ✅ No crashes on unexpected disconnection
- ✅ Supports 5+ devices simultaneously

#### FR-1.2: Device Information Display
**Priority:** P1 (High)  
**Requirements:**
- Display device serial number, model, manufacturer
- Show Android version, baseband version, chipset type
- Display battery level, temperature, connection type
- Show ADB authorization status

---

### 3.2 Capture Management

#### FR-2.1: Automatic Capture Initiation
**Priority:** P0 (Critical)  
**User Story:** As a field engineer, I want capture to start automatically when a device connects so that I don't miss any network events.

**Requirements:**
- System SHALL automatically create a new session on device connection
- System SHALL start ADB logging immediately
- System SHALL initiate SCAT conversion for supported chipsets
- System SHALL begin TShark packet capture
- System SHALL create session directory structure

**Acceptance Criteria:**
- ✅ Session created within 1s of device detection
- ✅ All capture processes start within 2s
- ✅ Session directory created with proper structure
- ✅ No data loss during startup
- ✅ Handles rapid connect/disconnect cycles

#### FR-2.2: Manual Session Control
**Priority:** P1 (High)  
**Requirements:**
- User CAN manually start/stop sessions
- User CAN pause/resume capture
- User CAN add session notes and tags
- System SHALL preserve all data on manual stop

#### FR-2.3: Session Lifecycle Management
**Priority:** P0 (Critical)  
**Requirements:**
- System SHALL track session status (ACTIVE, PAUSED, COMPLETED, FAILED)
- System SHALL record start/end timestamps
- System SHALL calculate session duration
- System SHALL finalize artifacts on session end
- System SHALL handle abnormal termination gracefully

---

### 3.3 Log Processing & Conversion

#### FR-3.1: Baseband Log Conversion
**Priority:** P0 (Critical)  
**User Story:** As a network analyst, I want baseband logs automatically converted to PCAP so that I can analyze them with standard tools.

**Requirements:**
- System SHALL convert .sdm/.qmdl2 files to PCAP using SCAT
- System SHALL support Qualcomm, Samsung, HiSilicon, Unisoc chipsets
- System SHALL preserve all protocol layers (RRC, NAS, MAC, PHY)
- System SHALL handle conversion errors gracefully
- System SHALL report conversion progress

**Acceptance Criteria:**
- ✅ Conversion completes within 2x real-time duration
- ✅ No packet loss during conversion
- ✅ All protocol layers preserved
- ✅ Error messages are actionable
- ✅ Progress indicator updates every second

#### FR-3.2: PCAP Decoding
**Priority:** P0 (Critical)  
**Requirements:**
- System SHALL decode PCAP files using TShark
- System SHALL extract protocol messages (RRC, NAS, PDCP, RLC, MAC, IP)
- System SHALL parse message types and parameters
- System SHALL store decoded messages in database
- System SHALL support filtering by protocol/message type

---

### 3.4 Real-Time Visualization

#### FR-4.1: Live Log Streaming
**Priority:** P0 (Critical)  
**User Story:** As a field engineer, I want to see live logs in real-time so that I can monitor network behavior during tests.

**Requirements:**
- System SHALL stream logs via Server-Sent Events (SSE)
- System SHALL support color-coded log levels (INFO, WARN, ERROR)
- System SHALL display protocol-specific formatting
- System SHALL support log filtering by protocol/RAT/severity
- System SHALL maintain scrollback buffer (10,000 lines)
- System SHALL support pause/resume streaming

**Acceptance Criteria:**
- ✅ Logs appear within 100ms of generation
- ✅ Color coding applied correctly
- ✅ Filters work without lag
- ✅ Pause/resume works instantly
- ✅ No memory leaks with long sessions

#### FR-4.2: Terminal Interface
**Priority:** P1 (High)  
**Requirements:**
- Implement xterm.js-based terminal emulator
- Support ANSI color codes
- Enable text search within logs
- Support copy/paste operations
- Provide "follow" mode toggle

---

### 3.5 KPI Analysis

#### FR-5.1: Real-Time KPI Calculation
**Priority:** P0 (Critical)  
**User Story:** As a performance analyst, I want KPIs calculated in real-time so that I can identify issues immediately.

**Requirements:**
- System SHALL calculate signal quality metrics (RSRP, RSRQ, SINR)
- System SHALL calculate throughput (DL/UL)
- System SHALL calculate success rates (RRC, RACH, Handover, E-RAB)
- System SHALL calculate performance metrics (latency, packet loss, jitter)
- System SHALL aggregate KPIs over configurable time windows (1s, 5s, 30s, 1m)
- System SHALL support per-RAT KPI calculation (LTE, NR, WCDMA, GSM)

**Acceptance Criteria:**
- ✅ KPIs calculated within 1s of data availability
- ✅ Accuracy within 1% of reference tools
- ✅ All RATs supported
- ✅ Time windows configurable
- ✅ No calculation errors logged

#### FR-5.2: KPI Visualization
**Priority:** P1 (High)  
**Requirements:**
- Display KPIs in real-time charts (line, bar, gauge)
- Show min/avg/max statistics
- Support time-series visualization
- Enable KPI comparison across sessions
- Provide export to CSV/JSON

#### FR-5.3: KPI Categories
**Priority:** P1 (High)  
**Requirements:**
- **Accessibility:** RRC Connection SR, RACH SR, E-RAB Setup SR, Attach SR
- **Mobility:** Handover SR, TAU SR, Cell Reselection Rate
- **Retainability:** Call Drop Rate, Abnormal Release Rate
- **Integrity:** RSRP, RSRQ, SINR, RSCP, Ec/Io, RXLEV, RXQUAL
- **Performance:** Throughput (DL/UL), Latency, Packet Loss, Jitter

---

### 3.6 Anomaly Detection

#### FR-6.1: Rule-Based Anomaly Detection
**Priority:** P1 (High)  
**User Story:** As a network optimizer, I want anomalies detected automatically so that I can focus on problem areas.

**Requirements:**
- System SHALL detect coverage issues (RSRP < -110 dBm)
- System SHALL detect quality issues (RSRQ < -15 dB, SINR < 0 dB)
- System SHALL detect handover failures
- System SHALL detect call drops
- System SHALL detect throughput degradation
- System SHALL assign severity levels (INFO, WARNING, CRITICAL)
- System SHALL record GPS coordinates for anomalies

**Acceptance Criteria:**
- ✅ Anomalies detected within 2s of occurrence
- ✅ False positive rate < 5%
- ✅ All anomaly types supported
- ✅ Severity levels assigned correctly
- ✅ GPS coordinates accurate within 10m

#### FR-6.2: Anomaly Visualization
**Priority:** P1 (High)  
**Requirements:**
- Display anomalies in timeline view
- Show anomalies on map with icons
- Provide anomaly details on click
- Support filtering by type/severity
- Enable anomaly export

---

### 3.7 Map Visualization

#### FR-7.1: GPS-Tracked Network Quality
**Priority:** P1 (High)  
**User Story:** As a field engineer, I want to see network quality on a map so that I can identify coverage gaps.

**Requirements:**
- System SHALL display GPS trace on map
- System SHALL overlay KPI heat maps (RSRP, RSRQ, SINR, throughput)
- System SHALL mark anomalies with icons
- System SHALL support offline map tiles
- System SHALL support zoom/pan/rotate
- System SHALL support time-based playback

**Acceptance Criteria:**
- ✅ Map loads within 2s
- ✅ GPS trace accurate within 10m
- ✅ Heat maps update in real-time
- ✅ Works offline with cached tiles
- ✅ Smooth pan/zoom performance

#### FR-7.2: Map Interactions
**Priority:** P2 (Medium)  
**Requirements:**
- Click on trace to see KPIs at that point
- Click on anomaly to see details
- Filter by time range
- Filter by KPI threshold
- Export map as image

---

### 3.8 Signaling Message Analysis

#### FR-8.1: Protocol Message Viewer
**Priority:** P1 (High)  
**User Story:** As a protocol analyst, I want to view decoded signaling messages so that I can debug network issues.

**Requirements:**
- System SHALL display paginated list of protocol messages
- System SHALL support filtering by protocol (RRC, NAS, MAC, PDCP, RLC, IP)
- System SHALL support filtering by message type
- System SHALL display message timestamp, direction, size
- System SHALL show decoded message content
- System SHALL support message search

**Acceptance Criteria:**
- ✅ Messages load within 1s
- ✅ Pagination works smoothly (100 messages/page)
- ✅ Filters apply instantly
- ✅ Message content displayed correctly
- ✅ Search returns results within 500ms

---

### 3.9 Reporting

#### FR-9.1: Automated Report Generation
**Priority:** P2 (Medium)  
**User Story:** As a project manager, I want automated reports so that I can share results with stakeholders.

**Requirements:**
- System SHALL generate PDF reports
- System SHALL generate HTML reports
- Reports SHALL include session metadata
- Reports SHALL include KPI summary (min/avg/max)
- Reports SHALL include KPI charts
- Reports SHALL include anomaly list
- Reports SHALL include map snapshot
- Reports SHALL include log excerpts

**Acceptance Criteria:**
- ✅ Report generation completes within 30s
- ✅ PDF is properly formatted
- ✅ All sections included
- ✅ Charts are high-resolution
- ✅ Reports are timestamped

---

### 3.10 Data Management

#### FR-10.1: Session Storage
**Priority:** P0 (Critical)  
**Requirements:**
- System SHALL store sessions in SQLite database
- System SHALL create per-session directory structure
- System SHALL store artifacts (PCAP, JSON, PDF)
- System SHALL support session search
- System SHALL support session deletion

#### FR-10.2: Data Export
**Priority:** P2 (Medium)  
**Requirements:**
- Export KPIs to CSV/JSON
- Export anomalies to CSV/JSON
- Export signaling messages to JSON
- Export map data to GeoJSON
- Download artifacts (PCAP, reports)

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-1: Capture Performance**
- Capture SHALL support 100+ packets/second without loss
- Log streaming SHALL have <100ms latency
- KPI calculation SHALL complete within 1s of data availability

**NFR-2: Analysis Performance**
- PCAP decoding SHALL process at 2x real-time speed
- KPI aggregation SHALL handle 1M+ records
- Map rendering SHALL support 10,000+ GPS points

**NFR-3: UI Responsiveness**
- UI SHALL respond to user input within 100ms
- Charts SHALL update at 1 FPS minimum
- Map SHALL pan/zoom smoothly (60 FPS)

### 4.2 Scalability

**NFR-4: Data Volume**
- System SHALL handle 10GB+ PCAP files
- System SHALL support 24-hour continuous sessions
- System SHALL store 1000+ sessions

**NFR-5: Concurrent Operations**
- System SHALL support 5+ simultaneous device captures
- System SHALL support 10+ concurrent UI clients

### 4.3 Reliability

**NFR-6: Availability**
- System SHALL have 99.9% uptime for capture operations
- System SHALL recover from crashes within 10s
- System SHALL preserve data on abnormal termination

**NFR-7: Data Integrity**
- System SHALL ensure zero packet loss during capture
- System SHALL validate data integrity with checksums
- System SHALL detect and report corrupted files

### 4.4 Usability

**NFR-8: User Experience**
- System SHALL require zero configuration for basic use
- System SHALL provide contextual help
- System SHALL follow platform UI conventions
- System SHALL support keyboard shortcuts

**NFR-9: Accessibility**
- UI SHALL support screen readers
- UI SHALL support high-contrast themes
- UI SHALL support keyboard-only navigation

### 4.5 Security

**NFR-10: Authentication**
- System SHALL support user authentication
- System SHALL hash passwords with bcrypt
- System SHALL support session timeout

**NFR-11: Authorization**
- System SHALL support role-based access control
- System SHALL audit sensitive operations
- System SHALL validate license keys

### 4.6 Maintainability

**NFR-12: Code Quality**
- Code SHALL have 80%+ test coverage
- Code SHALL follow style guidelines
- Code SHALL be documented with JavaDoc

**NFR-13: Observability**
- System SHALL log errors to Sentry
- System SHALL expose Prometheus metrics
- System SHALL provide health check endpoint

---

## 5. User Stories

### Epic 1: Device Management

**US-1.1: Auto Device Detection**  
**As a** field engineer  
**I want** devices to be automatically detected when connected  
**So that** I can start capturing immediately without configuration

**Acceptance Criteria:**
- Device appears in UI within 3s of connection
- Device metadata displayed accurately
- Connection status updates in real-time
- Supports multiple devices simultaneously

---

**US-1.2: Device Information Display**  
**As a** network analyst  
**I want** to see detailed device information  
**So that** I can verify test setup and troubleshoot issues

**Acceptance Criteria:**
- Shows model, manufacturer, Android version
- Shows baseband version and chipset type
- Shows battery level and temperature
- Updates in real-time

---

### Epic 2: Capture Operations

**US-2.1: Automatic Capture Start**  
**As a** field engineer  
**I want** capture to start automatically on device connection  
**So that** I don't miss any network events

**Acceptance Criteria:**
- Session created within 1s of device detection
- All capture processes start within 2s
- No data loss during startup
- Handles rapid connect/disconnect

---

**US-2.2: Manual Session Control**  
**As a** test engineer  
**I want** to manually start/stop sessions  
**So that** I can control when data is captured

**Acceptance Criteria:**
- Start/stop buttons work instantly
- Session status updates correctly
- Data preserved on manual stop
- Can add session notes

---

**US-2.3: Graceful Disconnect Handling**  
**As a** field engineer  
**I want** sessions to end gracefully on device disconnect  
**So that** I don't lose captured data

**Acceptance Criteria:**
- Session finalized within 5s of disconnect
- All artifacts saved
- Session marked as COMPLETED
- No crashes or data corruption

---

### Epic 3: Real-Time Monitoring

**US-3.1: Live Log Streaming**  
**As a** network analyst  
**I want** to see live logs in real-time  
**So that** I can monitor network behavior during tests

**Acceptance Criteria:**
- Logs appear within 100ms
- Color-coded by protocol/severity
- Supports filtering
- Pause/resume works instantly

---

**US-3.2: Real-Time KPI Display**  
**As a** performance engineer  
**I want** KPIs displayed in real-time  
**So that** I can identify issues immediately

**Acceptance Criteria:**
- KPIs update every second
- Charts show latest values
- Min/avg/max statistics displayed
- Supports multiple KPI types

---

### Epic 4: Analysis & Insights

**US-4.1: KPI Calculation**  
**As a** performance analyst  
**I want** comprehensive KPIs calculated automatically  
**So that** I can evaluate network quality

**Acceptance Criteria:**
- All standard KPIs calculated
- Accuracy within 1% of reference tools
- Supports all RATs (LTE, NR, WCDMA, GSM)
- Time windows configurable

---

**US-4.2: Anomaly Detection**  
**As a** network optimizer  
**I want** anomalies detected automatically  
**So that** I can focus on problem areas

**Acceptance Criteria:**
- Detects coverage, quality, handover, drop issues
- Assigns severity levels correctly
- Records GPS coordinates
- False positive rate < 5%

---

**US-4.3: Protocol Message Analysis**  
**As a** protocol analyst  
**I want** to view decoded signaling messages  
**So that** I can debug network issues

**Acceptance Criteria:**
- Messages displayed with timestamps
- Supports filtering by protocol/type
- Message content decoded correctly
- Search works within 500ms

---

### Epic 5: Visualization

**US-5.1: Map Visualization**  
**As a** field engineer  
**I want** network quality displayed on a map  
**So that** I can identify coverage gaps

**Acceptance Criteria:**
- GPS trace displayed accurately
- KPI heat maps overlay correctly
- Anomalies marked with icons
- Works offline with cached tiles

---

**US-5.2: KPI Charts**  
**As a** performance engineer  
**I want** KPIs visualized in charts  
**So that** I can analyze trends over time

**Acceptance Criteria:**
- Line charts for time-series data
- Bar charts for aggregates
- Gauge charts for current values
- Export to CSV/JSON

---

### Epic 6: Reporting

**US-6.1: Automated Report Generation**  
**As a** project manager  
**I want** automated reports generated  
**So that** I can share results with stakeholders

**Acceptance Criteria:**
- PDF and HTML formats supported
- Includes KPIs, anomalies, maps, logs
- Generation completes within 30s
- Reports are timestamped

---

**US-6.2: Report Customization**  
**As a** analyst  
**I want** to customize report sections  
**So that** I can focus on relevant information

**Acceptance Criteria:**
- Can select which sections to include
- Can add custom notes
- Can choose chart types
- Can set branding/logo

---

### Epic 7: Data Management

**US-7.1: Session History**  
**As a** test engineer  
**I want** to view past sessions  
**So that** I can compare results over time

**Acceptance Criteria:**
- Sessions listed with metadata
- Supports search and filtering
- Can open past sessions
- Can delete old sessions

---

**US-7.2: Data Export**  
**As a** analyst  
**I want** to export data in standard formats  
**So that** I can use it in other tools

**Acceptance Criteria:**
- Export KPIs to CSV/JSON
- Export messages to JSON
- Export map data to GeoJSON
- Download PCAP files

---

### Epic 8: Security & Administration

**US-8.1: User Authentication**  
**As a** system administrator  
**I want** user authentication  
**So that** only authorized users can access the system

**Acceptance Criteria:**
- Login with username/password
- Passwords hashed securely
- Session timeout after inactivity
- Audit log of logins

---

**US-8.2: License Management**  
**As a** system administrator  
**I want** license validation  
**So that** features are enabled based on license

**Acceptance Criteria:**
- License key validated at startup
- Features enabled/disabled per license
- Expiration warnings displayed
- Audit log of license changes

---

## 6. Technical Architecture

### 6.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Next.js + Tauri)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard | Terminal | Charts | Map | Settings     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│           Backend (Spring Boot WebFlux + R2DBC)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Session | KPI | Device | Record | Anomaly Services │  │
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

### 6.2 Technology Stack

**Backend:**
- Spring Boot 3.2+ (WebFlux)
- R2DBC with SQLite
- Reactive Streams (Project Reactor)
- SpringDoc OpenAPI
- Micrometer + Prometheus

**Frontend:**
- Next.js 14+
- React 18+
- Tauri 1.5+
- xterm.js (terminal)
- Recharts (charts)
- MapLibre GL (maps)

**External Tools:**
- SCAT (Python) - Baseband log conversion
- TShark (C) - PCAP decoding
- ADB (Java) - Device communication
- Custom KPI Extractor (Python) - Real-time KPI extraction (MobileInsight parity)

### 6.3 Data Model

**Core Entities:**
- Session: Capture session metadata
- Artifact: Generated files (PCAP, JSON, PDF)
- Record: Decoded protocol messages
- KpiAggregate: Time-windowed KPI values
- Anomaly: Detected network issues
- GpsTrace: GPS coordinates with timestamps

---

## 7. Development Roadmap

### Phase 1: MVP (Sprint 1-2) - 4 weeks
- ✅ Device detection and auto-capture
- ✅ Real-time log streaming
- ✅ PCAP conversion and decoding
- ✅ Basic KPI calculation
- ✅ SQLite persistence
- ✅ Terminal UI

### Phase 2: Analysis (Sprint 3-4) - 4 weeks
- KPI visualization (charts)
- Anomaly detection
- Map visualization
- Protocol message viewer
- Session management

### Phase 3: Reporting (Sprint 5-6) - 4 weeks
- PDF/HTML report generation
- Data export (CSV, JSON, GeoJSON)
- Report customization
- Batch processing

### Phase 4: Enterprise (Sprint 7-8) - 4 weeks
- User authentication
- License management
- Role-based access control
- Audit logging
- Multi-user support

### Phase 5: Advanced (Sprint 9-10) - 4 weeks
- AI-powered insights
- Advanced anomaly detection
- Plugin system
- Cloud sync (optional)
- Mobile app (optional)

---

## 8. Success Criteria

### 8.1 MVP Success Criteria
- ✅ Auto-capture works on 3+ device models
- ✅ Zero packet loss during capture
- ✅ KPI accuracy within 1% of QCat
- ✅ UI loads within 2s
- ✅ No crashes during 24-hour session

### 8.2 Product Success Criteria
- 1000+ active users within 6 months
- 95%+ session success rate
- <5% false positive anomaly rate
- 4.5/5 user satisfaction score
- Feature parity with QCat/QXDM

---

## 9. Risks & Mitigation

### 9.1 Technical Risks

**Risk:** SCAT conversion failures on unsupported chipsets  
**Mitigation:** Maintain chipset compatibility matrix, provide fallback to raw log viewing

**Risk:** Performance degradation with large PCAP files  
**Mitigation:** Implement streaming processing, pagination, lazy loading

**Risk:** GPS accuracy issues indoors  
**Mitigation:** Support manual location entry, interpolation algorithms

### 9.2 Business Risks

**Risk:** Competition from established tools  
**Mitigation:** Focus on UX differentiation, AI features, pricing

**Risk:** Licensing complexity  
**Mitigation:** Simple tiered licensing, free tier for evaluation

---

## 10. Appendices

### 10.1 Glossary

- **ADB:** Android Debug Bridge
- **PCAP:** Packet Capture file format
- **SCAT:** Silent Cat (baseband log converter)
- **KPI:** Key Performance Indicator
- **RAT:** Radio Access Technology
- **RSRP:** Reference Signal Received Power
- **RSRQ:** Reference Signal Received Quality
- **SINR:** Signal-to-Interference-plus-Noise Ratio

### 10.2 References

- 3GPP TS 36.214 (LTE Physical Layer Measurements)
- 3GPP TS 38.215 (NR Physical Layer Measurements)
- SCAT Documentation: https://github.com/fgsect/scat
- TShark User Guide: https://www.wireshark.org/docs/man-pages/tshark.html

---

## 11. Current Implementation Status

### 11.1 System Architecture (As-Built)

#### Backend Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Boot WebFlux Backend                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │   Controllers    │  │    Services      │  │ Repositories │ │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤ │
│  │ SessionCtrl      │→ │ SessionService   │→ │ SessionRepo  │ │
│  │ KpiController    │→ │ KpiService       │→ │ KpiRepo      │ │
│  │ DeviceCtrl       │→ │ DeviceDetector   │→ │ DeviceRepo   │ │
│  │ RecordCtrl       │→ │ RecordService    │→ │ RecordRepo   │ │
│  │ AnomalyCtrl      │→ │ AnomalyService   │→ │ AnomalyRepo  │ │
│  │ ArtifactCtrl     │→ │ ArtifactService  │→ │ ArtifactRepo │ │
│  │ MapDataCtrl      │→ │ MapVizService    │→ │ GpsRepo      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Orchestration Layer                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ CaptureOrchestrationService                              │  │
│  │  - Manages capture lifecycle                             │  │
│  │  - Coordinates SCAT, TShark, ADB processes               │  │
│  │  - Streams logs via SSE                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Data Layer (R2DBC + SQLite)                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Tables: sessions, artifacts, kpi_aggregates, anomalies,  │  │
│  │         records, gps_traces                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js + Tauri)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Client Layer                       │  │
│  │  - Fetch-based HTTP client (src/utils/api.ts)            │  │
│  │  - All backend communication via REST                     │  │
│  │  - SSE for log streaming                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    UI Components                          │  │
│  │  - Dashboard (session list, device status)               │  │
│  │  - Terminal (xterm.js for log streaming)                 │  │
│  │  - Charts (Recharts for KPI visualization)               │  │
│  │  - Map (MapLibre GL for GPS tracking)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Tauri Desktop Shell                          │  │
│  │  - OS-level file operations (get_app_data_dir)            │  │
│  │  - File explorer integration (open_file_location)         │  │
│  │  - NO business logic duplication                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Process
┌─────────────────────────────────────────────────────────────────┐
│                    External Tools (Python/CLI)                   │
├─────────────────────────────────────────────────────────────────┤
│  SCAT          - Baseband log conversion (.sdm → .pcap)          │
│  TShark        - PCAP decoding (GSMTAP → JSON)                   │
│  ADB           - Device detection and log capture                │
│  KPI Extractor - Real-time KPI extraction (MobileInsight parity) │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Completed Features (Sprint 1 MVP - ✅ 100%)

#### Backend Implementation
- ✅ **Device Management API** (DeviceController, DeviceDetectorService)
  - Auto-detection via ADB every 3 seconds
  - Device metadata extraction (model, manufacturer, Android version)
  - GET /api/devices, GET /api/devices/{id}

- ✅ **Session Management API** (SessionController, SessionService)
  - Auto-start on device connect
  - Manual start/stop control
  - Session lifecycle tracking (ACTIVE, COMPLETED, FAILED)
  - POST /api/sessions/start, POST /api/sessions/{id}/stop
  - GET /api/sessions, GET /api/sessions/{id}, GET /api/sessions/recent

- ✅ **Capture Orchestration** (CaptureOrchestrationService)
  - Process management for SCAT, TShark, ADB
  - Real-time log streaming via SSE
  - Graceful shutdown on device disconnect
  - GET /api/sessions/{id}/logs (SSE endpoint)

- ✅ **KPI Management API** (KpiController, KpiService)
  - Consolidated KPI data structure (KpiDataDto)
  - Real-time KPI calculation and aggregation
  - Custom KPI extractor with MobileInsight parity
  - RRC connection success rate, RACH success rate
  - Handover success rate, E-RAB setup success rate
  - Signal quality metrics (RSRP, RSRQ, SINR)
  - Filtering by RAT, metric, category
  - GET /api/kpis/session/{id}, GET /api/kpis/session/{id}/aggregates
  - GET /api/kpis/session/{id}/metric/{metric}
  - GET /api/kpis/session/{id}/category/{category}

- ✅ **Signaling Records API** (RecordController, RecordService)
  - Paginated protocol message access
  - Protocol filtering (RRC, NAS, MAC, PDCP, RLC, IP)
  - GET /api/records/session/{id}, GET /api/records/{id}

- ✅ **Anomaly Detection API** (AnomalyController)
  - Anomaly storage and retrieval
  - GET /api/anomalies/session/{id}

- ✅ **Artifact Management API** (ArtifactController)
  - File artifact tracking (PCAP, JSON, PDF)
  - Download endpoint with proper headers
  - GET /api/artifacts/session/{id}, GET /api/artifacts/{id}/download

- ✅ **Map Data API** (MapDataController)
  - GPS trace data
  - KPI clustering (K-Means)
  - Elbow method for optimal K
  - GET /api/sessions/{id}/map

- ✅ **Database Schema** (SQLite + R2DBC)
  - sessions table (id, device_id, status, timestamps)
  - artifacts table (id, session_id, type, path, size)
  - kpi_aggregates table (id, session_id, metric, rat, values, window)
  - anomalies table (id, session_id, category, severity, location)
  - records table (id, session_id, protocol, message_type, timestamp)
  - gps_traces table (id, session_id, lat, lon, timestamp)

- ✅ **API Documentation** (SpringDoc OpenAPI)
  - Comprehensive Swagger UI at /swagger-ui.html
  - Detailed @Operation, @ApiResponse, @Parameter annotations
  - Request/response schemas with examples
  - Error response documentation

#### Frontend Implementation
- ✅ **API Client** (src/utils/api.ts)
  - Fetch-based HTTP client
  - All backend endpoints covered
  - SSE support for log streaming
  - Proper error handling

- ✅ **Tauri Integration** (src-tauri/src/main.rs)
  - OS-level file operations
  - File explorer integration
  - Proper separation: Tauri for system, Backend for business logic

- ✅ **UI Components** (Next.js + React)
  - Dashboard layout
  - Terminal component (xterm.js)
  - Chart components (Recharts)
  - Map component (MapLibre GL)

#### DevOps & Documentation
- ✅ **Git Repository** (github.com:F2G-Telco-Academy/ECA.git)
  - Proper .gitignore (node_modules excluded)
  - Clean commit history
  - README with setup instructions

- ✅ **Documentation**
  - Comprehensive README.md
  - Product Requirements Document (this file)
  - API documentation via Swagger
  - Inline code documentation (JavaDoc)

### 11.3 API Coverage Status

**Backend API Endpoints: 19/19 (100%)**

| Endpoint | Method | Status | Controller |
|----------|--------|--------|------------|
| /api/devices | GET | ✅ | DeviceController |
| /api/devices/{id} | GET | ✅ | DeviceController |
| /api/sessions/start | POST | ✅ | SessionController |
| /api/sessions/{id}/stop | POST | ✅ | SessionController |
| /api/sessions | GET | ✅ | SessionController |
| /api/sessions/{id} | GET | ✅ | SessionController |
| /api/sessions/recent | GET | ✅ | SessionController |
| /api/sessions/{id}/logs | GET (SSE) | ✅ | SessionController |
| /api/kpis/session/{id} | GET | ✅ | KpiController |
| /api/kpis/session/{id}/aggregates | GET | ✅ | KpiController |
| /api/kpis/session/{id}/metric/{m} | GET | ✅ | KpiController |
| /api/kpis/session/{id}/category/{c} | GET | ✅ | KpiController |
| /api/kpis/session/{id}/rat/{rat} | GET | ✅ | KpiController |
| /api/records/session/{id} | GET | ✅ | RecordController |
| /api/records/{id} | GET | ✅ | RecordController |
| /api/anomalies/session/{id} | GET | ✅ | AnomalyController |
| /api/artifacts/session/{id} | GET | ✅ | ArtifactController |
| /api/artifacts/{id}/download | GET | ✅ | ArtifactController |
| /api/sessions/{id}/map | GET | ✅ | MapDataController |

### 11.4 Remaining Work (Sprint 2-5)

#### Sprint 2: Enhanced Analysis (4 weeks)
**Priority: High**

- ⏳ **Enhanced KPI Calculation**
  - Expand custom KPI extractor with additional metrics
  - Add performance metrics (latency, packet loss, jitter)
  - Implement configurable time-window aggregation (1s, 5s, 30s, 1m)
  - Add throughput calculation (DL/UL)

- ⏳ **Rule-Based Anomaly Detection**
  - Implement detection rules (coverage, quality, handover, drops)
  - Add severity classification (INFO, WARNING, CRITICAL)
  - Integrate with KPI thresholds
  - Add GPS coordinate tagging

- ⏳ **Enhanced Map Visualization**
  - Implement KPI heat map overlays
  - Add anomaly markers with icons
  - Implement time-based playback
  - Add offline tile caching

- ⏳ **Protocol Message Viewer UI**
  - Build paginated message list
  - Add protocol/message type filters
  - Implement message search
  - Add message detail view

#### Sprint 3: Reporting & Export (4 weeks)
**Priority: Medium**

- ⏳ **Report Generation**
  - Implement PDF report generation
  - Implement HTML report generation
  - Add report templates (session summary, KPI analysis, anomaly report)
  - Include charts, maps, and log excerpts
  - POST /api/reports/{id}/generate

- ⏳ **Data Export**
  - Export KPIs to CSV/JSON
  - Export anomalies to CSV/JSON
  - Export signaling messages to JSON
  - Export map data to GeoJSON
  - Batch export functionality

- ⏳ **Session Management Enhancements**
  - Add session notes and tags
  - Implement session search
  - Add session comparison
  - Implement session deletion with cleanup

#### Sprint 4: Enterprise Features (4 weeks)
**Priority: Medium**

- ⏳ **Authentication & Authorization**
  - Implement Spring Security
  - Add user login/logout
  - Implement JWT token authentication
  - Add password hashing (bcrypt)
  - POST /api/auth/login, POST /api/auth/logout

- ⏳ **License Management**
  - Implement license validation
  - Add feature gating based on license
  - Track license expiration
  - POST /api/license/validate

- ⏳ **Role-Based Access Control**
  - Define roles (ADMIN, ENGINEER, ANALYST, VIEWER)
  - Implement permission checks
  - Add audit logging
  - User management UI

- ⏳ **Multi-User Support**
  - Add user table and management
  - Implement session ownership
  - Add sharing capabilities
  - User preferences storage

#### Sprint 5: Advanced Features (4 weeks)
**Priority: Low**

- ⏳ **AI-Powered Insights**
  - Integrate LLM for session summaries
  - Generate anomaly explanations
  - Provide optimization recommendations
  - Natural language query interface

- ⏳ **Advanced Analytics**
  - Trend analysis across sessions
  - Predictive anomaly detection
  - Network quality scoring
  - Comparative analysis

- ⏳ **Plugin System**
  - Define plugin API
  - Implement plugin loader
  - Create sample plugins
  - Plugin marketplace (future)

- ⏳ **Performance Optimization**
  - Implement Redis caching (optional)
  - Add Elasticsearch for search (optional)
  - Optimize large file handling
  - Implement lazy loading

### 11.5 Technical Debt & Improvements

#### High Priority
- ⚠️ **Error Handling**
  - Standardize error responses across all endpoints
  - Add global exception handler
  - Implement retry logic for external processes
  - Add circuit breaker for tool failures

- ⚠️ **Testing**
  - Add unit tests (target: 80% coverage)
  - Add integration tests for API endpoints
  - Add E2E tests for critical flows
  - Add performance tests

- ⚠️ **Observability**
  - Implement Sentry error tracking
  - Add Prometheus metrics
  - Create Grafana dashboards
  - Add structured logging

#### Medium Priority
- 🔧 **Configuration Management**
  - Externalize tool paths to application.yml
  - Add environment-specific configs
  - Implement feature flags
  - Add configuration validation

- 🔧 **Data Validation**
  - Add input validation for all endpoints
  - Implement request/response DTOs
  - Add schema validation
  - Sanitize user inputs

- 🔧 **Performance**
  - Optimize database queries
  - Add connection pooling
  - Implement pagination for large datasets
  - Add caching for frequently accessed data

#### Low Priority
- 📝 **Documentation**
  - Add architecture decision records (ADRs)
  - Create developer onboarding guide
  - Add troubleshooting guide
  - Create video tutorials

- 📝 **Code Quality**
  - Add SonarQube analysis
  - Implement code formatting rules
  - Add pre-commit hooks
  - Create coding standards document

### 11.6 Known Issues & Limitations

#### Current Limitations
1. **Single Device Support**: While architecture supports multiple devices, UI only shows one active session
2. **No Persistence of Logs**: Terminal logs not stored in database (only streamed)
3. **Limited Chipset Support**: SCAT conversion only tested with Qualcomm
4. **No Offline Mode**: Requires backend running for all operations
5. **No Data Backup**: No automated backup of session data

#### Known Issues
1. **Large PCAP Files**: Performance degrades with files >5GB
2. **GPS Accuracy**: Indoor GPS coordinates may be inaccurate
3. **Memory Usage**: Long sessions (>4 hours) may cause memory pressure
4. **Browser Compatibility**: Tested only on Chrome/Edge (Chromium-based)

### 11.7 Deployment Status

#### Development Environment
- ✅ Backend runs on localhost:8080
- ✅ Frontend runs on localhost:3000
- ✅ SQLite database at ./data/eca.db
- ✅ Session data stored in ./data/sessions/

#### Production Readiness
- ⏳ Docker containerization (not implemented)
- ⏳ CI/CD pipeline (not implemented)
- ⏳ Production database migration (not implemented)
- ⏳ Load balancing (not implemented)
- ⏳ Monitoring/alerting (not implemented)

### 11.8 Next Steps (Immediate Priorities)

**Week 1-2:**
1. Expand custom KPI extractor with throughput and latency metrics
2. Add rule-based anomaly detection
3. Complete protocol message viewer UI
4. Add unit tests for core services

**Week 3-4:**
5. Implement PDF/HTML report generation
6. Add data export functionality (CSV, JSON, GeoJSON)
7. Enhance map visualization with heat maps
8. Add session search and filtering

**Week 5-6:**
9. Implement authentication and authorization
10. Add license management
11. Create user management UI
12. Add audit logging

---

## 12. Onboarding Tips (New)
- Backend: Run Spring Boot on localhost:8080; inspect Swagger at /swagger-ui.html.
- Frontend: Next.js on localhost:3000; use src/utils/api.ts for calls; SSE for logs.
- Data: SQLite at ./data/eca.db; sessions in ./data/sessions/.
- Tools: Ensure SCAT, TShark, ADB are installed and accessible via PATH; externalize paths in application.yml.
- Debug: Use CaptureOrchestrationService logs; start with small PCAP (<1GB) to validate pipeline.

---

**Document Control:**
- **Author:** ECA Development Team
- **Reviewers:** Product Management, Engineering, QA
- **Approval:** Product Owner
- **Next Review:** 2026-01-08
- **Last Updated:** 2025-12-08 (Added implementation status)
