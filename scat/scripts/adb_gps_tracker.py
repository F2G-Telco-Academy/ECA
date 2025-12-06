import subprocess
import re
import time
import folium
import os
from datetime import datetime
class CampusLocationTracker:
def __init__(self):
self.locations = []
self.map = None
self.campus_center = [3.827569, 11.521969]
self.update_count = 0
self.start_time = None
def get_gps_location(self):
"""Fetch GPS location using adb."""
try:
output = subprocess.check_output(["adb", "shell",
"dumpsys", "location"], text=True, timeout=5)
match = re.search(r'Location\[gps ([\d.-]+),([\d.-]+)',
output)
if match:
lat, lon = float(match.group(1)), float(match.group(2))
return lat, lon
except Exception as e:
❌ GPS Error: {e}")
print(f"
return None, None
def get_clean_cell_info(self):
"""Fetch cellular information from telephony registry."""
cell_info = {
'rsrp': 'N/A',
'pci': 'N/A',
'frequency': 'N/A',
'mcc': 'N/A',
'mnc': 'N/A',
'lac': 'N/A',
'cid': 'N/A',
'psc': 'N/A',
'uarfcn': 'N/A',
'rat': 'N/A'
}try:
# Get telephony information
telephony_cmd = "adb shell dumpsys telephony.registry"
telephony_output = subprocess.check_output(telephony_cmd,
shell=True, text=True, timeout=10)
# Extract information using patterns from your
telephony_registry.txt
# MCC and MNC - multiple patterns to try
mcc_mnc_match = re.search(r'mMcc=(\d+)\s+mMnc=(\d+)',
telephony_output)
if not mcc_mnc_match:
mcc_mnc_match =
re.search(r'mOperatorNumeric=(\d{5,6})', telephony_output)
if mcc_mnc_match:
numeric = mcc_mnc_match.group(1)
if len(numeric) >= 5:
cell_info['mcc'] = numeric[:3]
cell_info['mnc'] = numeric[3:]
else:
cell_info['mcc'] = mcc_mnc_match.group(1)
cell_info['mnc'] = mcc_mnc_match.group(2)
# LAC (Location Area Code)
lac_match = re.search(r'mLac=(\*?\d+)', telephony_output)
if lac_match:
cell_info['lac'] = lac_match.group(1)
# CID (Cell ID)
cid_match = re.search(r'mCid=(\d+\*+)', telephony_output)
if cid_match:
cell_info['cid'] = cid_match.group(1)
# PSC (Primary Scrambling Code) - for WCDMA/UMTS
psc_match = re.search(r'mPsc=(\d+)', telephony_output)
if psc_match:
cell_info['psc'] = psc_match.group(1)
cell_info['pci'] = psc_match.group(1)
for WCDMA
# UARFCN (Frequency)
# Use PSC as PCIuarfcn_match = re.search(r'mUarfcn=(\d+)',
telephony_output)
if uarfcn_match:
cell_info['uarfcn'] = uarfcn_match.group(1)
cell_info['frequency'] = f"UARFCN
{uarfcn_match.group(1)}"
# RAT (Radio Access Technology)
if 'UMTS' in telephony_output or 'WCDMA' in
telephony_output:
cell_info['rat'] = 'UMTS/WCDMA'
elif 'HSPA' in telephony_output:
cell_info['rat'] = 'HSPA'
elif 'HSPA+' in telephony_output:
cell_info['rat'] = 'HSPA+'
elif 'LTE' in telephony_output:
cell_info['rat'] = 'LTE'
# RSRP extraction - multiple patterns
# Try WCDMA signal strength first (from your file)
wcdma_rsrp_match = re.search(r'rscp=(-?\d+)',
telephony_output)
if wcdma_rsrp_match:
cell_info['rsrp'] = f"{wcdma_rsrp_match.group(1)} dBm"
else:
# Try LTE RSRP
lte_rsrp_match = re.search(r'lteRsrp(?:=|:)\s*(-?\d+)',
telephony_output)
if lte_rsrp_match:
cell_info['rsrp'] = f"{lte_rsrp_match.group(1)}
dBm"
# If we have UARFCN, convert to approximate frequency
if cell_info['uarfcn'] != 'N/A':
uarfcn = int(cell_info['uarfcn'])
if 10562 <= uarfcn <= 10838:
# UMTS Band 1
cell_info['frequency'] = f"~{2100} MHz (Band 1)"
elif 9662 <= uarfcn <= 9938:
# UMTS Band 8
cell_info['frequency'] = f"~{900} MHz (Band 8)"
# Add more bands as needed
except Exception as e:
⚠️ Cell info error: {e}")
print(f"return cell_info
def create_clean_map(self):
"""Create map with clean, filtered information only."""
if not self.locations:
return
# Calculate map bounds
all_lats = [lat for lat, lon, _, _ in self.locations]
all_lons = [lon for lat, lon, _, _ in self.locations]
if len(self.locations) > 1:
sw = [min(all_lats), min(all_lons)]
ne = [max(all_lats), max(all_lons)]
self.map = folium.Map(location=self.campus_center,
zoom_start=16)
self.map.fit_bounds([sw, ne])
else:
self.map = folium.Map(location=[self.locations[-1][0],
self.locations[-1][1]], zoom_start=18)
# Add all points with clean information
for i, (lat, lon, timestamp, cell_info) in
enumerate(self.locations):
# Color based on signal strength
color = 'blue'
if cell_info['rsrp'] != 'N/A':
try:
rsrp_value = int(cell_info['rsrp'].split()[0])
if rsrp_value >= -85:
color = 'green'
elif rsrp_value >= -95:
color = 'blue'
elif rsrp_value >= -105:
color = 'orange'
else:
color = 'red'
except:
pass
# Simple clean popup
popup_content = f"""<div style='min-width: 280px; font-family: Arial,
sans-serif;'>
<b>
📍 Point {i+1}</b><br>
<b>Time:</b> {timestamp}<br>
<b>Latitude:</b> {lat:.6f}<br>
<b>Longitude:</b> {lon:.6f}<br>
<hr>
<b>Operator:</b> MTN Cameroon<br>
<b>MCC:</b> {cell_info['mcc']}<br>
<b>MNC:</b> {cell_info['mnc']}<br>
<b>LAC:</b> {cell_info['lac']}<br>
<b>Cell ID:</b> {cell_info['cid']}<br>
<b>PSC/PCI:</b> {cell_info['pci']}<br>
<b>Frequency:</b> {cell_info['frequency']}<br>
<b>RAT:</b> {cell_info['rat']}<br>
<b>RSRP:</b> {cell_info['rsrp']}<br>
<b>Order:</b> {i+1}/{len(self.locations)}
</div>
"""
folium.Marker(
location=[lat, lon],
popup=popup_content,
tooltip=f"Point {i+1} - {timestamp}",
icon=folium.Icon(color=color, icon='info-sign')
).add_to(self.map)
def save_map(self):
"""Save the map to HTML file."""
if self.map:
self.map.save("campus_tracking.html")
def display_clean_status(self, lat, lon, timestamp, cell_info):
"""Display only clean essential information."""
self.update_count += 1
os.system('cls' if os.name == 'nt' else 'clear')
print("=" * 70)
🎯 CAMPUS CELLULAR TRACKER")
print("=" * 70)
print(f"📍 POSITION #{len(self.locations)}")
print("
print(f"Time:{timestamp}")
print(f"Latitude:{lat:.6f}")print(f"Longitude: {lon:.6f}")
📶 CELL INFO")
print(f"
print(f"Operator:MTN Cameroon")
print(f"MCC:{cell_info['mcc']}")
print(f"MNC:{cell_info['mnc']}")
print(f"LAC:{cell_info['lac']}")
print(f"Cell ID:{cell_info['cid']}")
print(f"PSC/PCI:{cell_info['pci']}")
print(f"Frequency: {cell_info['frequency']}")
print(f"RAT:{cell_info['rat']}")
print(f"RSRP:{cell_info['rsrp']}")
📊 STATS: Points {len(self.locations)} | Updates
{self.update_count}")
print("⏹️ Ctrl+C to stop")
print(f"
print("=" * 70)
def run_clean_tracking(self, interval=10):
"""Main tracking loop with clean output only."""
🚀 CAMPUS CELLULAR TRACKING STARTED")
print("📍 Tracking: GPS + Cellular Data (MCC, MNC, LAC, Cell
ID, PSC, Frequency, RSRP)")
print("⏰ Interval: 10 seconds")
print("💾 Map: campus_tracking.html\n")
print("
self.start_time = datetime.now()
time.sleep(2)
try:
while True:
start_time = time.time()
lat, lon = self.get_gps_location()
if lat and lon:
timestamp = datetime.now().strftime("%H:%M:%S")
cell_info = self.get_clean_cell_info()
self.locations.append((lat, lon, timestamp,
cell_info))
# Display clean status
self.display_clean_status(lat, lon, timestamp,
cell_info)# Update clean map
self.create_clean_map()
self.save_map()
🗺️ Cellular map updated!")
print("
else:
os.system('cls' if os.name == 'nt' else 'clear')
❌ No GPS signal")
print(f"🔍 Retrying in {interval} seconds...")
print("
# Wait for interval
elapsed = time.time() - start_time
if elapsed < interval:
wait_time = interval - elapsed
⏰ Next update in {wait_time:.1f}
print(f"
seconds...")
time.sleep(wait_time)
except KeyboardInterrupt:
✅ Tracking stopped!")
print(f"📊 Total cellular points: {len(self.locations)}")
print(f"\n
if self.locations:
self.create_clean_map()
self.save_map()
🌐 Open 'campus_tracking.html' for cellular
print("
coverage map!")
# Start the clean tracker
if __name__ == "__main__":
tracker = CampusLocationTracker()
tracker.run_clean_tracking(interval=10)
