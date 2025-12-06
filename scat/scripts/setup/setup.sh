#!/bin/bash
# Extended Cellular Analyzer - Setup Script
# This script sets up the environment for cellular signaling capture

echo "=== Extended Cellular Analyzer Setup ==="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   - Windows/macOS: Download Docker Desktop"
    echo "   - Linux: sudo apt install docker.io docker-compose"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is installed"

# Build the Docker image
echo "🔨 Building Extended Cellular Analyzer Docker image..."
docker-compose build

if [ $? -eq 0 ]; then
    echo "✅ Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Connect your device and enable diagnostic mode"
    echo "2. Run: ./capture.sh"
    echo ""
else
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi