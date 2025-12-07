# Extended Cellular Analyzer - Frontend

Next.js + Tauri frontend for the Extended Cellular Analyzer.

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Tauri desktop app
npm run tauri:dev

# Build for production
npm run build
npm run tauri:build
```

## Configuration

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## Main Components

- `ModularDashboard` - 4-panel customizable layout
- `XCALRFSummary` - RF measurements display
- `XCALSignalingViewer` - Protocol message viewer
- `EnhancedTerminal` - Real-time log streaming
- `MapView` - GPS-tracked network quality

See main [README](../README.md) for full documentation.
