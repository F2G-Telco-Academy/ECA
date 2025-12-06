# **Extended Cellular Analyzer documentation**

This document consolidates all decisions, flows, and constraints we discussed, so your coding agent can implement the system without inventing anything out of scope. It defines the architecture, modules, interfaces, data contracts, and orchestration across Java/Spring WebFlux, Python tools (SCAT, Termshark, MobileInsight-core), and the modular Tauri/Next.js frontend. The goal is a production-ready modular monolith that can be delivered in under three focused hours, with optional paths to scale later.

---

## **Project overview**

Extended Cellular Analyzer (ECA) captures UE baseband logs, converts, analyzes, and visualizes KPIs, anomalies, and maps. It integrates:

* ADB for device detection.  
* Tshark for capture/decoding.  
* SCAT for silent log conversion to PCAP.  
* MobileInsight-core for KPI extraction.  
* Terminal-like log viewer, KPI charts, and map overlays modeled after XCAL/QXDM.

Target: feature parity with QCat/QXDM/XCAL and differentiation through simplicity, modularity, and AI summaries (optional later). MVP is offline-first and operable with zero training.

---

## **Architecture**

### **Modular monolith baseline**

* Single Spring Boot WebFlux backend for orchestration and APIs.  
* Python tools (SCAT, Termshark, MobileInsight-core) invoked as external processes.  
* SQLite via R2DBC for persistence; Redis/Elasticsearch optional later.  
* Tauri shell hosting a Next.js frontend with terminal pane, KPI charts, map view.

  ### **Modules and responsibilities**

* Capture: ADB detection, Tshark live capture, session lifecycle.  
* Decode: SCAT conversion to PCAP, Termshark decoding to JSON.  
* Analytics: KPI computation (RSRP, RSRQ, SINR, throughput), anomaly detection, aggregation.  
* Visualization: Terminal logs, KPI charts, map overlays, report generation.  
* Security: Authentication, licensing, audit logs.  
* Telemetry: Error reporting (Sentry), metrics (Prometheus/Micrometer).

  ---

  ## **Sprint-ready scope and priorities**

* Sprint 1 MVP:  
  * Auto device detection via ADB.  
  * Auto capture on connect; graceful end on disconnect.  
  * Terminal-like log view streaming stdout/stderr.  
  * SQLite schema for sessions/artifacts/records.  
* Sprint 2:  
  * KPI aggregation and charts.  
  * Rule-based anomaly detection.  
  * Map visualization with offline tiles.  
  * Reporting PDF/HTML; telemetry queue.  
* Sprint 3:  
  * AI insights (optional), security/licensing, observability (Prometheus), modular dashboards.  
  * Optional Redis pub/sub, optional Elasticsearch search.

    ---

    ## **Technology stack and dependencies**

    ### **Backend (Spring Boot WebFlux)**

* Spring Reactive Web  
* Reactive HTTP Client (WebClient)  
* R2DBC API  
* Spring Data R2DBC  
* Spring Security  
* Spring Boot DevTools  
* Lombok  
* Sentry  
* Testing: Spring Boot Starter Test

Manual additions in Maven:

* SQLite R2DBC driver:  
  * groupId: io.r2dbc, artifactId: r2dbc-sqlite, version: 0.9.1  
* Micrometer Prometheus:  
  * groupId: io.micrometer, artifactId: micrometer-registry-prometheus

Optional:

* Spring Data Redis (Access \+ Driver)  
* Spring for Apache Kafka  
* Elasticsearch (only for advanced search)

  ### **External tools (Python/CLI)**

* SCAT: conversion from silent logs (.sdm/.qmdl2) to .pcap.  
* Tshark/Termshark: live capture and decoding to JSON; terminal rendering.  
* MobileInsight-core: KPI extraction pipelines.  
* UI pictures of XCAL interfaces  
* LTE-KPI-Kmeans-Clustering-main

Install tools via system package manager or pip; keep them in separate tool folders, not under Java src.

### **Frontend**

* Tauri for desktop shell (Windows/Linux/macOS).  
* Next.js (React) for UI.  
* xterm.js for terminal pane.  
* Recharts or ECharts for KPI charts.  
* MapLibre GL or Leaflet for maps with offline tile caching.

  ---

  ## **Folder structure**

* backend/  
  * src/main/java/eca/…  
  * src/main/resources/  
  * pom.xml  
* tools/  
  * scat/  
  * termshark/  
  * mobileinsight-core/  
* frontend/  
  * tauri/  
  * nextjs/  
* specs/  
  * constitution.yaml  
  * entities/\*.yaml  
  * flows/\*.yaml  
* assets/  
  * references/xcal/  
  * references/qxdm/  
  * tiles/ (offline map tiles)  
* docs/  
  * this\_document.md

    ---

    ## **Spec Kit constitution**

Use Spec Kit to declare orchestration without hardcoding it in Java. The agent must use this to generate glue code and scripts.

Example constitution.yaml:

constitution:  
  sessions:  
    auto\_start\_on\_device\_connect: true  
    end\_on\_device\_disconnect: true

  services:  
    \- name: DeviceDetector  
      type: process  
      command: adb devices  
      interval: 3s  
      outputs:  
        \- DeviceEvent

    \- name: CaptureService  
      type: process  
      command: tshark \-i usb0 \-w ${session.dir}/capture.pcap  
      start\_condition: DeviceEvent.CONNECTED  
      stop\_condition: DeviceEvent.DISCONNECTED  
      outputs:  
        \- Artifact:capture.pcap

    \- name: ScatConverter  
      type: process  
      command: python3 ${tools.scat}/scat.py \--input ${session.dir}/raw.sdm \--output ${session.dir}/capture.pcap  
      inputs:  
        \- Artifact:raw.sdm  
      outputs:  
        \- Artifact:capture.pcap

    \- name: TermsharkDecoder  
      type: process  
      command: termshark \-r ${session.dir}/capture.pcap \--json \> ${session.dir}/records.json  
      inputs:  
        \- Artifact:capture.pcap  
      outputs:  
        \- RecordStream:${session.dir}/records.json

    \- name: KPIAnalytics  
      type: process  
      command: python3 ${tools.mobileinsight-core}/kpi.py \--input ${session.dir}/records.json \--out ${session.dir}/kpis.json  
      inputs:  
        \- RecordStream:${session.dir}/records.json  
      outputs:  
        \- KpiAggregate:${session.dir}/kpis.json  
        \- Anomaly:${session.dir}/anomalies.json

    \- name: ReportGenerator  
      type: process  
      command: webflux-report \--session ${session.id} \--out ${session.dir}/report.pdf  
      inputs:  
        \- KpiAggregate  
        \- Anomaly  
      outputs:  
        \- Artifact:report.pdf

The coding agent should implement adapters that:

* Launch processes.  
* Stream stdout/stderr to the terminal UI.  
* Watch for file outputs (pcap, json) and persist to SQLite.

  ---

  ## **Data model**

Core entities (SQLite via R2DBC):

* Session  
  * id, deviceId, deviceModel, firmware, startTime, endTime, status  
* Artifact  
  * id, sessionId, type (pcap, pdf, json, raw), path, size, createdAt  
* Record  
  * id, sessionId, timestamp, rat (LTE/NR/WCDMA), layer (RRC/NAS/PHY), messageType, payloadJson  
* KpiAggregate  
  * id, sessionId, metric (RSRP, RSRQ, SINR, throughput), windowStart, windowEnd, min, avg, max  
* Anomaly  
  * id, sessionId, category (coverage, handover, throughput, drop), severity, timestamp, location (lat, lon), detailsJson  
* ErrorReport  
  * id, service, sessionId, level, message, stack, createdAt  
* User  
  * id, username, role, hashedPassword  
* License  
  * id, key, validUntil, featuresJson, status

    ---

    ## **APIs (WebFlux)**

* POST /sessions/start  
  * Triggers manual start. Auto-start is default via detector.  
* GET /sessions/{id}  
* GET /sessions/{id}/logs  
  * SSE/WebSocket streaming terminal logs (stdout/stderr multiplexer).  
* GET /sessions/{id}/kpis  
* GET /sessions/{id}/anomalies  
* GET /sessions/{id}/map  
  * Returns geojson overlays.  
* POST /reports/{id}/generate  
* GET /artifacts/{id}/download  
* POST /auth/login  
* GET /metrics (Prometheus)  
* POST /license/validate

All endpoints must be reactive (Mono/Flux), pagination for lists, and return JSON contracts matching entities.

---

## **Orchestration adapters**

Implement a ProcessAdapter class in Java that:

* Spawns external processes with environment vars and working directories per session.  
* Captures stdout/stderr as Flux\<String\>.  
* Parses JSON outputs where applicable.  
* Emits ErrorReport on non-zero exit codes.

Pseudo-interface:

public interface ExternalTool {  
  Mono\<ProcessHandle\> start(ProcessSpec spec);  
  Flux\<String\> logs(ProcessHandle handle);  
  Mono\<Integer\> awaitExit(ProcessHandle handle);  
}

ProcessSpec fields: command, args, env, cwd, inputFiles, outputFiles, start/stop conditions.

---

## **Terminal pane**

Use xterm.js embedded in the Tauri/Next.js UI:

* Real-time streaming via WebSocket from backend /sessions/{id}/logs.  
* Color-coded by source: INFO (green), WARN (yellow), ERROR (red), DECODE (blue).  
* Filters by protocol, RAT, severity.  
* Pausable, with buffer limit, and “follow” toggle.

  ---

  ## **KPI charts**

Use Recharts/ECharts:

* Line charts for RSRP/RSRQ/SINR per time window.  
* Throughput charts (uplink/downlink).  
* Aggregate statistics displayed (min/avg/max).  
* Download CSV/JSON.

  ---

  ## **Map view**

Use MapLibre GL:

* GPS trace line for the session.  
* KPI heat overlay (RSRP/SINR).  
* Anomaly markers with icons.  
* Offline tile cache (assets/tiles), fallback when offline.  
* Filters: time range, anomaly class, RAT.

  ---

  ## **Reporting**

* PDF and HTML generation.  
* Include session metadata, KPI plots, anomaly list, map snapshot, terminal log excerpt.  
* Stored as Artifact: report.pdf.  
* Export button in UI and API endpoint.

  ---

  ## **Security and licensing**

* Spring Security with login (form or token).  
* License validation at startup and per feature gate.  
* Feature flags: capture, analytics, maps, reporting, AI.  
* Audit logging for key actions: login, start/stop session, report generation.

  ---

  ## **Telemetry and observability**

* Sentry for error tracking.  
* Micrometer Prometheus for metrics (requests, process failures, KPI calculation time).  
* Basic Grafana dashboard (optional).  
* ErrorReport persisted and visible in UI.

  ---

  ## **Configuration**

application.yml keys:

* tools.scat.path  
* tools.termshark.path  
* tools.mobileinsight.path  
* storage.baseDir (per-session folders)  
* db.url (r2dbc:sqlite:///eca.db)  
* security.licenseKey  
* telemetry.sentryDsn  
* observability.prometheus.enabled

  ---

  ## **IntelliJ and build**

* Generate project with Spring Initializr ticking:  
  * Spring Reactive Web, Reactive HTTP Client, R2DBC API, Spring Data R2DBC, Spring Security, DevTools, Lombok, Sentry, Spring Boot Starter Test.  
* Manually add:  
  * io.micrometer: micrometer-registry-prometheus  
  * io.r2dbc: r2dbc-sqlite:0.9.1

    ---

    ## **Device auto-capture flow**

Sequence:

1. ADB detector emits DeviceEvent.CONNECTED.  
2. Backend creates Session and session directory.  
3. Start SCAT or Tshark depending on source:  
   * If silent logs present → SCAT converts to PCAP.  
   * Else live capture via Tshark.  
4. Termshark decodes PCAP to JSON.  
5. MobileInsight-core computes KPIs; anomaly rules run.  
6. UI opens dashboard automatically; terminal shows live logs.  
7. On disconnect, stop processes, finalize artifacts, close session.

   ---

   ## **Rules and constraints**

* Never embed Python into Java src; use external tools via processes.  
* SQLite only for MVP; Redis/Elasticsearch optional later.  
* Modular monolith now; microservices only if scale demands.  
* UI must be intuitive and match XCAL/QXDM references.  
* Offline-first: capture and visualization must not depend on cloud.  
* No inventions outside this document; follow specs and folders.

  ---

  ## **Deliverables in under 3 hours**

* Backend:  
  * Session API \+ ProcessAdapter \+ DeviceDetector (mock via adb).  
  * Endpoints: sessions, logs stream, kpis, anomalies, artifacts.  
  * SQLite schema migration and repositories.  
* Frontend:  
  * Tauri app bootstrapped; Next.js view with:  
    * Sidebar (sessions), terminal pane, KPI charts, map skeleton.  
* Tools integration:  
  * Configurable paths to SCAT/Termshark/MobileInsight-core.  
  * Launch and stream logs; parse basic JSON outputs.

Focus on wiring and skeletons; polish later.

---

## **Final notes for the coding agent**

* Use the screenshots folder (assets/references/xcal, qxdm) to model UI layout (terminal pane, charts, maps).  
* Use the tools folders (tools/scat, tools/termshark, tools/mobileinsight-core) exactly as external processes via configuration; do not copy their code into Java.  
* Implement reactive streams end-to-end; do not block threads.  
* Ensure auto-capture on device connect and graceful shutdown on disconnect.  
* Keep code modular and documented; follow this document strictly.

Perfect, Boutchouang — let’s build a **comprehensive set of user stories** for the **Extended Cellular Analyzer (ECA)** project. I’ll cover multiple perspectives: telecom engineers, analysts, testers, and administrators. Each story will follow the **role → goal → benefit → acceptance criteria** format, and together they’ll form a backlog that aligns with your architecture and competitive positioning against QCat/QXDM.

---

# **📖 Extended Cellular Analyzer – User Stories**

---

## **1\. Device Connectivity & Auto-Capture**

**User Story:**  
 As a **telecom engineer**, I want the software to automatically detect when a phone is connected via ADB so that capture begins without manual setup.

**Acceptance Criteria:**

* When a supported device is connected, a new session is automatically created.  
* Capture starts using ADB \+ Tshark \+ Scat without requiring user commands.  
* UI displays device metadata (model, firmware, battery status).  
* If device disconnects, session ends gracefully with a notification.

---

## **2\. Real-Time Log Visualization**

**User Story:**  
 As a **network analyst**, I want to see live logs in a terminal-like pane so that I can monitor signaling events in real time.

**Acceptance Criteria:**

* Logs stream continuously in a scrollable terminal panel.  
* Messages are color-coded by protocol layer (RRC, NAS, PHY, etc.).  
* Users can filter logs by message type, severity, or RAT (LTE/NR).  
* Logs continue capturing even if the UI pane is closed.

---

## **3\. Conversion of Baseband Logs**

**User Story:**  
 As a **telecom tester**, I want the tool to convert raw baseband logs into structured records so that I can analyze them without manual decoding.

**Acceptance Criteria:**

* Silent logs (.sdm, .qmdl2) are converted to .pcap using Scat.  
* Tshark decodes GSMTAP packets into structured JSON records.  
* Conversion errors are logged and reported in telemetry.  
* Converted artifacts are linked to their session in storage.

---

## **4\. KPI Aggregation**

**User Story:**  
 As a **performance engineer**, I want KPIs (RSRP, RSRQ, SINR, throughput) to be aggregated per session so that I can evaluate network quality.

**Acceptance Criteria:**

* KPIs are calculated in real time and stored in `KpiAggregate`.  
* Charts show min/avg/max values over time.  
* KPIs can be exported to reports (PDF/HTML).  
* Aggregation formulas are configurable.

---

## **5\. Anomaly Detection**

**User Story:**  
 As a **network optimizer**, I want anomalies (e.g., call drops, weak coverage) to be detected automatically so that I can act quickly.

**Acceptance Criteria:**

* Rule engine flags anomalies based on thresholds.  
* Anomalies are categorized (coverage, handover, throughput).  
* Severity levels (INFO, WARN, CRITICAL) are assigned.  
* Anomalies appear on maps with GPS coordinates.

---

## **6\. AI-Assisted Insights**

**User Story:**  
 As a **telecom consultant**, I want AI-generated summaries of anomalies and KPIs so that I can understand results without deep protocol knowledge.

**Acceptance Criteria:**

* LLM microservice generates session summaries.  
* Recommendations are provided in JSON format.  
* Insights are displayed in plain language in the UI.  
* References to raw logs are included for validation.

---

## **7\. Map Visualization**

**User Story:**  
 As a **field engineer**, I want to see KPIs and anomalies plotted on a map so that I can correlate performance with location.

**Acceptance Criteria:**

* Map view shows GPS traces with signal strength overlays.  
* Anomalies are marked with icons (drop, weak signal, etc.).  
* Works offline with cached tiles.  
* Users can zoom, pan, and filter by KPI.

---

## **8\. Reporting**

**User Story:**  
 As a **project manager**, I want to generate reports with KPIs, anomalies, and maps so that I can share results with stakeholders.

**Acceptance Criteria:**

* Reports exportable in PDF and HTML formats.  
* Include session metadata, KPIs, anomalies, maps, and AI insights.  
* Reports are timestamped and stored in artifacts.  
* Users can customize report sections.

---

## **9\. Security & Licensing**

**User Story:**  
 As a **system administrator**, I want license validation and user authentication so that only authorized users can access features.

**Acceptance Criteria:**

* License tokens enable/disable features.  
* User login with username/password (hashed).  
* Audit logs record login, license changes, and feature usage.  
* Expired licenses block capture and analysis.

---

## **10\. Telemetry & Error Reporting**

**User Story:**  
 As a **developer**, I want errors to be reported automatically so that I can debug issues quickly.

**Acceptance Criteria:**

* Errors are captured as `ErrorReport` objects.  
* Reports include stack trace, environment info, and recent logs.  
* Errors are queued offline and sent when online.  
* Engineers can view error streams in telemetry dashboard.

---

## **11\. Competitive Differentiation**

**User Story:**  
 As a **product owner**, I want the tool to match QCat/QXDM features and add AI insights so that we are competitive in the market.

**Acceptance Criteria:**

* Feature parity: device detection, log viewer, KPI charts, map visualization, reporting.  
* Differentiation: AI-assisted summaries, offline-first design, modular dashboards.  
* UX tested to ensure intuitive navigation without training.  
* Benchmarks show comparable performance to QCat/QXDM.

---

# **✅ Summary**

These user stories cover:

* **Core flows** (capture, convert, analyze, visualize).  
* **User experience** (intuitive UI, terminal pane, maps).  
* **Advanced features** (AI insights, anomaly detection).  
* **Operational needs** (security, telemetry, reporting).  
* **Competitive positioning** (parity \+ differentiation).

