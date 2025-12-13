#!/bin/bash
# Batch processing script for offline traces

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCAT_DIR="$(dirname "$SCRIPT_DIR")"
INPUT_DIR="${SCAT_DIR}/captures"
OUTPUT_DIR="${SCAT_DIR}/post_processed"

echo "🔄 Extended Cellular Analyzer - Batch Processing"
echo "================================================"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to process a single file
process_file() {
    local file="$1"
    local filename=$(basename "$file")
    local name_without_ext="${filename%.*}"
    
    echo "📁 Processing: $filename"
    
    # Run the post-processing script
    python3 "$SCRIPT_DIR/process_offline_traces.py" \
        "$file" \
        --output-dir "$OUTPUT_DIR" \
        --output-name "$name_without_ext"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully processed: $filename"
    else
        echo "❌ Failed to process: $filename"
    fi
    echo ""
}

# Check if specific file provided
if [ $# -eq 1 ]; then
    if [ -f "$1" ]; then
        process_file "$1"
    else
        echo "❌ File not found: $1"
        exit 1
    fi
else
    # Process all supported files in captures directory
    echo "📂 Scanning for trace files in: $INPUT_DIR"
    
    file_count=0
    for ext in qmdl qmdl2 sdm loge pcap pcapng; do
        for file in "$INPUT_DIR"/*.$ext; do
            if [ -f "$file" ]; then
                process_file "$file"
                ((file_count++))
            fi
        done
    done
    
    if [ $file_count -eq 0 ]; then
        echo "ℹ️  No trace files found in $INPUT_DIR"
        echo "   Supported formats: .qmdl, .qmdl2, .sdm, .loge, .pcap, .pcapng"
    else
        echo "🎉 Processed $file_count files"
    fi
fi

echo "📊 Results saved to: $OUTPUT_DIR"
echo "🔗 View in Grafana: http://localhost:3000"
