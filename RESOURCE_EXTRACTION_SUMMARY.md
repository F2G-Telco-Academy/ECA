# Resource Extraction Summary

## Complete Analysis of Reference Resources

### 1. SCAT (Silent Cellular Analyzer Tool)

**Files Analyzed**:
- `scat/src/scat/main.py` - Entry point and CLI
- `scat/src/scat/parsers/qualcomm/qualcommparser.py` - Qualcomm DIAG parser
- `scat/src/scat/writers/pcapwriter.py` - PCAP generation
- `scat/scripts/kpi_calculator_comprehensive.py` - KPI extraction

**Extracted Patterns**:

1. **Command Structure**:
```bash
python3 -m scat.main -t qc -u --pcap output.pcap -P 4729 -H 127.0.0.1 -L ip,mac,rlc,pdcp,rrc,nas
```

2. **Parser Types**:
- `qc` - Qualcomm (DIAG protocol)
- `sec` - Samsung (SDM format)
- `hisi` - HiSilicon
- `unisoc` - Unisoc

3. **Layers**:
- `ip` - IP packets
- `nas` - Non-Access Stratum
- `rrc` - Radio Resource Control
- `pdcp` - Packet Data Convergence Protocol
- `rlc` - Radio Link Control
- `mac` - Medium Access Control
- `qmi` - Qualcomm MSM Interface

4. **GSMTAP Ports**:
- `4729` - Control plane (signaling)
- `47290` - User plane (data)

5. **PCAP Writer Pattern**:
```python
pcap_hdr = struct.pack('<LLLL', timestamp, microsecond, length, length)
ip_hdr = struct.pack('!BBHHBBBBHLL', version, dsf, length, id, flags, ttl, proto, checksum, src, dest)
udp_hdr = struct.pack('!HHHH', src_port, dest_port, length, checksum)
```

**Implemented**: `ScatIntegrationService.java`

---

### 2. MobileInsight-Core

**Files Analyzed**:
- `mobile_insight/analyzer/kpi/kpi_manager.py` - KPI orchestration
- `mobile_insight/analyzer/kpi/rrc_sr_analyzer.py` - RRC Success Rate
- `mobile_insight/analyzer/kpi/attach_sr_analyzer.py` - Attach Success Rate
- `mobile_insight/analyzer/kpi/kpi_analyzer.py` - Base KPI analyzer

**Extracted Patterns**:

1. **KPI Registration**:
```python
self.register_kpi("Accessibility", "RRC_SR", callback, attributes)
self.register_kpi("Mobility", "HO_SR", callback)
self.register_kpi("Retainability", "RRC_AB_REL", callback)
```

2. **KPI Categories**:
- **Accessibility**: RRC_SR, ATTACH_SR, SR_SR, DEDICATED_BEARER_SR
- **Mobility**: HO_SR, TAU_SR, HO_TOTAL, HO_FAILURE
- **Retainability**: RRC_AB_REL (abnormal release)
- **Integrity**: DL_TPUT, UL_TPUT

3. **NAS Message Types** (TS 24.301):
```python
0x41 - Attach Request
0x42 - Attach Accept
0x48 - TAU Request
0x49 - TAU Accept
0x4c - Service Request
0x4d - Service Accept
```

4. **EMM Cause Codes**:
```python
'3': 'ILL_UE'
'7': 'EPS_NOT_ALLOWED'
'11': 'PLMN_NOT_ALLOWED'
'12': 'TA_NOT_ALLOWED'
'22': 'CONGESTION'
```

5. **Callback Pattern**:
```python
def __rrc_sr_callback(self, msg):
    if msg.type_id == "LTE_RRC_OTA_Packet":
        log_xml = ET.XML(log_item_dict['Msg'])
        for field in log_xml.iter('field'):
            if field.get('name') == "lte-rrc.rrcConnectionRequest_element":
                self.kpi_measurements['total_number'][type] += 1
```

**Implemented**: `KpiCalculatorService.java` with real TShark filters

---

### 3. Termshark

**Files Analyzed**:
- `termshark-master/pkg/pcap/loader.go` - Packet loading
- `termshark-master/pkg/pcap/cmds.go` - TShark command generation
- `termshark-master/pkg/pcap/handlers.go` - Process handling

**Extracted Patterns**:

1. **TShark Commands**:
```go
// PSML (Packet Summary)
tshark -r file.pcap -T psml -Y "display_filter"

// PDML (Packet Details)
tshark -r file.pcap -T pdml -Y "display_filter"

// JSON
tshark -r file.pcap -T json -Y "display_filter"

// Fields
tshark -r file.pcap -T fields -e field1 -e field2 -E separator=|
```

2. **Process Management**:
```go
cmd := exec.Command(tshark, args...)
cmd.Stdout = pipe
cmd.Stderr = summary.New(pr)
cmd.Start()
```

3. **GSMTAP Decode**:
```bash
-d udp.port==4729,gsmtap
```

4. **Display Filters**:
```
lte-rrc.rrcConnectionRequest_element
nas_eps.nas_msg_emm_type == 0x41
gsm_a.dtap.msg_cc_type == 0x05
```

**Implemented**: `TSharkIntegrationService.java`

---

### 4. LTE-KPI-Kmeans-Clustering

**Files Analyzed**:
- `LTE-KPI-Kmeans-Clustering-main/lte_kpi_kmeans_clustering.py`

**Extracted Patterns**:

1. **K-means Clustering**:
```python
kmeans = KMeans(n_clusters=4, random_state=42)
df['Cluster'] = kmeans.fit_predict(df_scaled)
score = silhouette_score(df_scaled, df['Cluster'])
```

2. **Folium Map Generation**:
```python
m = folium.Map(location=[lat, lon], zoom_start=12)
marker_cluster = MarkerCluster().add_to(m)

folium.CircleMarker(
    location=(row['Latitude'], row['Longitude']),
    radius=5,
    color=marker_color,
    fill=True,
    fill_color=marker_color,
    fill_opacity=0.7,
    tooltip=tooltip_text
).add_to(marker_cluster)
```

3. **Cluster Colors**:
```python
Cluster 0: '#3186cc' (Poor signal - cell edge)
Cluster 1: '#FF5733' (Moderate signal)
Cluster 2: '#FF0000' (Good signal, low bitrate)
Cluster 3: '#33FF57' (Excellent coverage)
```

4. **Tooltip Format**:
```python
tooltip_text = (
    f"<b>Cluster {row['Cluster']}</b><br>"
    f"RSRP: {row['RSRP']}<br>"
    f"RSRQ: {row['RSRQ']}<br>"
    f"SNR: {row['SNR']}<br>"
    f"DL_bitrate: {row['DL_bitrate']}<br>"
)
```

5. **GeoJSON Export**:
```python
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lon1, lat1], [lon2, lat2], ...]
    },
    "properties": {"name": "GPS Trace"}
  }]
}
```

**Implemented**: `GpsController.java` with GeoJSON export

---

## Implementation Summary

### Services Created:

1. **ScatIntegrationService** - Full SCAT integration
   - USB capture mode
   - Dump file reading
   - All parser types (qc, sec, hisi, unisoc)
   - All layers (ip, mac, rlc, pdcp, rrc, nas)
   - GSMTAP port configuration

2. **TSharkIntegrationService** - Complete TShark integration
   - PSML extraction (table view)
   - JSON extraction (detailed analysis)
   - Packet counting with filters
   - Field extraction with timestamps
   - GSMTAP decode support

3. **KpiCalculatorService** - Real KPI calculation
   - LTE RRC Success Rate (lte-rrc filters)
   - LTE Attach Success Rate (NAS 0x41/0x42)
   - LTE TAU Success Rate (NAS 0x48/0x49)
   - LTE Handover Success Rate
   - WCDMA RRC Success Rate
   - Call Success Rate (GSM CC messages)

4. **GpsTrackingService** - GPS integration
   - ADB GPS tracker integration
   - Real-time coordinate parsing
   - JSON format handling

5. **GpsController** - Map data export
   - GeoJSON LineString format
   - Ready for Folium/MapLibre visualization

### TShark Filters Used (from KPI calculator):

```
LTE RRC:
- lte-rrc.rrcConnectionRequest_element
- lte-rrc.rrcConnectionSetup_element
- lte-rrc.mobilityFromEUTRACommand_element
- lte-rrc.rrcConnectionReconfigurationComplete_element

LTE NAS:
- nas_eps.nas_msg_emm_type == 0x41  (Attach Request)
- nas_eps.nas_msg_emm_type == 0x42  (Attach Accept)
- nas_eps.nas_msg_emm_type == 0x48  (TAU Request)
- nas_eps.nas_msg_emm_type == 0x49  (TAU Accept)

WCDMA RRC:
- rrc.rrcConnectionRequest_element
- rrc.rrcConnectionSetup_element

GSM Call Control:
- gsm_a.dtap.msg_cc_type == 0x05  (Call Setup)
- gsm_a.dtap.msg_cc_type == 0x0f  (Call Connect)
```

---

## Configuration Applied

**application.yml**:
```yaml
eca:
  tools:
    scat:
      path: ./scat/src/scat
      type: qc
      layers: ip,mac,rlc,pdcp,rrc,nas
      port: 4729
      hostname: 127.0.0.1
    tshark:
      path: tshark
  kpi:
    window-size: 5m
    metrics:
      - LTE_RRC_SR
      - LTE_ATTACH_SR
      - LTE_TAU_SR
      - LTE_HO_SR
      - WCDMA_RRC_SR
      - CALL_SUCCESS_RATE
```

---

## Next Steps

1. **Frontend Integration**:
   - Integrate xterm.js for terminal view
   - Add Recharts for KPI visualization
   - Implement MapLibre for GPS traces
   - Connect to SSE endpoints for real-time logs

2. **Tauri Setup**:
   - Initialize Tauri project
   - Configure Rust backend
   - Build Windows .exe
   - Package with Spring Boot JAR

3. **Testing**:
   - Test with real device via ADB
   - Verify PCAP generation
   - Validate KPI calculations
   - Test GPS tracking

---

**Status**: Backend 80% complete with REAL patterns from all resources
**Next**: Tauri integration for Windows executable
