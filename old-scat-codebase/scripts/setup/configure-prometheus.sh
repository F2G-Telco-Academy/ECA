#!/bin/bash
# Cross-platform Prometheus configuration script
# Detects OS and sets correct host address for Docker containers to reach host services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMETHEUS_CONFIG="$PROJECT_ROOT/config/prometheus.yml"

# Detect OS and set host address
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux: Use Docker bridge gateway
    HOST_ADDR="172.17.0.1"
    echo "✓ Detected Linux - Using Docker bridge IP: $HOST_ADDR"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: Use host.docker.internal
    HOST_ADDR="host.docker.internal"
    echo "✓ Detected macOS - Using: $HOST_ADDR"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows: Use host.docker.internal
    HOST_ADDR="host.docker.internal"
    echo "✓ Detected Windows - Using: $HOST_ADDR"
else
    # Unknown OS: Try host.docker.internal first, fallback to bridge
    HOST_ADDR="host.docker.internal"
    echo "⚠ Unknown OS ($OSTYPE) - Trying: $HOST_ADDR"
fi

# Generate Prometheus config
cat > "$PROMETHEUS_CONFIG" <<EOF
global:
  evaluation_interval: 2s
  scrape_interval: 2s

scrape_configs:
- job_name: adb-exporter
  metrics_path: /metrics
  scrape_interval: 2s
  scrape_timeout: 1s
  static_configs:
  - labels:
      service: device-metrics
    targets:
    - ${HOST_ADDR}:9091

- job_name: scat-telecom
  metrics_path: /metrics
  scrape_interval: 2s
  scrape_timeout: 1s
  static_configs:
  - labels:
      service: scat-telecom-parsing
    targets:
    - ${HOST_ADDR}:9096

- job_name: kpi-parser
  scrape_interval: 5s
  static_configs:
  - targets:
    - ${HOST_ADDR}:9092
EOF

echo "✓ Prometheus config generated at: $PROMETHEUS_CONFIG"
echo "  Host address: $HOST_ADDR"
