package com.nathan.p2.config;

import com.nathan.p2.service.AdbAutoInstallerService;
import com.nathan.p2.service.TSharkAutoInstallerService;
import com.nathan.p2.service.PythonAutoInstallerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApplicationStartupListener {

    private final AdbAutoInstallerService adbInstaller;
    private final TSharkAutoInstallerService tsharkInstaller;
    private final PythonAutoInstallerService pythonInstaller;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("=".repeat(60));
        log.info("ECA Application Started - Performing automatic setup...");
        log.info("=".repeat(60));
        
        // Check and install all dependencies
        pythonInstaller.checkAndInstallPython()
            .doOnSuccess(status -> logStatus("Python", status.isInstalled(), status.isInPath(), status.getVersion(), status.getPath(), status.isAutoInstalled()))
            .doOnError(error -> log.error("Python setup failed: {}", error.getMessage()))
            .then(tsharkInstaller.checkAndInstallTShark())
            .doOnSuccess(status -> logStatus("TShark", status.isInstalled(), status.isInPath(), status.getVersion(), status.getPath(), status.isAutoInstalled()))
            .doOnError(error -> log.error("TShark setup failed: {}", error.getMessage()))
            .then(adbInstaller.checkAndInstallAdb())
            .doOnSuccess(status -> {
                logStatus("ADB", status.isInstalled(), status.isInPath(), status.getVersion(), status.getPath(), status.isAutoInstalled());
                log.info("");
                log.info("✅ ECA is ready for device connections!");
                log.info("=".repeat(60));
            })
            .doOnError(error -> {
                log.error("");
                log.error("❌ Setup failed: {}", error.getMessage());
                log.error("Some features may not work properly.");
                log.error("=".repeat(60));
            })
            .subscribe();
    }
    
    private void logStatus(String tool, boolean installed, boolean inPath, String version, String path, boolean autoInstalled) {
        log.info("");
        log.info("{} Setup:", tool);
        log.info("  - Installed: {}", installed ? "✅" : "❌");
        log.info("  - In PATH: {}", inPath ? "✅" : "❌");
        log.info("  - Version: {}", version);
        log.info("  - Path: {}", path);
        if (autoInstalled) {
            log.info("  - 🔧 Auto-installed by ECA");
        }
    }
}
