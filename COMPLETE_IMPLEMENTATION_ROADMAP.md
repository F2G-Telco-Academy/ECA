# COMPLETE IMPLEMENTATION ROADMAP
## Extended Cellular Analyzer - Based on Deep Resource Inspection

**Date**: 2025-12-06  
**Status**: Backend 60% Complete, Frontend 0%, Integration 0%

---

## MVP USER STORIES - IMPLEMENTATION STATUS

### ✅ COMPLETED (4/11)
1. **Real-Time Log Visualization** - SSE endpoint functional
2. **KPI Aggregation** - 34 KPIs implemented
3. **Database Persistence** - H2 working, all tables created
4. **REST API Layer** - All endpoints responding

### ⚠️ PARTIAL (3/11)
5. **Device Connectivity & Auto-Capture** - Code exists, NOT tested
6. **Conversion of Baseband Logs** - SCAT integration exists, NOT tested
7. **Security & Licensing** - Spring Security configured, license validation missing

### ❌ NOT STARTED (4/11)
8. **Anomaly Detection** - Skeleton only
9. **Map Visualization** - Not started
10. **Reporting** - Not started
11. **AI-Assisted Insights** - Not started

---

## CRITICAL FINDINGS FROM RESOURCE INSPECTION

### 1. SCAT (Baseband Log Converter)
**Location**: `/home/boutchouang-nathan/SpringbootProjects/p2/scat/`

#### ✅ EXTRACTED KNOWLEDGE:
- **ADB GPS Tracker** (`scripts/adb_gps_tracker.py`):
  - Uses `adb shell dumpsys location` for GPS
  - Uses `adb shell dumpsys telephony.registry` for cell info
  - Extracts: MCC, MNC, LAC, CID, PSC/PCI, RSRP, UARFCN, RAT
  - Creates Folium maps with KPI overlays
  - Color-codes signal strength (green/blue/orange/red)

- **KPI Calculator** (`scripts/kpi_calculator_comprehensive.py`):
  - Uses TShark field extraction for precise counting
  - Implements 30+ KPIs with Prometheus metrics
  - Parses SCAT logs for RRC/RACH/Handover/E-RAB/Call events
  - Stores event details with timestamps
  - Exposes metrics on port 9093

#### 🎯 IMPLEMENTATION ACTIONS:
1. **Implement ADB Device Detection**:
   ```java
   // DeviceDetectorService.java
   public Flux<DeviceEvent> detectDevices() {
       return Flux.interval(Duration.ofSeconds(3))
           .flatMap(tick -> executeAdbCommand("adb devices"))
           .map(this::parseDeviceList)
           .distinctUntilChanged();
   }
   ```

2. **Implement GPS Tracking Service**:
   ```java
   // GpsTrackingService.java
   public Mono<GpsLocation> getGpsLocation(String deviceId) {
       return executeAdbCommand("adb -s " + deviceId + " shell dumpsys location")
           .map(this::parseGpsCoordinates);
   }
   
   public Mono<CellInfo> getCellInfo(String deviceId) {
       return executeAdbCommand("adb -s " + deviceId + " shell dumpsys telephony.registry")
           .map(this::parseCellInfo);
   }
   ```

3. **Store GPS with KPIs**:
   ```sql
   ALTER TABLE KPI_AGGREGATES ADD COLUMN latitude DOUBLE;
   ALTER TABLE KPI_AGGREGATES ADD COLUMN longitude DOUBLE;
   ALTER TABLE KPI_AGGREGATES ADD COLUMN cell_id VARCHAR(50);
   ALTER TABLE KPI_AGGREGATES ADD COLUMN pci INTEGER;
   ```

### 2. MobileInsight-Core (KPI Extraction)
**Location**: `/home/boutchouang-nathan/SpringbootProjects/p2/mobileinsight-core-master/`

#### ✅ EXTRACTED KNOWLEDGE:
- **Analyzer Modules**:
  - `lte_rrc_analyzer.py` - RRC connection tracking
  - `lte_nas_analyzer.py` - NAS attach/TAU tracking
  - `lte_measurement_analyzer.py` - RSRP/RSRQ/SINR extraction
  - `wcdma_rrc_analyzer.py` - 3G RRC procedures
  - `nr_rrc_analyzer.py` - 5G NR procedures
  - `handoff_loop_analyzer.py` - Handover detection
  - `uplink_latency_analyzer.py` - Latency calculation

#### 🎯 IMPLEMENTATION ACTIONS:
1. **Verify All TShark Filters** (from SCAT KPI calculator):
   ```java
   // KpiCalculatorService.java - ADD MISSING FILTERS
   
   // LTE Measurement Reports
   "lte-rrc.measurementReport_element"
   
   // LTE Handovers
   "lte-rrc.mobilityFromEUTRACommand_element"
   "lte-rrc.rrcConnectionReconfigurationComplete_element"
   
   // WCDMA Active Set Update (soft handover)
   "rrc.activeSetUpdate_element"
   "rrc.activeSetUpdateComplete_element"
   
   // WCDMA Cell Reselection
   "rrc.cellUpdate_element"
   "rrc.cellUpdateConfirm_element"
   
   // 3G PDP Context
   "gsm_a.gm.sm.msg_type == 0x41"  // Activate PDP Context Request
   "gsm_a.gm.sm.msg_type == 0x42"  // Activate PDP Context Accept
   
   // Security Mode
   "lte-rrc.securityModeCommand_element"
   "lte-rrc.securityModeComplete_element"
   "rrc.securityModeCommand_element"
   "rrc.securityModeComplete_element"
   
   // Location/Routing Area Update
   "gsm_a.dtap.msg_mm_type == 0x08"  // Location Update Request
   "gsm_a.gm.gmm.msg_type == 0x08"   // Routing Area Update Request
   "gsm_a.gm.gmm.msg_type == 0x09"   // Routing Area Update Accept
   ```

2. **Add Missing KPIs**:
   ```java
   // Add to KpiCalculatorService
   - LTE Measurement Report Count
   - LTE Handover Success Rate
   - WCDMA Active Set Update Success Rate
   - WCDMA Cell Reselection Success Rate
   - 3G PDP Context Activation Success Rate
   - Security Mode Command Success Rate
   - Location/Routing Area Update Success Rate
   ```

### 3. Termshark (TShark Terminal UI)
**Location**: `/home/boutchouang-nathan/SpringbootProjects/p2/termshark-master/`

#### ✅ EXTRACTED KNOWLEDGE:
- Written in Go, uses TShark as backend
- Real-time packet capture and display
- Filter syntax: Wireshark display filters
- Streaming approach: reads TShark stdout line-by-line

#### 🎯 IMPLEMENTATION ACTIONS:
1. **TShark Integration Pattern**:
   ```java
   // TSharkIntegrationService.java
   public Flux<String> streamLogs(Path pcapFile) {
       ProcessSpec spec = ProcessSpec.builder()
           .id("tshark-" + sessionId)
           .command("tshark")
           .args(List.of(
               "-r", pcapFile.toString(),
               "-d", "udp.port==4729,gsmtap",
               "-T", "fields",
               "-e", "frame.number",
               "-e", "frame.time",
               "-e", "gsmtap.type",
               "-E", "separator=|"
           ))
           .build();
       
       return externalToolService.start(spec)
           .flatMapMany(handle -> externalToolService.logs(handle));
   }
   ```

### 4. LTE-KPI-Kmeans-Clustering (GPS Map Visualization)
**Location**: `/home/boutchouang-nathan/SpringbootProjects/p2/LTE-KPI-Kmeans-Clustering-main/`

#### ✅ EXTRACTED KNOWLEDGE:
- **Data Structure**:
  ```python
  df = {
      'Latitude': float,
      'Longitude': float,
      'RSRP': int,
      'RSRQ': int,
      'SNR': int,
      'CQI': int,
      'RSSI': int,
      'DL_bitrate': float,
      'UL_bitrate': float,
      'NRxRSRP': int,
      'NRxRSRQ': int,
      'Cluster': int  # 0-3 based on K-means
  }
  ```

- **Clustering Algorithm**:
  - Uses K-means with 4 clusters
  - PCA for dimensionality reduction (2 components)
  - Silhouette score for evaluation
  - Cluster 0: Poor signal (cell edge)
  - Cluster 1: Moderate signal
  - Cluster 2: Good signal, lower bitrate
  - Cluster 3: Excellent signal and bitrate

- **Map Visualization**:
  - Uses Folium (Python) for interactive maps
  - CircleMarker for each GPS point
  - Color-coded by cluster/signal strength
  - Tooltip shows all KPIs
  - Legend for cluster interpretation

#### 🎯 IMPLEMENTATION ACTIONS:
1. **Create GeoJSON API Endpoint**:
   ```java
   // MapDataController.java
   @GetMapping("/api/sessions/{id}/map/geojson")
   public Mono<GeoJsonFeatureCollection> getMapData(@PathVariable Long id) {
       return kpiAggregateRepository.findBySessionId(id)
           .filter(kpi -> kpi.getLatitude() != null && kpi.getLongitude() != null)
           .map(this::toGeoJsonFeature)
           .collectList()
           .map(GeoJsonFeatureCollection::new);
   }
   
   private GeoJsonFeature toGeoJsonFeature(KpiAggregate kpi) {
       return GeoJsonFeature.builder()
           .geometry(new Point(kpi.getLongitude(), kpi.getLatitude()))
           .properties(Map.of(
               "rsrp", kpi.getAvgValue(),
               "timestamp", kpi.getWindowStart(),
               "rat", kpi.getRat(),
               "cluster", determineCluster(kpi)
           ))
           .build();
   }
   ```

2. **Implement Anomaly Clustering**:
   ```java
   // AnomalyDetectionService.java
   public Flux<Anomaly> detectAnomalies(Long sessionId) {
       return kpiAggregateRepository.findBySessionId(sessionId)
           .collectList()
           .flatMapMany(kpis -> {
               // Apply K-means clustering
               List<Anomaly> anomalies = new ArrayList<>();
               
               // Cluster 0: Poor signal (RSRP < -105 dBm)
               kpis.stream()
                   .filter(kpi -> kpi.getMetric().equals("RSRP") && kpi.getAvgValue() < -105)
                   .forEach(kpi -> anomalies.add(createAnomaly(kpi, "POOR_COVERAGE", "CRITICAL")));
               
               // Cluster 1: High handover failure
               // ... more rules
               
               return Flux.fromIterable(anomalies);
           });
   }
   ```

---

## IMPLEMENTATION PHASES

### PHASE 1: ADB & GPS Integration (CRITICAL)
**Estimated Time**: 4 hours

#### Tasks:
1. ✅ Create `AdbCommandExecutor` utility class
2. ✅ Implement `DeviceDetectorService` with real ADB
3. ✅ Implement `GpsTrackingService`
4. ✅ Update database schema for GPS fields
5. ✅ Test with physical device

#### Code:
```java
// AdbCommandExecutor.java
@Service
public class AdbCommandExecutor {
    public Mono<String> execute(String... command) {
        return Mono.fromCallable(() -> {
            ProcessBuilder pb = new ProcessBuilder(command);
            Process process = pb.start();
            return new String(process.getInputStream().readAllBytes());
        }).subscribeOn(Schedulers.boundedElastic());
    }
}

// GpsTrackingService.java
@Service
public class GpsTrackingService {
    private final AdbCommandExecutor adbExecutor;
    
    public Mono<GpsLocation> getGpsLocation(String deviceId) {
        return adbExecutor.execute("adb", "-s", deviceId, "shell", "dumpsys", "location")
            .map(this::parseGpsLocation);
    }
    
    public Mono<CellInfo> getCellInfo(String deviceId) {
        return adbExecutor.execute("adb", "-s", deviceId, "shell", "dumpsys", "telephony.registry")
            .map(this::parseCellInfo);
    }
    
    private GpsLocation parseGpsLocation(String output) {
        Pattern pattern = Pattern.compile("Location\\[gps ([\\d.-]+),([\\d.-]+)");
        Matcher matcher = pattern.matcher(output);
        if (matcher.find()) {
            return new GpsLocation(
                Double.parseDouble(matcher.group(1)),
                Double.parseDouble(matcher.group(2))
            );
        }
        return null;
    }
    
    private CellInfo parseCellInfo(String output) {
        CellInfo info = new CellInfo();
        
        // MCC/MNC
        Matcher mccMnc = Pattern.compile("mMcc=(\\d+)\\s+mMnc=(\\d+)").matcher(output);
        if (mccMnc.find()) {
            info.setMcc(mccMnc.group(1));
            info.setMnc(mccMnc.group(2));
        }
        
        // LAC
        Matcher lac = Pattern.compile("mLac=(\\*?\\d+)").matcher(output);
        if (lac.find()) {
            info.setLac(lac.group(1));
        }
        
        // CID
        Matcher cid = Pattern.compile("mCid=(\\d+\\*+)").matcher(output);
        if (cid.find()) {
            info.setCid(cid.group(1));
        }
        
        // PSC/PCI
        Matcher psc = Pattern.compile("mPsc=(\\d+)").matcher(output);
        if (psc.find()) {
            info.setPci(Integer.parseInt(psc.group(1)));
        }
        
        // RSRP
        Matcher rsrp = Pattern.compile("rscp=(-?\\d+)").matcher(output);
        if (rsrp.find()) {
            info.setRsrp(Integer.parseInt(rsrp.group(1)));
        }
        
        return info;
    }
}
```

### PHASE 2: Enhanced KPI Extraction (HIGH)
**Estimated Time**: 3 hours

#### Tasks:
1. ✅ Add missing TShark filters from SCAT
2. ✅ Implement measurement report KPI
3. ✅ Implement handover KPIs
4. ✅ Implement security mode KPIs
5. ✅ Test with sample PCAP files

### PHASE 3: Anomaly Detection (HIGH)
**Estimated Time**: 4 hours

#### Tasks:
1. ✅ Implement rule-based anomaly detection
2. ✅ Add threshold configuration
3. ✅ Correlate anomalies with GPS
4. ✅ Create anomaly API endpoints
5. ✅ Test anomaly detection

#### Code:
```java
// AnomalyDetectionService.java
@Service
public class AnomalyDetectionService {
    private final KpiAggregateRepository kpiRepository;
    private final AnomalyRepository anomalyRepository;
    
    public Flux<Anomaly> detectAnomalies(Long sessionId) {
        return kpiRepository.findBySessionId(sessionId)
            .collectList()
            .flatMapMany(kpis -> {
                List<Anomaly> anomalies = new ArrayList<>();
                
                // Rule 1: Poor Coverage (RSRP < -105 dBm)
                kpis.stream()
                    .filter(kpi -> "RSRP".equals(kpi.getMetric()) && kpi.getAvgValue() < -105)
                    .forEach(kpi -> anomalies.add(Anomaly.builder()
                        .sessionId(sessionId)
                        .category("POOR_COVERAGE")
                        .severity("CRITICAL")
                        .timestamp(kpi.getWindowStart())
                        .latitude(kpi.getLatitude())
                        .longitude(kpi.getLongitude())
                        .detailsJson(String.format("{\"rsrp\": %.2f}", kpi.getAvgValue()))
                        .build()));
                
                // Rule 2: High Handover Failure Rate
                Map<LocalDateTime, List<KpiAggregate>> handoverKpis = kpis.stream()
                    .filter(kpi -> kpi.getMetric().contains("HANDOVER"))
                    .collect(Collectors.groupingBy(KpiAggregate::getWindowStart));
                
                handoverKpis.forEach((time, kpiList) -> {
                    double failureRate = calculateHandoverFailureRate(kpiList);
                    if (failureRate > 5.0) {  // > 5% failure rate
                        anomalies.add(Anomaly.builder()
                            .sessionId(sessionId)
                            .category("HANDOVER_FAILURE")
                            .severity("HIGH")
                            .timestamp(time)
                            .detailsJson(String.format("{\"failure_rate\": %.2f}", failureRate))
                            .build());
                    }
                });
                
                // Rule 3: Call Drop
                // Rule 4: Low Throughput
                // ... more rules
                
                return Flux.fromIterable(anomalies)
                    .flatMap(anomalyRepository::save);
            });
    }
}
```

### PHASE 4: Map Visualization API (HIGH)
**Estimated Time**: 3 hours

#### Tasks:
1. ✅ Create GeoJSON data model
2. ✅ Implement map data API endpoint
3. ✅ Add clustering logic
4. ✅ Test with sample GPS data

### PHASE 5: Report Generation (MEDIUM)
**Estimated Time**: 4 hours

#### Tasks:
1. ✅ Design report template
2. ✅ Implement PDF generation (iText/Flying Saucer)
3. ✅ Include KPI charts (JFreeChart)
4. ✅ Include map snapshot
5. ✅ Test report generation

### PHASE 6: Frontend Development (CRITICAL)
**Estimated Time**: 8 hours

#### Tasks:
1. ✅ Setup Next.js project
2. ✅ Implement terminal pane (xterm.js)
3. ✅ Implement KPI charts (Recharts)
4. ✅ Implement map view (MapLibre GL)
5. ✅ Connect to backend APIs
6. ✅ Test end-to-end flow

---

## CURRENT BACKEND STATUS

### ✅ WORKING:
- Spring Boot WebFlux application
- H2 database with all tables
- REST API endpoints (sessions, KPIs, artifacts, anomalies)
- 34 KPIs implemented
- SSE log streaming
- Session management

### ⚠️ NEEDS TESTING:
- ADB device detection
- SCAT integration
- TShark integration
- GPS tracking
- Auto-capture workflow

### ❌ MISSING:
- Anomaly detection logic
- Map data API
- Report generation
- License validation
- Frontend application

---

## NEXT IMMEDIATE ACTIONS

1. **Implement ADB Device Detection** (2 hours)
2. **Implement GPS Tracking** (2 hours)
3. **Add Missing KPI Filters** (1 hour)
4. **Implement Anomaly Detection** (3 hours)
5. **Create Map Data API** (2 hours)
6. **Start Frontend Development** (8 hours)

**Total Estimated Time to MVP**: ~18 hours

---

## SUCCESS CRITERIA

### Backend:
- ✅ Device auto-detection working
- ✅ GPS tracking functional
- ✅ All 34+ KPIs calculated
- ✅ Anomalies detected and stored
- ✅ Map data API returning GeoJSON
- ✅ Reports generated as PDF

### Frontend:
- ✅ Terminal pane showing live logs
- ✅ KPI charts displaying metrics
- ✅ Map showing GPS trace with KPI overlay
- ✅ Anomaly markers on map
- ✅ Report download button

### Integration:
- ✅ Auto-capture on device connect
- ✅ Real-time log streaming
- ✅ KPI calculation pipeline
- ✅ Anomaly detection pipeline
- ✅ End-to-end workflow tested

---

**Last Updated**: 2025-12-06 09:30:00
