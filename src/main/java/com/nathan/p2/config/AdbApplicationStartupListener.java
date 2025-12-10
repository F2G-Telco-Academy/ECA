package com.nathan.p2.config;

import com.nathan.p2.service.AdbAutoInstallerService;
import com.nathan.p2.service.AdbDeviceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;

/**
 * ADB Application Startup Listener
 * Automatically initializes ADB server and device detection on application startup
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdbApplicationStartupListener {

    private final AdbAutoInstallerService adbInstaller;
    private final AdbDeviceService adbDeviceService;

    @Value("${eca.automation.enabled:true}")
    private boolean automationEnabled;

    @Value("${eca.automation.auto-start-adb-server:true}")
    private boolean autoStartAdbServer;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!automationEnabled) {
            log.info("Automation disabled - skipping ADB auto-initialization");
            return;
        }

        log.info("========================================");
        log.info("ECA Automation System Initializing...");
        log.info("========================================");

        // Step 1: Ensure ADB is installed
        initializeAdb();

        // Step 2: Start ADB server
        if (autoStartAdbServer) {
            startAdbServer();
        }

        // Step 3: Initial device detection
        detectInitialDevices();

        log.info("========================================");
        log.info("ECA Ready - Waiting for device connection...");
        log.info("========================================");
    }

    private void initializeAdb() {
        log.info("→ Checking ADB installation...");
        adbInstaller.checkAndInstallAdb()
                .doOnSuccess(status -> {
                    if (status.isInstalled()) {
                        log.info("✅ ADB installed: {} (version: {})",
                                status.getPath(), status.getVersion());
                        if (status.isAutoInstalled()) {
                            log.info("   (Installed automatically)");
                        }
                    } else {
                        log.error("❌ ADB not available: {}", status.getMessage());
                    }
                })
                .doOnError(error -> {
                    log.error("❌ Failed to initialize ADB: {}", error.getMessage());
                })
                .block(); // Block on startup to ensure ADB is ready
    }

    private void startAdbServer() {
        log.info("→ Starting ADB server...");
        try {
            String adbPath = adbInstaller.getAdbExecutablePath();

            ProcessBuilder pb = new ProcessBuilder(adbPath, "start-server");
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Read output
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.debug("  ADB: {}", line);
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("✅ ADB server started successfully");
            } else {
                log.warn("⚠️ ADB server may already be running (exit code: {})", exitCode);
            }

        } catch (Exception e) {
            log.error("❌ Failed to start ADB server: {}", e.getMessage());
            log.info("   Device detection may still work if ADB server is already running");
        }
    }

    private void detectInitialDevices() {
        log.info("→ Detecting connected devices...");
        try {
            var devices = adbDeviceService.getConnectedDevices();
            if (devices.isEmpty()) {
                log.info("⏳ No devices connected yet");
                log.info("   Connect your Android device via USB to start");
            } else {
                log.info("✅ Found {} device(s):", devices.size());
                devices.forEach(deviceId ->
                    log.info("   • {}", deviceId)
                );
                log.info("   Device(s) will be auto-selected when you open the app");
            }
        } catch (Exception e) {
            log.error("❌ Failed to detect devices: {}", e.getMessage());
        }
    }
}

