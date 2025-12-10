# Bundled Tools Directory

This directory contains all external dependencies bundled with ECA for zero-configuration deployment.

## Structure

```
tools/
├── python/          # Python 3.11 embedded runtime
│   ├── python.exe
│   └── ...
├── tshark/          # TShark/Wireshark portable
│   ├── tshark.exe
│   └── ...
└── adb/             # Android Debug Bridge
    └── platform-tools/
        ├── adb.exe
        └── ...
```

## Setup

Run `setup-bundled-tools.bat` from project root to download and bundle all dependencies.

## Usage

ECA automatically detects and uses bundled tools. Priority order:
1. Bundled tools (this directory)
2. System installation
3. PATH environment variable

## Distribution

When distributing ECA, include this entire `tools/` directory to ensure users have zero-configuration experience.
