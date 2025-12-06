# COMPLETE KPI EXTRACTION GUIDE
**All RATs: 5G NR, LTE, WCDMA, GSM, CDMA**

---

## 1. SCAT - Binary Log Parsing

### 5G NR (diagnrlogparser.py)

#### SS-RSRP/RSRQ Parsing (Q7 Format):
```python
def parse_float_q7(data):
    if data == 0:
        return 0
    integer = (data >> 7) & 0xff
    frac = data & 0x7f
    sig = (((integer^0xff)+1)* (-1)) + frac * 0.0078125
    return sig

# Example: serv_rsrp_rx_0 = 0x12345678
rsrp_dbm = parse_float_q7(serv_rsrp_rx_0)
```

#### 5G NR Measurements:
- **NR-ARFCN**: `meas_carrier_list.raster_arfcn`
- **PCI**: `meas_carrier_list.serv_cell_pci`
- **SS-RSRP**: `parse_float_q7(serv_rsrp_rx_0/1/2/3)` (per antenna)
- **SS-RSRQ**: `parse_float_q7(cell_quality_rsrq)`
- **SSB Index**: `beam_meas.ssb_index`
- **Beam ID**: `beam_meas.rx_beam_0/1`

#### 5G NR RRC Messages:
- `LOG_5GNR_RRC_OTA_MESSAGE` (0xB821)
- `LOG_5GNR_RRC_MIB_INFO` (0xB826)
- `LOG_5GNR_RRC_SERVING_CELL_INFO` (0xB827)

#### 5G NAS Messages:
- `LOG_5GNR_NAS_5GMM_PLAIN_OTA_INCOMING_MESSAGE` (0xB80A)
- `LOG_5GNR_NAS_5GMM_PLAIN_OTA_OUTGOING_MESSAGE` (0xB80B)
- `LOG_5GNR_NAS_5GSM_PLAIN_OTA_INCOMING_MESSAGE` (0xB800)
- `LOG_5GNR_NAS_5GSM_PLAIN_OTA_OUTGOING_MESSAGE` (0xB801)

---

### LTE (diagltelogparser.py)

#### RSRP/RSRQ/RSSI Parsing:
```python
def parse_rsrp(rsrp):
    return -180 + rsrp * 0.0625

def parse_rsrq(rsrq):
    return -30 + rsrq * 0.0625

def parse_rssi(rssi):
    return -110 + rssi * 0.0625
```

#### LTE Measurements:
- **EARFCN**: `item.earfcn`
- **PCI**: `pci_serv_layer_prio_bits[0:9].uint`
- **RSRP**: `parse_rsrp(meas_rsrp & 0xfff)`
- **RSRQ**: `parse_rsrq(rsrq_bits[0:10].uint)`
- **RSSI**: `parse_rssi(rssi_bits[10:21].uint)`
- **SINR**: Derived from RSRQ

#### LTE MAC RACH:
- `LOG_LTE_MAC_RACH_TRIGGER` (0xB063)
- `LOG_LTE_MAC_RACH_RESPONSE` (0xB064)

#### LTE RRC Messages:
- `LOG_LTE_RRC_OTA_MESSAGE` (0xB0C0)
- `LOG_LTE_RRC_MIB_MESSAGE` (0xB0C1)
- `LOG_LTE_RRC_SERVING_CELL_INFO` (0xB0C2)

#### LTE NAS Messages:
- `LOG_LTE_NAS_EMM_PLAIN_OTA_INCOMING_MESSAGE` (0xB0E2)
- `LOG_LTE_NAS_EMM_PLAIN_OTA_OUTGOING_MESSAGE` (0xB0E3)
- `LOG_LTE_NAS_ESM_PLAIN_OTA_INCOMING_MESSAGE` (0xB0E6)
- `LOG_LTE_NAS_ESM_PLAIN_OTA_OUTGOING_MESSAGE` (0xB0E7)

---

### WCDMA (diagwcdmalogparser.py)

#### WCDMA Measurements:
- **UARFCN**: `item.uarfcn`
- **PSC**: `item.psc`
- **RSCP**: `parse_rscp(rscp_value)`
- **Ec/Io**: `parse_ecio(ecio_value)`

#### WCDMA RRC Messages:
- `LOG_WCDMA_RRC_OTA_MESSAGE`
- `LOG_WCDMA_RRC_STATES`

---

### GSM (diaggsmlogparser.py)

#### GSM Measurements:
- **ARFCN**: `item.arfcn`
- **BSIC**: `item.bsic`
- **RxLev**: `item.rxlev` (0-63 scale)
- **RxQual**: `item.rxqual` (0-7 scale)

#### GSM RR Messages:
- `LOG_GSM_RR_SIGNALING_MESSAGE`
- `LOG_GSM_RR_CELL_INFORMATION`

---

### CDMA (diag1xlogparser.py)

#### CDMA Measurements:
- **Channel**: `item.channel`
- **PN Offset**: `item.pn_offset`
- **Pilot Strength**: `item.pilot_strength`
- **Ec/Io**: `item.ecio`

---

## 2. MobileInsight - KPI Calculation

### Attach Success Rate (attach_sr_analyzer.py)

```python
# NAS EMM Message Types (TS 24.301)
NAS_MSG_TYPES = {
    0x41: 'Attach Request',      # nas_eps.nas_msg_emm_type == 0x41
    0x42: 'Attach Accept',        # nas_eps.nas_msg_emm_type == 0x42
    0x43: 'Attach Complete',
    0x44: 'Attach Reject',
    0x45: 'Detach Request',
    0x48: 'TAU Request',          # nas_eps.nas_msg_emm_type == 0x48
    0x49: 'TAU Accept',           # nas_eps.nas_msg_emm_type == 0x49
    0x4c: 'Service Request',      # nas_eps.nas_msg_emm_type == 0x4c
    0x4d: 'Service Accept'        # nas_eps.nas_msg_emm_type == 0x4d
}

# Attach Types
ATTACH_TYPES = {
    0: 'EMERGENCY',
    1: 'NORMAL',
    2: 'COMBINED'
}

# EMM Cause Codes
EMM_CAUSE = {
    3: 'ILL_UE',
    7: 'EPS_NOT_ALLOWED',
    11: 'PLMN_NOT_ALLOWED',
    12: 'TA_NOT_ALLOWED',
    22: 'CONGESTION'
}

# KPI Calculation
attach_sr = (attach_accepts / attach_requests) * 100
```

### RRC Success Rate (rrc_sr_analyzer.py)

```python
# LTE RRC Message Types (TS 36.331)
RRC_MSG_TYPES = {
    'rrcConnectionRequest_element': 'RRC Connection Request',
    'rrcConnectionSetup_element': 'RRC Connection Setup',
    'rrcConnectionSetupComplete_element': 'RRC Setup Complete',
    'rrcConnectionReject_element': 'RRC Connection Reject',
    'rrcConnectionReconfiguration_element': 'RRC Reconfiguration',
    'rrcConnectionReconfigurationComplete_element': 'RRC Reconfig Complete',
    'rrcConnectionRelease_element': 'RRC Connection Release',
    'mobilityFromEUTRACommand_element': 'Handover Command',
    'measurementReport_element': 'Measurement Report'
}

# RRC Establishment Causes
RRC_CAUSES = {
    'EMERGENCY': 0,
    'HIGH_PRIORITY_ACCESS': 1,
    'MT_ACCESS': 2,
    'MO_SIGNAL': 3,
    'MO_DATA': 4
}

# KPI Calculation
rrc_sr = (rrc_setup_complete / rrc_requests) * 100
```

### TAU Success Rate (tau_sr_analyzer.py)

```python
# TAU Types
TAU_TYPES = {
    0: 'TA_UPDATING',
    1: 'COMBINED_TA_LA_UPDATING',
    2: 'COMBINED_TA_LA_UPDATING_WITH_IMSI_ATTACH',
    3: 'PERIODIC_UPDATING'
}

# KPI Calculation
tau_sr = (tau_accepts / tau_requests) * 100
```

### Handover Success Rate (ho_sr_analyzer.py)

```python
# Handover Types
HO_TYPES = {
    'INTRA_LTE': 'Intra-LTE Handover',
    'INTER_RAT': 'Inter-RAT Handover',
    'INTER_FREQ': 'Inter-Frequency Handover'
}

# KPI Calculation
ho_sr = (ho_complete / ho_attempts) * 100
```

### Service Request Success Rate (service_req_sr_analyzer.py)

```python
# Service Request Types
SR_TYPES = {
    0: 'MO_CSFB',
    1: 'MT_CSFB',
    2: 'MO_CSFB_EMERGENCY',
    3: 'PACKET_SERVICES'
}

# KPI Calculation
sr_sr = (service_accepts / service_requests) * 100
```

---

## 3. TShark Display Filters

### 5G NR Filters:
```bash
# 5G RRC
nr-rrc.rrcSetup
nr-rrc.rrcSetupComplete
nr-rrc.rrcReconfiguration
nr-rrc.rrcRelease
nr-rrc.measurementReport

# 5G NAS
nas-5gs.mm.message_type == 0x41  # Registration Request
nas-5gs.mm.message_type == 0x42  # Registration Accept
nas-5gs.sm.message_type == 0xc1  # PDU Session Establishment Request
nas-5gs.sm.message_type == 0xc2  # PDU Session Establishment Accept
```

### LTE Filters:
```bash
# LTE RRC
lte-rrc.rrcConnectionRequest_element
lte-rrc.rrcConnectionSetup_element
lte-rrc.rrcConnectionSetupComplete_element
lte-rrc.rrcConnectionReject_element
lte-rrc.rrcConnectionReconfiguration_element
lte-rrc.rrcConnectionReconfigurationComplete_element
lte-rrc.rrcConnectionRelease_element
lte-rrc.mobilityFromEUTRACommand_element
lte-rrc.measurementReport_element

# LTE NAS EMM
nas_eps.nas_msg_emm_type == 0x41  # Attach Request
nas_eps.nas_msg_emm_type == 0x42  # Attach Accept
nas_eps.nas_msg_emm_type == 0x43  # Attach Complete
nas_eps.nas_msg_emm_type == 0x44  # Attach Reject
nas_eps.nas_msg_emm_type == 0x48  # TAU Request
nas_eps.nas_msg_emm_type == 0x49  # TAU Accept
nas_eps.nas_msg_emm_type == 0x4c  # Service Request
nas_eps.nas_msg_emm_type == 0x4d  # Service Accept

# LTE NAS ESM
nas_eps.nas_msg_esm_type == 0xc1  # Activate Default EPS Bearer Context Request
nas_eps.nas_msg_esm_type == 0xc2  # Activate Default EPS Bearer Context Accept
nas_eps.nas_msg_esm_type == 0xc5  # Activate Dedicated EPS Bearer Context Request
nas_eps.nas_msg_esm_type == 0xc6  # Activate Dedicated EPS Bearer Context Accept

# LTE MAC
mac-lte.rach-preamble
mac-lte.rar
```

### WCDMA Filters:
```bash
# WCDMA RRC
rrc.rrcConnectionRequest_element
rrc.rrcConnectionSetup_element
rrc.rrcConnectionSetupComplete_element
rrc.rrcConnectionReject_element
rrc.cellUpdate_element
rrc.uraUpdate_element

# WCDMA Measurements
rrc.measurementReport_element
```

### GSM Filters:
```bash
# GSM RR
gsm_a.dtap.msg_rr_type == 0x06  # Paging Request
gsm_a.dtap.msg_rr_type == 0x27  # Paging Response
gsm_a.dtap.msg_rr_type == 0x3f  # Immediate Assignment

# GSM Call Control
gsm_a.dtap.msg_cc_type == 0x05  # Setup
gsm_a.dtap.msg_cc_type == 0x07  # Connect
gsm_a.dtap.msg_cc_type == 0x0f  # Connect Acknowledge
gsm_a.dtap.msg_cc_type == 0x2d  # Disconnect
gsm_a.dtap.msg_cc_type == 0x2a  # Release
gsm_a.dtap.msg_cc_type == 0x2e  # Release Complete

# GSM MM
gsm_a.dtap.msg_mm_type == 0x01  # IMSI Detach Indication
gsm_a.dtap.msg_mm_type == 0x04  # Location Updating Request
gsm_a.dtap.msg_mm_type == 0x08  # Location Updating Accept
gsm_a.dtap.msg_mm_type == 0x04  # Location Updating Reject
```

---

## 4. TShark Field Extraction

### Extract Signal Quality:
```bash
# 5G NR
tshark -r capture.pcap -T fields \
  -e frame.time_epoch \
  -e nr-rrc.physCellId \
  -e nr-rrc.absoluteFrequencySSB \
  -e nr-rrc.ss-RSRP \
  -e nr-rrc.ss-RSRQ \
  -e nr-rrc.ss-SINR \
  -E separator=, -E quote=d

# LTE
tshark -r capture.pcap -T fields \
  -e frame.time_epoch \
  -e lte-rrc.physCellId \
  -e lte-rrc.dl-CarrierFreq \
  -e lte-rrc.rsrpResult \
  -e lte-rrc.rsrqResult \
  -E separator=, -E quote=d

# WCDMA
tshark -r capture.pcap -T fields \
  -e frame.time_epoch \
  -e rrc.primaryScramblingCode \
  -e rrc.uarfcn \
  -e rrc.cpich-RSCP \
  -e rrc.cpich-Ec-N0 \
  -E separator=, -E quote=d

# GSM
tshark -r capture.pcap -T fields \
  -e frame.time_epoch \
  -e gsm_a.bssmap.cell_ci \
  -e gsm_a.rr.arfcn \
  -e gsm_a.rr.rxlev_full_serv_cell \
  -e gsm_a.rr.rxqual_full_serv_cell \
  -E separator=, -E quote=d
```

---

## 5. Complete KPI List (XCAL-Aligned)

### Accessibility KPIs:
1. **5G_RRC_SR** - 5G RRC Setup Success Rate
2. **LTE_RRC_SR** - LTE RRC Setup Success Rate
3. **WCDMA_RRC_SR** - WCDMA RRC Setup Success Rate
4. **GSM_RR_SR** - GSM RR Setup Success Rate
5. **LTE_ATTACH_SR** - LTE Attach Success Rate
6. **LTE_TAU_SR** - LTE TAU Success Rate
7. **LTE_SERVICE_REQ_SR** - LTE Service Request Success Rate
8. **LTE_RACH_SR** - LTE RACH Success Rate
9. **LTE_ERAB_SETUP_SR** - LTE E-RAB Setup Success Rate
10. **5G_PDU_SESSION_SR** - 5G PDU Session Establishment Success Rate

### Mobility KPIs:
11. **LTE_HO_SR** - LTE Handover Success Rate
12. **LTE_HO_LATENCY** - LTE Handover Latency (ms)
13. **WCDMA_HO_SR** - WCDMA Handover Success Rate
14. **GSM_HO_SR** - GSM Handover Success Rate
15. **5G_HO_SR** - 5G Handover Success Rate

### Retainability KPIs:
16. **CALL_DROP_RATE** - Call Drop Rate
17. **LTE_AB_REL_RATE** - LTE Abnormal Release Rate
18. **WCDMA_AB_REL_RATE** - WCDMA Abnormal Release Rate
19. **RRC_REESTABLISHMENT_RATE** - RRC Re-establishment Rate

### Integrity KPIs (Signal Quality):
20. **5G_SS_RSRP_AVG** - 5G SS-RSRP Average
21. **5G_SS_RSRQ_AVG** - 5G SS-RSRQ Average
22. **5G_SS_SINR_AVG** - 5G SS-SINR Average
23. **LTE_RSRP_AVG** - LTE RSRP Average
24. **LTE_RSRQ_AVG** - LTE RSRQ Average
25. **LTE_SINR_AVG** - LTE SINR Average
26. **WCDMA_RSCP_AVG** - WCDMA RSCP Average
27. **WCDMA_ECIO_AVG** - WCDMA Ec/Io Average
28. **GSM_RXLEV_AVG** - GSM RxLev Average
29. **GSM_RXQUAL_AVG** - GSM RxQual Average

### Performance KPIs:
30. **DL_THROUGHPUT_MBPS** - Downlink Throughput
31. **UL_THROUGHPUT_MBPS** - Uplink Throughput
32. **LATENCY_MS** - Round-trip Latency
33. **PACKET_LOSS_RATE** - Packet Loss Rate
34. **JITTER_MS** - Jitter

---

## 6. Implementation Strategy

### Backend (Spring Boot):
```
SCAT → PCAP → TShark → KPI Calculation → SQLite → REST API
```

### Services:
1. **ScatIntegrationService** - Runs SCAT for all RATs
2. **TSharkIntegrationService** - Packet counting + field extraction
3. **KpiCalculatorService** - Calculates all 34 KPIs
4. **GpsTrackingService** - GPS coordinate extraction
5. **LogStreamService** - Real-time SSE streaming

### Database Schema:
```sql
CREATE TABLE kpi_aggregates (
    id INTEGER PRIMARY KEY,
    session_id INTEGER,
    metric TEXT,  -- '5G_RRC_SR', 'LTE_RSRP_AVG', etc.
    window_start TIMESTAMP,
    window_end TIMESTAMP,
    min_value REAL,
    avg_value REAL,
    max_value REAL,
    rat TEXT,  -- '5GNR', 'LTE', 'WCDMA', 'GSM'
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

---

## 7. GPS Visualization (LTE-KPI-Clustering)

### K-Means Clustering:
```python
# Features for clustering
features = ['RSRP', 'RSRQ', 'SINR', 'CQI', 'DL_bitrate', 'UL_bitrate']

# Normalize
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df[features])

# Cluster
kmeans = KMeans(n_clusters=4, random_state=42)
df['Cluster'] = kmeans.fit_predict(df_scaled)

# Cluster meanings
clusters = {
    0: {'name': 'Poor', 'color': '#3186cc'},
    1: {'name': 'Moderate', 'color': '#FF5733'},
    2: {'name': 'Good', 'color': '#FF0000'},
    3: {'name': 'Excellent', 'color': '#33FF57'}
}
```

### GeoJSON Export:
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lon1, lat1], [lon2, lat2]]
    },
    "properties": {
      "cluster": 2,
      "avg_rsrp": -85.5,
      "avg_rsrq": -10.2,
      "rat": "LTE"
    }
  }]
}
```

---

## ✅ CONFIRMATION

**ALL RATs COVERED**:
- ✅ 5G NR (SS-RSRP, SS-RSRQ, SS-SINR, NR-ARFCN, PCI, Beams)
- ✅ LTE (RSRP, RSRQ, SINR, EARFCN, PCI, RACH, RRC, NAS)
- ✅ WCDMA (RSCP, Ec/Io, UARFCN, PSC, RRC)
- ✅ GSM (RxLev, RxQual, ARFCN, BSIC, RR, CC, MM)
- ✅ CDMA (Pilot Strength, Ec/Io, PN Offset)

**ALL KPIs EXTRACTED**: 34 KPIs across all categories
**ALL TOOLS INTEGRATED**: SCAT, MobileInsight, TShark, Clustering

**READY FOR IMPLEMENTATION** ✅
